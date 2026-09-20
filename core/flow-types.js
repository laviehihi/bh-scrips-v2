// core/flow-types.js
// Định nghĩa các loại flow
//
// Flow types hiện có:
// - sequential: check tuần tự theo flow.order
// - wb: check slot trước, rồi sequential

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
        // Check nút Start/Ready có visible không
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

        // Nếu không thấy Start/Ready → đang trong trận hoặc màn khác → không check slot
        if (!startVisible && !readyVisible) {
            // Vẫn cần check Regroup (trong trận có thể có nút Regroup)
            return checkNonSlotSteps(template, onMatch);
        }

        // Đang ở màn chờ → check slot
        const currentPlayers = BH.countWBPlayers(template);
        BH.wbCurrentPlayers = currentPlayers;

        const options = BH.loadTemplateOptions(template.id);
        const partySize = options.partySize || 1;
        BH.wbPartySize = partySize;

        if (currentPlayers < partySize) {
            BH.setMsg('Chờ member (' + currentPlayers + '/' + partySize + ')');
            return false;
        }

        // Đủ người → check Start/Ready
        return checkNonSlotSteps(template, onMatch);
    };

    // =========================================================
    // CHECK NON-SLOT STEPS
    // =========================================================

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