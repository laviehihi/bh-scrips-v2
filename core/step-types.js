// core/step-types.js
// Định nghĩa các loại step
//
// Step types hiện có:
// - click: check pixel → match → click (có delay)
// - slot: check slot có người (không click)
// - optional: như click nhưng bỏ qua nếu chưa calibrate

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.STEP_TYPES = {};

    // =========================================================
    // PENDING CLICK
    // =========================================================

    BH.pendingClick = null;

    function scheduleClick(step, delay) {
        // Nếu đã có pending → bỏ qua, không schedule thêm
        if (BH.pendingClick) return;

        const pending = {
            step: step,
            timerId: null
        };

        pending.timerId = BH.rt.setTimeout(function () {
            if (BH.pendingClick !== pending) return;
            BH.pendingClick = null;

            // Check lại pixel trước khi click
            const pixel = BH.readPixelAtBuf(step.x, step.y);
            if (!pixel) return;

            const tol = step.tol == null ? 15 : step.tol;
            let stillMatch = false;

            if (step.hexes) {
                stillMatch = BH.matchAnyHex(pixel, step.hexes, tol);
            } else {
                stillMatch = BH.matchHex(pixel, step.hex, tol);
            }

            if (!stillMatch) return;

            BH.clickAtBuf(step.x, step.y);
            BH.lastActionTime = BH.rt.now();
            BH.setMsg(BH.nowTime() + ' • ' + step.label + ' → CLICK');
        }, delay);

        BH.pendingClick = pending;
    }

    function clearPendingClick() {
        if (BH.pendingClick) {
            BH.rt.clearTimeout(BH.pendingClick.timerId);
            BH.pendingClick = null;
        }
    }

    BH.clearPendingClick = clearPendingClick;

    // =========================================================
    // CLICK
    // =========================================================

    BH.STEP_TYPES.click = {
        check: function (step) {
            const pixel = BH.readPixelAtBuf(step.x, step.y);
            if (!pixel) return false;

            const tol = step.tol == null ? 15 : step.tol;

            if (step.hexes) {
                return BH.matchAnyHex(pixel, step.hexes, tol);
            }
            return BH.matchHex(pixel, step.hex, tol);
        },

        action: function (step, delay) {
            scheduleClick(step, delay);
        }
    };

    // =========================================================
    // OPTIONAL
    // =========================================================

    BH.STEP_TYPES.optional = {
        check: function (step) {
            if (!step.calibrated) return false;

            const pixel = BH.readPixelAtBuf(step.x, step.y);
            if (!pixel) return false;

            const tol = step.tol == null ? 15 : step.tol;

            if (step.hexes) {
                return BH.matchAnyHex(pixel, step.hexes, tol);
            }
            return BH.matchHex(pixel, step.hex, tol);
        },

        action: function (step, delay) {
            scheduleClick(step, delay);
        }
    };

    // =========================================================
    // SLOT
    // =========================================================

    BH.STEP_TYPES.slot = {
        check: function () {
            return false;
        },
        action: function () { }
    };

})(window);