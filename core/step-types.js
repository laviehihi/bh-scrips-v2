// core/step-types.js
// Định nghĩa các loại step
//
// ĐỂ THÊM STEP TYPE MỚI:
// 1. Thêm object vào BH.STEP_TYPES
// 2. Object có check(step) + action(step)
// 3. check() trả về true/false
// 4. action() thực hiện click hoặc hành động
//
// Step types hiện có:
// - click: check pixel → match → click
// - slot: check slot có người (không click)
// - optional: như click nhưng bỏ qua nếu chưa calibrate

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.STEP_TYPES = {};

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

        action: function (step) {
            BH.clickAtBuf(step.x, step.y);
        }
    };

    // =========================================================
    // OPTIONAL — như click nhưng bỏ qua nếu chưa calibrate
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

        action: function (step) {
            BH.clickAtBuf(step.x, step.y);
        }
    };

    // =========================================================
    // SLOT — check slot WB có người (không click)
    // =========================================================

    BH.STEP_TYPES.slot = {
        check: function (step) {
            // Slot không tự click, chỉ dùng để đếm
            // Logic đếm nằm ở BH.countWBPlayers
            return false;
        },

        action: function () {
            // Không làm gì
        }
    };

})(window);