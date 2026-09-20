// main.user.js
// Entry point — Bit Heroes Bot v2

// ==UserScript==
// @name         Bit Heroes - Auto Bot v2
// @namespace    http://tampermonkey.net/
// @version      2.2.2
// @description  Auto bot cho Bit Heroes — template-based, click overlay
// @match        *://*.kongregate.com/*
// @match        *://*.bitheroesgame.com/*
// @run-at       document-start
// @grant        none
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/real-time.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/utils.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/pixel.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/click.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/storage.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/speed-hack.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/templates.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/step-types.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/flow-types.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/core/engine.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/ui/help.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/ui/marker.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/ui/magnifier.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/ui/setup.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/ui/overlay.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.2.2/ui/template-picker.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // FIX: ÉP TAB LUÔN VISIBLE + FOCUSED
    // =========================================================

    try {
        Object.defineProperty(document, 'hasFocus', {
            value: function () { return true; },
            configurable: true,
            writable: true
        });
    } catch (e) { }

    try {
        Object.defineProperty(document, 'hidden', {
            get: function () { return false; },
            configurable: true
        });
    } catch (e) { }

    try {
        Object.defineProperty(document, 'visibilityState', {
            get: function () { return 'visible'; },
            configurable: true
        });
    } catch (e) { }

    ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout', 'pagehide']
        .forEach(function (t) {
            window.addEventListener(t, function (e) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }, true);

            document.addEventListener(t, function (e) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }, true);
        });

    // =========================================================
    // ÉP preserveDrawingBuffer
    // =========================================================

    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (
            type === 'webgl' ||
            type === 'webgl2' ||
            type === 'experimental-webgl'
        ) {
            attrs = Object.assign({}, attrs || {}, {
                preserveDrawingBuffer: true
            });
        }
        return originalGetContext.call(this, type, attrs);
    };

    // =========================================================
    // PASSTHROUGH
    // =========================================================

    window.__BH__ = window.__BH__ || {};

    window.__BH__.togglePassthrough = function () {
        window.__BH__.passthrough = !window.__BH__.passthrough;
        window.__BH__.setMsg(
            window.__BH__.passthrough
                ? '🔓 Passthrough ON'
                : '🔒 Passthrough OFF'
        );
    };

    // =========================================================
    // HOTKEY
    // =========================================================

    document.addEventListener('keydown', function (e) {

        if (window.__BH__.passthrough) {
            if (e.shiftKey && (e.key === '`' || e.key === '~')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.__BH__.togglePassthrough();
            }
            return;
        }

        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.__BH__.setSpeed(window.__BH__.getSpeed() + 1);
            return;
        }

        if (e.key === '-') {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.__BH__.setSpeed(window.__BH__.getSpeed() - 1);
            return;
        }

        if (!e.shiftKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.__BH__.cycleOverlay();
            return;
        }

        if (e.shiftKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.__BH__.togglePassthrough();
            return;
        }

    }, true);

    // =========================================================
    // INIT
    // =========================================================

    function init() {
        window.__BH__.overlayState = 'compact';

        window.__BH__.activeTemplateId = window.__BH__.loadActiveTemplate();
        window.__BH__.loadCalibration(window.__BH__.activeTemplateId);
        window.__BH__.render();

        console.log('[BH Bot v2.2.2] Loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();