// ui/test.js
// Test mode — check tất cả steps, hiện vòng indicator

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.testMode = false;
    BH.testCollapsed = false;
    BH.testTimerId = null;
    BH.testResults = {};
    BH.testStepStates = {};
    BH.testIndicators = {};

    // =========================================================
    // ENTER / EXIT
    // =========================================================

    BH.enterTestMode = function () {
        if (BH.testMode) return;

        if (BH.activeAuto) {
            BH.setMsg('⚠ Tắt bot trước khi test');
            return;
        }

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);
        if (!template) {
            BH.setMsg('Không có template để test');
            return;
        }

        BH.testMode = true;
        BH.testCollapsed = false;
        BH.testResults = {};
        BH.testStepStates = {};
        BH.testIndicators = {};

        // Load calibration
        BH.loadCalibration(templateId);

        createIndicators(template);

        BH.testTimerId = BH.rt.setInterval(runTest, 1000);

        runTest();

        BH.setMsg('Test mode — đang check...');

        if (BH.render) BH.render();
    };

    BH.exitTestMode = function () {
        if (!BH.testMode) return;

        BH.testMode = false;
        BH.testCollapsed = false;

        if (BH.testTimerId !== null) {
            BH.rt.clearInterval(BH.testTimerId);
            BH.testTimerId = null;
        }

        for (const id in BH.testIndicators) {
            const el = BH.testIndicators[id];
            if (el && el.parentNode) el.remove();
        }
        BH.testIndicators = {};

        BH.testResults = {};
        BH.testStepStates = {};

        BH.setMsg('Thoát test mode');

        if (BH.render) BH.render();
    };

    BH.toggleTestMode = function () {
        if (BH.testMode) {
            BH.exitTestMode();
        } else {
            BH.enterTestMode();
        }
    };

    // =========================================================
    // CREATE INDICATORS
    // =========================================================

    function createIndicators(template) {
        const canvas = BH.getCanvas();
        if (!canvas) return;

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            if (!step.calibrated) continue;

            const pos = BH.bufferToClient(canvas, step.x, step.y);

            const dot = document.createElement('div');
            Object.assign(dot.style, {
                position: 'fixed',
                left: pos.clientX + 'px',
                top: pos.clientY + 'px',
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
                border: '2px solid #ff3333',
                borderRadius: '50%',
                background: 'rgba(255, 51, 51, 0.2)',
                boxShadow: '0 0 8px rgba(255, 51, 51, 0.6)',
                pointerEvents: 'none',
                zIndex: '2147483645',
                transition: 'border-color .2s, background .2s, box-shadow .2s'
            });

            document.documentElement.appendChild(dot);
            BH.testIndicators[step.id] = dot;
            BH.testStepStates[step.id] = 'pending';
        }
    }

    function setIndicatorState(stepId, state) {
        const dot = BH.testIndicators[stepId];
        if (!dot) return;

        if (state === 'match') {
            dot.style.borderColor = '#00ff66';
            dot.style.background = 'rgba(0, 255, 102, 0.2)';
            dot.style.boxShadow = '0 0 12px rgba(0, 255, 102, 0.8)';
        } else if (state === 'nomatch') {
            dot.style.borderColor = '#ff3333';
            dot.style.background = 'rgba(255, 51, 51, 0.2)';
            dot.style.boxShadow = '0 0 8px rgba(255, 51, 51, 0.6)';
        }
    }

    // =========================================================
    // RUN TEST
    // =========================================================

    function runTest() {
        if (!BH.testMode) return;

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);
        if (!template) return;

        BH.testResults = {};

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];

            const result = {
                step: step,
                status: 'uncalibrated',
                actualHex: null
            };

            if (!step.calibrated) {
                result.status = 'uncalibrated';
                BH.testResults[step.id] = result;
                continue;
            }

            if (BH.testStepStates[step.id] === 'match') {
                result.status = 'match';
                BH.testResults[step.id] = result;
                continue;
            }

            const pixel = BH.readPixelAtBuf(step.x, step.y);
            result.actualHex = pixel ? BH.rgbToHex(pixel) : null;

            if (step.type === 'slot') {
                if (pixel && BH.matchHex(pixel, template.config.disabledHex, template.config.tol)) {
                    result.status = 'disabled';
                } else if (pixel && BH.matchHex(pixel, step.hex, step.tol)) {
                    result.status = 'empty';
                    BH.testStepStates[step.id] = 'match';
                    setIndicatorState(step.id, 'match');
                } else {
                    result.status = 'player';
                }
                BH.testResults[step.id] = result;
                continue;
            }

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                result.status = 'match';
                BH.testStepStates[step.id] = 'match';
                setIndicatorState(step.id, 'match');

                if (pixel && BH.showClickFlash) {
                    const canvas = BH.getCanvas();
                    if (canvas) {
                        const pos = BH.bufferToClient(canvas, step.x, step.y);
                        BH.showClickFlash(pos.clientX, pos.clientY);
                    }
                }
            } else {
                result.status = 'nomatch';
                setIndicatorState(step.id, 'nomatch');
            }

            BH.testResults[step.id] = result;
        }

        if (BH.render) BH.render();
    }

    BH.getTestResult = function (stepId) {
        return BH.testResults[stepId] || null;
    };

})(window);