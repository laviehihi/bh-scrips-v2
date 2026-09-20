// core/step-types.js
// Định nghĩa các loại step

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.STEP_TYPES = {};

    // =========================================================
    // PENDING CLICK
    // =========================================================

    BH.pendingClick = null;

    function scheduleClick(step, delay) {
        if (BH.pendingClick) return;

        const pending = {
            step: step,
            timerId: null
        };

        pending.timerId = BH.rt.setTimeout(function () {
            if (BH.pendingClick !== pending) return;
            BH.pendingClick = null;

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

    // =========================================================
    // TOGGLE — nút bật/tắt (2 màu)
    // =========================================================

    BH.STEP_TYPES.toggle = {
        check: function (step) {
            if (!step.calibrated) return false;
            if (!step.hexOff || !step.hexOn) return false;

            const pixel = BH.readPixelAtBuf(step.x, step.y);
            if (!pixel) return false;

            const tol = step.tol || 15;

            // Match hexOff → auto đang tắt → cần click
            if (BH.matchHex(pixel, step.hexOff, tol)) {
                return true;
            }

            // Match hexOn → auto đã bật → không click
            return false;
        },

        action: function (step, delay) {
            scheduleClick(step, delay);
        }
    };

    // =========================================================
    // KEYPRESS — gửi phím (không click)
    // =========================================================

    BH.STEP_TYPES.keypress = {
        check: function () {
            return false;
        },
        action: function () { }
    };

})(window);