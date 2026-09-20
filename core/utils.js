// core/utils.js
// Helper functions

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // HEX / RGB
    // =========================================================

    BH.toHex = function (v) {
        return v.toString(16).padStart(2, '0');
    };

    BH.rgbToHex = function (p) {
        if (!p) return '#000000';
        return '#' + BH.toHex(p.r) + BH.toHex(p.g) + BH.toHex(p.b);
    };

    BH.hexToRgb = function (hex) {
        if (!hex) return { r: 0, g: 0, b: 0 };
        const h = hex.replace('#', '');
        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16)
        };
    };

    BH.colorMatch = function (pixel, target, tolerance) {
        if (!pixel || !target) return false;
        const tol = tolerance == null ? 15 : tolerance;
        return (
            Math.abs(pixel.r - target.r) <= tol &&
            Math.abs(pixel.g - target.g) <= tol &&
            Math.abs(pixel.b - target.b) <= tol
        );
    };

    BH.matchHex = function (pixel, hex, tolerance) {
        if (!pixel || !hex) return false;
        return BH.colorMatch(pixel, BH.hexToRgb(hex), tolerance);
    };

    BH.matchAnyHex = function (pixel, hexes, tolerance) {
        if (!pixel || !hexes || !hexes.length) return false;
        for (let i = 0; i < hexes.length; i++) {
            if (BH.matchHex(pixel, hexes[i], tolerance)) return true;
        }
        return false;
    };

    // =========================================================
    // BRIGHTNESS
    // =========================================================

    BH.brightness = function (pixel) {
        if (!pixel) return 0;
        return Math.round(
            pixel.r * 0.299 +
            pixel.g * 0.587 +
            pixel.b * 0.114
        );
    };

    // =========================================================
    // FORMAT
    // =========================================================

    BH.nowTime = function () {
        return new Date(BH.rt.now()).toLocaleTimeString('vi-VN', { hour12: false });
    };

    BH.getRemainingStr = function () {
        if (!BH.activeAuto) return '';

        const elapsed = BH.rt.now() - BH.lastActionTime;
        const remain = BH.AUTO_STOP_TIMEOUT - elapsed;
        if (remain <= 0) return '';

        const sec = Math.floor(remain / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m + 'm' + s.toString().padStart(2, '0') + 's';
    };

    // =========================================================
    // DEEP CLONE (đơn giản, đủ dùng cho template)
    // =========================================================

    BH.clone = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };

})(window);