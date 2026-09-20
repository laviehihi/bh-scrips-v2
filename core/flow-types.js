// core/flow-types.js
// Định nghĩa các loại flow

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.FLOW_TYPES = {};

    // =========================================================
    // SEQUENTIAL
    // =========================================================

    BH.FLOW_TYPES.sequential = function (template, onMatch) {
        const order = template.flow.order || [];

        for (let i = 0; i < order.length; i++) {
            const step = BH.getStep(template, order[i]);
            if (!step) continue;
            if (!step.calibrated) continue;

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                onMatch(step);
                return true;
            }
        }

        return false;
    };

    // =========================================================
    // WB
    // =========================================================

    BH.FLOW_TYPES.wb = function (template, onMatch) {
        const options = BH.loadTemplateOptions(template.id);
        const partySize = options.partySize || 1;
        BH.wbPartySize = partySize;

        // Solo → không check slot
        if (partySize === 1) {
            BH.wbCurrentPlayers = 1;
            return checkNonSlotSteps(template, onMatch);
        }

        const startStep = BH.getStep(template, 'start');
        const readyStep = BH.getStep(template, 'ready');

        let startVisible = false;
        let readyVisible = false;

        if (startStep && startStep.calibrated) {
            const handler = BH.STEP_TYPES[startStep.type || 'click'];
            if (handler && handler.check(startStep)) {
                startVisible = true;
            }
        }

        if (readyStep && readyStep.calibrated) {
            const handler = BH.STEP_TYPES[readyStep.type || 'click'];
            if (handler && handler.check(readyStep)) {
                readyVisible = true;
            }
        }

        if (!startVisible && !readyVisible) {
            return checkNonSlotSteps(template, onMatch);
        }

        const currentPlayers = BH.countWBPlayers(template);
        BH.wbCurrentPlayers = currentPlayers;

        if (currentPlayers < partySize) {
            BH.setMsg('Chờ member (' + currentPlayers + '/' + partySize + ')');
            return false;
        }

        return checkNonSlotSteps(template, onMatch);
    };

    function checkNonSlotSteps(template, onMatch) {
        const order = template.flow.order || [];

        for (let i = 0; i < order.length; i++) {
            const step = BH.getStep(template, order[i]);
            if (!step) continue;
            if (!step.calibrated) continue;
            if (step.type === 'slot') continue;

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                onMatch(step);
                return true;
            }
        }

        return false;
    }

    // =========================================================
    // COUNT WB PLAYERS
    // =========================================================

    BH.countWBPlayers = function (template) {
        const canvas = BH.getCanvas();
        if (!canvas || canvas.width === 0 || canvas.height === 0) return 0;

        const disabledHex = template.config.disabledHex;
        const tol = template.config.tol || 15;
        let count = 0;

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            if (step.type !== 'slot') continue;
            if (!step.calibrated) continue;

            const pixel = BH.readPixelAtBuf(step.x, step.y);
            if (!pixel) continue;

            if (BH.matchHex(pixel, disabledHex, tol)) continue;
            if (BH.matchHex(pixel, step.hex, step.tol || tol)) continue;

            count++;
        }

        return count;
    };

    // =========================================================
    // INVA — flow riêng với ESC + duration
    // =========================================================

    BH.FLOW_TYPES.inva = function (template, onMatch) {
        const options = BH.loadTemplateOptions(template.id);
        const duration = options.duration || 10;

        // Reset state nếu chưa bắt đầu
        if (BH.invaAutoClickedAt == null) {
            BH.invaAutoClickedAt = 0;
            BH.invaEscSent = false;
        }

        // Phase 1: chưa click auto → check steps trước auto
        if (!BH.invaAutoClickedAt) {
            const beforeAuto = ['start', 'confirmTeam', 'yesNo'];

            for (let i = 0; i < beforeAuto.length; i++) {
                const step = BH.getStep(template, beforeAuto[i]);
                if (!step) continue;
                if (!step.calibrated) continue;

                const handler = BH.STEP_TYPES[step.type || 'click'];
                if (!handler) continue;

                if (handler.check(step)) {
                    onMatch(step);
                    return true;
                }
            }

            // Check step auto
            const autoStep = BH.getStep(template, 'autoInGame');
            if (autoStep && autoStep.calibrated) {
                const handler = BH.STEP_TYPES[autoStep.type || 'click'];
                if (handler && handler.check(autoStep)) {
                    onMatch(autoStep);
                    BH.invaAutoClickedAt = BH.rt.now();
                    return true;
                }
            }

            return false;
        }

        // Phase 2: đã click auto → đếm X giây
        const elapsed = BH.rt.now() - BH.invaAutoClickedAt;

        if (elapsed < duration * 1000) {
            const remain = Math.ceil((duration * 1000 - elapsed) / 1000);
            BH.setMsg('Auto đang chạy... còn ' + remain + 's');
            return false;
        }

        // Phase 3: hết X giây → gửi ESC (1 lần)
        if (!BH.invaEscSent) {
            BH.dispatchKeyPress('Escape');
            BH.invaEscSent = true;
            BH.setMsg('Đã gửi ESC — chờ popup');

            BH.rt.setTimeout(function () {
                if (BH.activeAuto === template.id) {
                    BH.doCheck();
                }
            }, 1000);

            return true;
        }

        // Phase 4: sau ESC → check yesLeave, returnHome
        const afterEsc = ['yesLeave', 'returnHome'];

        for (let i = 0; i < afterEsc.length; i++) {
            const step = BH.getStep(template, afterEsc[i]);
            if (!step) continue;
            if (!step.calibrated) continue;

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                onMatch(step);

                // Nếu là returnHome → reset state cho vòng sau
                if (step.id === 'returnHome') {
                    BH.rt.setTimeout(function () {
                        BH.invaAutoClickedAt = 0;
                        BH.invaEscSent = false;
                    }, 3000);
                }

                return true;
            }
        }

        return false;
    };

    // =========================================================
    // GET STEP
    // =========================================================

    BH.getStep = function (template, stepId) {
        if (!template || !template.steps) return null;
        for (let i = 0; i < template.steps.length; i++) {
            if (template.steps[i].id === stepId) return template.steps[i];
        }
        return null;
    };

})(window);