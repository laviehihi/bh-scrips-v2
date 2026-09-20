// ui/setup.js
// Setup mode — kéo thả marker để calibrate
//
// Flow:
// 1. Vào setup → hiện markers
// 2. Marker chưa calibrate → xếp hàng ngang ở dưới
// 3. Marker đã calibrate → hiện đúng vị trí
// 4. Kéo marker → magnifier update
// 5. Thả marker → stable check (5 mẫu × 200ms, click reset trước mỗi mẫu)
// 6. Chốt màu → tick xanh

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const STABLE_CHECK_INTERVAL = 200;
    const STABLE_SAMPLE_COUNT = 5;
    const STABLE_REQUIRED = 3;
    const STABLE_TIMEOUT = 5000;

    // Vị trí marker chưa calibrate — xếp hàng ngang ở dưới
    const ROW_START_X = 60;
    const ROW_START_Y_OFFSET = 100;
    const ROW_SPACING_X = 90;
    const ROW_WRAP = 6;

    // =========================================================
    // STATE
    // =========================================================

    BH.setupMode = false;
    BH.setupMarkers = {};
    BH.setupTemplate = null;
    BH.stableTimerId = null;

    // =========================================================
    // ENTER / EXIT
    // =========================================================

    BH.enterSetupMode = function () {
        if (BH.setupMode) return;

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);
        if (!template) {
            BH.setMsg('Không có template để setup');
            return;
        }

        // Stop auto nếu đang chạy
        if (BH.activeAuto) BH.stopAuto();

        BH.setupMode = true;
        BH.isSetupLock = true;
        BH.setupTemplate = template;

        // Load state đã lưu
        const savedState = BH.loadTemplateState(templateId) || {};

        const uncalibrated = [];

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            const savedStep = savedState[step.id];

            let markerX, markerY, calibrated;

            if (savedStep && savedStep.x != null && savedStep.hex) {
                // Đã calibrate → hiện đúng vị trí
                step.x = savedStep.x;
                step.y = savedStep.y;
                step.hex = savedStep.hex;
                step.tol = savedStep.tol || 15;
                step.calibrated = true;

                const canvas = BH.getCanvas();
                const pos = canvas ? BH.bufferToClient(canvas, step.x, step.y) : { clientX: 0, clientY: 0 };
                markerX = pos.clientX;
                markerY = pos.clientY;
                calibrated = true;
            } else {
                // Chưa calibrate → xếp hàng
                step.calibrated = false;
                uncalibrated.push(step);
                calibrated = false;
            }

            const marker = BH.createMarker(step, {
                x: calibrated ? markerX : 0,
                y: calibrated ? markerY : 0
            });

            if (calibrated) {
                BH.setMarkerState(marker, 'done', step.hex);
            } else {
                BH.setMarkerState(marker, 'pending');
            }

            BH.setupMarkers[step.id] = marker;
            attachMarkerEvents(marker, step);
        }

        // Layout marker chưa calibrate
        layoutUncalibratedMarkers(uncalibrated);

        BH.setMsg('Setup: kéo markers vào đúng vị trí');

        if (BH.render) BH.render();
    };

    BH.exitSetupMode = function () {
        if (!BH.setupMode) return;

        BH.setupMode = false;
        BH.isSetupLock = false;

        // Xoá markers
        for (const id in BH.setupMarkers) {
            BH.removeMarker(BH.setupMarkers[id]);
        }
        BH.setupMarkers = {};

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
    // LAYOUT MARKERS CHƯA CALIBRATE
    // =========================================================

    function layoutUncalibratedMarkers(steps) {
        const baseY = window.innerHeight - ROW_START_Y_OFFSET;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const marker = BH.setupMarkers[step.id];
            if (!marker) continue;

            const row = Math.floor(i / ROW_WRAP);
            const col = i % ROW_WRAP;

            const x = ROW_START_X + col * ROW_SPACING_X;
            const y = baseY - row * 60;

            marker.style.left = x + 'px';
            marker.style.top = y + 'px';
        }
    }

    // =========================================================
    // MARKER EVENTS — DRAG
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

            // Update magnifier
            const canvas = BH.getCanvas();
            if (canvas) {
                const buf = BH.clientToBuffer(canvas, pendingX, pendingY);
                BH.showMagnifier(buf.x, buf.y);
            }
        }, true);

        window.addEventListener('mouseup', function (e) {
            if (!isDragging) return;
            isDragging = false;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            marker.style.cursor = 'move';

            const rect = marker.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            startStableCheck(marker, step, centerX, centerY);
        }, true);
    }

    // =========================================================
    // STABLE CHECK
    // =========================================================

    function startStableCheck(marker, step, clientX, clientY) {
        BH.setMarkerState(marker, 'checking');

        const samples = [];
        const startTime = BH.rt.now();

        function checkOnce() {
            if (!BH.setupMode) return;

            if (BH.rt.now() - startTime > STABLE_TIMEOUT) {
                BH.setMsg('⚠ Timeout — thử lại');
                BH.setMarkerState(marker, 'pending');
                return;
            }

            const canvas = BH.getCanvas();
            if (!canvas) {
                BH.stableTimerId = BH.rt.setTimeout(checkOnce, STABLE_CHECK_INTERVAL);
                return;
            }

            const gl = BH.getGL(canvas);
            if (!gl) {
                BH.stableTimerId = BH.rt.setTimeout(checkOnce, STABLE_CHECK_INTERVAL);
                return;
            }

            // Click RESET_POINT để tắt hover
            BH.resetHover();

            // Chờ 1 nhịp rồi đọc pixel
            BH.stableTimerId = BH.rt.setTimeout(function () {
                if (!BH.setupMode) return;

                const buf = BH.clientToBuffer(canvas, clientX, clientY);
                const pixel = BH.readPixel(gl, buf.x, buf.y);

                if (pixel) {
                    samples.push({
                        hex: BH.rgbToHex(pixel),
                        buf: buf
                    });

                    BH.showMagnifier(buf.x, buf.y);
                }

                if (samples.length >= STABLE_SAMPLE_COUNT) {
                    finishStableCheck(marker, step, samples, clientX, clientY);
                    return;
                }

                BH.stableTimerId = BH.rt.setTimeout(checkOnce, STABLE_CHECK_INTERVAL);
            }, 50);
        }

        checkOnce();
    }

    function finishStableCheck(marker, step, samples, clientX, clientY) {
        const counts = {};
        for (let i = 0; i < samples.length; i++) {
            const h = samples[i].hex;
            counts[h] = (counts[h] || 0) + 1;
        }

        let maxCount = 0;
        let maxHex = null;
        for (const h in counts) {
            if (counts[h] > maxCount) {
                maxCount = counts[h];
                maxHex = h;
            }
        }

        if (maxCount < STABLE_REQUIRED) {
            BH.setMsg('⚠ Màu không ổn định — thử lại');
            BH.setMarkerState(marker, 'pending');
            return;
        }

        const canvas = BH.getCanvas();
        const buf = BH.clientToBuffer(canvas, clientX, clientY);

        step.x = buf.x;
        step.y = buf.y;
        step.hex = maxHex;
        step.tol = 15;
        step.calibrated = true;

        saveStepToStorage(step);

        BH.setMarkerState(marker, 'done', maxHex);

        if (BH.showClickFlash) {
            BH.showClickFlash(clientX, clientY);
        }

        BH.setMsg('✓ Đã lưu ' + step.label + ': ' + maxHex);

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

        const marker = BH.setupMarkers[stepId];
        if (marker) {
            BH.setMarkerState(marker, 'pending');

            const uncalibrated = [];
            for (let i = 0; i < BH.setupTemplate.steps.length; i++) {
                const s = BH.setupTemplate.steps[i];
                if (!s.calibrated) uncalibrated.push(s);
            }
            layoutUncalibratedMarkers(uncalibrated);
        }

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