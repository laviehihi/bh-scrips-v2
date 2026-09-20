// ui/setup.js
// Setup mode — setup từng nút một

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const STABLE_CHECK_INTERVAL = 200;
    const STABLE_SAMPLE_COUNT = 5;
    const STABLE_REQUIRED = 3;
    const STABLE_TIMEOUT = 5000;

    // =========================================================
    // STATE
    // =========================================================

    BH.setupMode = false;
    BH.setupCollapsed = false;
    BH.setupCurrentIndex = 0;
    BH.setupMarker = null;
    BH.setupTemplate = null;
    BH.stableTimerId = null;

    // =========================================================
    // ENTER / EXIT
    // =========================================================

    BH.enterSetupMode = function () {
        if (BH.setupMode) return;

        if (BH.activeAuto) {
            BH.setMsg('⚠ Tắt bot trước khi setup');
            return;
        }

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);
        if (!template) {
            BH.setMsg('Không có template để setup');
            return;
        }

        if (!template.steps || template.steps.length === 0) {
            BH.setMsg('Template không có nút nào');
            return;
        }

        BH.setupMode = true;
        BH.setupCollapsed = false;
        BH.isSetupLock = true;
        BH.setupTemplate = template;

        BH.loadCalibration(templateId);

        BH.setupCurrentIndex = 0;
        for (let i = 0; i < template.steps.length; i++) {
            if (!template.steps[i].calibrated) {
                BH.setupCurrentIndex = i;
                break;
            }
        }

        showCurrentMarker();

        BH.setMsg('Setup: kéo marker vào ' + template.steps[BH.setupCurrentIndex].label);

        if (BH.render) BH.render();
    };

    BH.exitSetupMode = function () {
        if (!BH.setupMode) return;

        BH.setupMode = false;
        BH.setupCollapsed = false;
        BH.isSetupLock = false;

        if (BH.setupMarker) {
            BH.removeMarker(BH.setupMarker);
            BH.setupMarker = null;
        }

        if (BH.stableTimerId !== null) {
            BH.rt.clearTimeout(BH.stableTimerId);
            BH.stableTimerId = null;
        }

        BH.hideMagnifier();

        BH.setupTemplate = null;

        BH.setMsg('Thoát setup mode');

        if (BH.render) BH.render();
    };

    BH.toggleSetupMode = function () {
        if (BH.setupMode) {
            BH.exitSetupMode();
        } else {
            BH.enterSetupMode();
        }
    };

    // =========================================================
    // NAVIGATE STEPS
    // =========================================================

    BH.setupPrevStep = function () {
        if (!BH.setupTemplate) return;
        if (BH.setupCurrentIndex <= 0) return;

        BH.setupCurrentIndex--;
        showCurrentMarker();
        BH.setMsg('Nút ' + (BH.setupCurrentIndex + 1) + ': ' + BH.setupTemplate.steps[BH.setupCurrentIndex].label);
        if (BH.render) BH.render();
    };

    BH.setupNextStep = function () {
        if (!BH.setupTemplate) return;
        if (BH.setupCurrentIndex >= BH.setupTemplate.steps.length - 1) return;

        BH.setupCurrentIndex++;
        showCurrentMarker();
        BH.setMsg('Nút ' + (BH.setupCurrentIndex + 1) + ': ' + BH.setupTemplate.steps[BH.setupCurrentIndex].label);
        if (BH.render) BH.render();
    };

    // =========================================================
    // SHOW CURRENT MARKER
    // =========================================================

    function showCurrentMarker() {
        if (BH.setupMarker) {
            BH.removeMarker(BH.setupMarker);
            BH.setupMarker = null;
        }

        const step = BH.setupTemplate.steps[BH.setupCurrentIndex];
        if (!step) return;

        let markerX, markerY;

        if (step.calibrated) {
            const canvas = BH.getCanvas();
            const pos = canvas ? BH.bufferToClient(canvas, step.x, step.y) : { clientX: 0, clientY: 0 };
            markerX = pos.clientX;
            markerY = pos.clientY;
        } else {
            markerX = window.innerWidth / 2;
            markerY = window.innerHeight / 2;
        }

        const marker = BH.createMarker(step, {
            x: markerX,
            y: markerY
        });

        if (step.calibrated) {
            BH.setMarkerState(marker, 'done', step.hex);
        } else {
            BH.setMarkerState(marker, 'pending');
        }

        BH.setupMarker = marker;
        attachMarkerEvents(marker, step);

        // Hiện kính lúp tại vị trí marker
        const canvas = BH.getCanvas();
        if (canvas) {
            const buf = BH.clientToBuffer(canvas, markerX, markerY);
            BH.showMagnifier(buf.x, buf.y, markerX, markerY);
        }
    }

    // =========================================================
    // MARKER EVENTS
    // =========================================================

    function attachMarkerEvents(marker, step) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let markerStartX = 0, markerStartY = 0;
        let pendingX = 0, pendingY = 0;
        let rafScheduled = false;

        function scheduleMarkerUpdate() {
            if (rafScheduled) return;
            rafScheduled = true;
            BH.rt.raf(function () {
                marker.style.left = pendingX + 'px';
                marker.style.top = pendingY + 'px';
                rafScheduled = false;
            });
        }

        marker.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            isDragging = true;

            BH.setMarkerState(marker, 'dragging');

            if (BH.stableTimerId !== null) {
                BH.rt.clearTimeout(BH.stableTimerId);
                BH.stableTimerId = null;
            }

            const rect = marker.getBoundingClientRect();
            markerStartX = rect.left + rect.width / 2;
            markerStartY = rect.top + rect.height / 2;
            startX = e.clientX;
            startY = e.clientY;

            marker.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            pendingX = markerStartX + dx;
            pendingY = markerStartY + dy;

            scheduleMarkerUpdate();

            const canvas = BH.getCanvas();
            if (canvas) {
                const buf = BH.clientToBuffer(canvas, pendingX, pendingY);
                BH.showMagnifier(buf.x, buf.y, pendingX, pendingY);
            }
        }, true);

        window.addEventListener('mouseup', function (e) {
            if (!isDragging) return;
            isDragging = false;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            marker.style.cursor = 'move';

            marker.style.left = pendingX + 'px';
            marker.style.top = pendingY + 'px';

            startStableCheck(marker, step, pendingX, pendingY);
        }, true);
    }

    // =========================================================
    // STABLE CHECK
    // =========================================================

    function startStableCheck(marker, step, clientX, clientY) {
        BH.setMarkerState(marker, 'checking');

        if (BH.stableTimerId !== null) {
            BH.rt.clearTimeout(BH.stableTimerId);
            BH.stableTimerId = null;
        }

        const samples = [];
        const startTime = BH.rt.now();

        function check() {
            if (!BH.setupMode) return;

            if (BH.rt.now() - startTime > STABLE_TIMEOUT) {
                BH.setMsg('⚠ Timeout — thử lại');
                BH.setMarkerState(marker, 'pending');
                return;
            }

            const canvas = BH.getCanvas();
            const gl = BH.getGL(canvas);

            if (canvas && gl) {
                const buf = BH.clientToBuffer(canvas, clientX, clientY);
                const pixel = BH.readPixel(gl, buf.x, buf.y);

                if (pixel) {
                    const hex = BH.rgbToHex(pixel);
                    samples.push(hex);
                    if (samples.length > STABLE_SAMPLE_COUNT) samples.shift();

                    BH.showMagnifier(buf.x, buf.y, clientX, clientY);

                    if (samples.length >= STABLE_SAMPLE_COUNT) {
                        const counts = {};
                        for (let i = 0; i < samples.length; i++) {
                            counts[samples[i]] = (counts[samples[i]] || 0) + 1;
                        }
                        let maxCount = 0;
                        let maxHex = null;
                        for (const h in counts) {
                            if (counts[h] > maxCount) {
                                maxCount = counts[h];
                                maxHex = h;
                            }
                        }
                        if (maxCount >= STABLE_REQUIRED) {
                            saveStableColor(marker, step, buf, maxHex, clientX, clientY);
                            return;
                        }
                    }
                }
            }

            BH.stableTimerId = BH.rt.setTimeout(check, STABLE_CHECK_INTERVAL);
        }

        check();
    }

    function saveStableColor(marker, step, buf, hex, clientX, clientY) {
        step.x = buf.x;
        step.y = buf.y;
        step.hex = hex;
        step.tol = 15;
        step.calibrated = true;

        saveStepToStorage(step);

        BH.setMarkerState(marker, 'done', hex);

        if (BH.showClickFlash) {
            BH.showClickFlash(clientX, clientY);
        }

        BH.setMsg('✓ Đã lưu ' + step.label + ': ' + hex);

        // Tự động chuyển sang step tiếp
        const nextIndex = BH.setupCurrentIndex + 1;
        if (nextIndex < BH.setupTemplate.steps.length) {
            BH.rt.setTimeout(function () {
                if (!BH.setupMode) return;
                BH.setupCurrentIndex = nextIndex;
                showCurrentMarker();
                BH.setMsg('Nút ' + (nextIndex + 1) + ': ' + BH.setupTemplate.steps[nextIndex].label);
                if (BH.render) BH.render();
            }, 800);
        } else {
            BH.setMsg('✓ Đã setup xong tất cả nút!');
        }

        if (BH.render) BH.render();
    }

    // =========================================================
    // SAVE STEP
    // =========================================================

    function saveStepToStorage(step) {
        const templateId = BH.setupTemplate.id;
        const state = BH.loadTemplateState(templateId) || {};

        state[step.id] = {
            x: step.x,
            y: step.y,
            hex: step.hex,
            tol: step.tol,
            calibrated: true
        };

        BH.saveTemplateState(templateId, state);
    }

    // =========================================================
    // RESET STEP
    // =========================================================

    BH.resetStep = function (stepId) {
        if (!BH.setupTemplate) return;

        const step = BH.getStep(BH.setupTemplate, stepId);
        if (!step) return;

        step.calibrated = false;
        step.x = null;
        step.y = null;
        step.hex = null;

        const templateId = BH.setupTemplate.id;
        const state = BH.loadTemplateState(templateId) || {};
        delete state[stepId];
        BH.saveTemplateState(templateId, state);

        BH.setMsg('Reset ' + step.label);
        if (BH.render) BH.render();
    };

    // =========================================================
    // GET CALIBRATED STATE
    // =========================================================

    BH.getCalibratedSteps = function (templateId) {
        const state = BH.loadTemplateState(templateId) || {};
        const result = [];

        for (const id in state) {
            if (state[id] && state[id].calibrated) {
                result.push(id);
            }
        }

        return result;
    };

})(window);