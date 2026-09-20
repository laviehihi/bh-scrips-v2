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
        const currentPlayers = BH.countWBPlayers(template);

        // Lưu số người hiện tại để overlay hiển thị
        BH.wbCurrentPlayers = currentPlayers;

        const options = BH.loadTemplateOptions(template.id);
        const partySize = options.partySize || 1;

        BH.wbPartySize = partySize;

        if (currentPlayers < partySize) {
            BH.setMsg('Chờ member (' + currentPlayers + '/' + partySize + ')');
            return false;
        }

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
    };

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

            // Slot không thuộc party → bỏ qua
            if (BH.matchHex(pixel, disabledHex, tol)) continue;

            // Slot trống → bỏ qua (màu user đã calibrate)
            if (BH.matchHex(pixel, step.hex, step.tol || tol)) continue;

            // Slot có người
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