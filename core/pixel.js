// core/pixel.js
// Đọc pixel từ WebGL + convert tọa độ

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    let cachedCanvas = null;
    let cachedGL = null;

    // =========================================================
    // CANVAS + GL
    // =========================================================

    BH.getCanvas = function () {
        return document.querySelector('#unity-canvas')
            || document.querySelector('canvas');
    };

    BH.getGL = function (canvas) {
        if (!canvas) return null;
        if (cachedCanvas === canvas && cachedGL) return cachedGL;

        let gl = null;
        try {
            gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
                || canvas.getContext('webgl', { preserveDrawingBuffer: true })
                || canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
        } catch (e) {
            gl = null;
        }

        cachedCanvas = canvas;
        cachedGL = gl;
        return gl;
    };

    // =========================================================
    // READ PIXEL
    // =========================================================

    BH.readPixel = function (gl, x, y) {
        if (!gl) return null;

        const pixel = new Uint8Array(4);
        try {
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        } catch (e) {
            return null;
        }

        return {
            r: pixel[0],
            g: pixel[1],
            b: pixel[2],
            a: pixel[3]
        };
    };

    BH.readPixelAtBuf = function (bufX, bufY) {
        const canvas = BH.getCanvas();
        if (!canvas) return null;
        const gl = BH.getGL(canvas);
        if (!gl) return null;
        return BH.readPixel(gl, bufX, bufY);
    };

    // =========================================================
    // READ COLOR MAP (cho kính lúp)
    // =========================================================

    BH.readColorMap = function (gl, centerX, centerY, radius) {
        if (!gl) return [];

        const map = [];
        const w = gl.canvas.width;
        const h = gl.canvas.height;

        for (let y = -radius; y <= radius; y++) {
            const row = [];
            for (let x = -radius; x <= radius; x++) {
                const px = centerX + x;
                const py = centerY + y;

                if (px < 0 || py < 0 || px >= w || py >= h) {
                    row.push(null);
                    continue;
                }

                row.push(BH.readPixel(gl, px, py));
            }
            map.push(row);
        }

        return map;
    };

    // =========================================================
    // COORDINATE CONVERSION
    // =========================================================

    BH.clientToBuffer = function (canvas, clientX, clientY) {
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((clientX - rect.left) * scaleX);
        const y = Math.floor((rect.bottom - clientY) * scaleY);

        return { x: x, y: y };
    };

    BH.bufferToClient = function (canvas, bufX, bufY) {
        if (!canvas) return { clientX: 0, clientY: 0 };

        const rect = canvas.getBoundingClientRect();

        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;

        const clientX = rect.left + bufX * scaleX;
        const clientY = rect.bottom - bufY * scaleY;

        return { clientX: clientX, clientY: clientY };
    };

    // =========================================================
    // RESET HOVER POINT
    // =========================================================

    BH.RESET_POINT_X = 5;
    BH.RESET_POINT_Y = 5;

})(window);