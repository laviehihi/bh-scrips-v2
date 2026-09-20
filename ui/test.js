// ui/test.js
// Test mode — check tất cả steps, flash nếu match

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.testMode = false;
    BH.testTimerId = null;
    BH.testResults = {};

    // =========================================================
    // ENTER / EXIT
    // =========================================================

    BH.enterTestMode = function () {
        if (BH.testMode) return;

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);
        if (!template) {
            BH.setMsg('Không có template để test');
            return;
        }

        if (BH.activeAuto) BH.stopAuto();

        BH.testMode = true;
        BH.testResults = {};

        // Update mỗi 1s
        BH.testTimerId = BH.rt.setInterval(runTest, 1000);

        runTest();

        BH.setMsg('Test mode — đang check...');

        if (BH.render) BH.render();
    };

    BH.exitTestMode = function () {
        if (!BH.testMode) return;

        BH.testMode = false;

        if (BH.testTimerId !== null) {
            BH.rt.clearInterval(BH.testTimerId);
            BH.testTimerId = null;
        }

        BH.testResults = {};

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

            // Slot type → đếm slot
            if (step.type === 'slot') {
                const pixel = BH.readPixelAtBuf(step.x, step.y);
                result.actualHex = pixel ? BH.rgbToHex(pixel) : null;

                if (pixel && BH.matchHex(pixel, template.config.disabledHex, template.config.tol)) {
                    result.status = 'disabled';
                } else if (pixel && BH.matchHex(pixel, step.hex, step.tol)) {
                    result.status = 'empty';
                } else {
                    result.status = 'player';
                }

                BH.testResults[step.id] = result;
                continue;
            }

            // Các type khác → check bình thường
            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            const pixel = BH.readPixelAtBuf(step.x, step.y);
            result.actualHex = pixel ? BH.rgbToHex(pixel) : null;

            if (handler.check(step)) {
                result.status = 'match';

                // Flash
                if (pixel && BH.showClickFlash) {
                    const canvas = BH.getCanvas();
                    if (canvas) {
                        const pos = BH.bufferToClient(canvas, step.x, step.y);
                        BH.showClickFlash(pos.clientX, pos.clientY);
                    }
                }
            } else {
                result.status = 'nomatch';
            }

            BH.testResults[step.id] = result;
        }

        if (BH.render) BH.render();
    }

    // =========================================================
    // HELPER
    // =========================================================

    BH.getTestResult = function (stepId) {
        return BH.testResults[stepId] || null;
    };

})(window);