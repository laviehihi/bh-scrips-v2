// ==UserScript==
// @name         Bit Heroes - Auto Bot v3
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Auto bot cho Bit Heroes — template-based, click overlay
// @match        *://*.kongregate.com/*
// @match        *://*.bitheroesgame.com/*
// @run-at       document-start
// @grant        none
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/real-time.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/utils.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/pixel.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/click.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/storage.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/speed-hack.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/templates.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/step-types.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/flow-types.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/core/engine.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/help.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/marker.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/magnifier.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/setup.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/test.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/overlay.js
// @require      https://cdn.jsdelivr.net/gh/laviehihi/bh-scrips-v2@v2.0.3/ui/template-picker.js
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
    // EXPORT TEMPLATE
    // =========================================================

    window.__BH__ = window.__BH__ || {};

    window.__BH__.exportTemplate = function (templateId) {
        const template = window.__BH__.getTemplate(templateId);
        if (!template) return;

        const state = window.__BH__.loadTemplateState(templateId) || {};
        const options = window.__BH__.loadTemplateOptions(templateId) || {};

        const data = {
            version: 1,
            templateId: templateId,
            template: template,
            state: state,
            options: options,
            exportedAt: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);

        // Copy to clipboard
        try {
            navigator.clipboard.writeText(json);
            window.__BH__.setMsg('✓ Đã copy template vào clipboard');
        } catch (e) {
            // Fallback: hiện prompt
            window.prompt('Copy template JSON:', json);
        }
    };

    // =========================================================
    // IMPORT TEMPLATE
    // =========================================================

    window.__BH__.importTemplateDialog = function () {
        const json = window.prompt('Paste template JSON:');
        if (!json) return;

        try {
            const data = JSON.parse(json);

            if (!data.templateId || !data.state) {
                window.__BH__.setMsg('⚠ JSON không hợp lệ');
                return;
            }

            window.__BH__.saveTemplateState(data.templateId, data.state);
            if (data.options) {
                window.__BH__.saveTemplateOptions(data.templateId, data.options);
            }

            window.__BH__.setMsg('✓ Đã import template: ' + data.templateId);

            // Reload UI
            window.__BH__.activeTemplateId = data.templateId;
            window.__BH__.saveActiveTemplate(data.templateId);
            window.__BH__.render();

        } catch (e) {
            window.__BH__.setMsg('⚠ Lỗi parse JSON');
        }
    };

    // =========================================================
    // PASSTHROUGH
    // =========================================================

    window.__BH__.togglePassthrough = function () {
        window.__BH__.passthrough = !window.__BH__.passthrough;
        window.__BH__.setMsg(
            window.__BH__.passthrough
                ? '🔓 Passthrough ON'
                : '🔒 Passthrough OFF'
        );
    };

    // =========================================================
    // HOTKEY — chỉ giữ ` và Shift+`
    // =========================================================

    document.addEventListener('keydown', function (e) {

        // Passthrough ON → chỉ cho Shift+` để thoát
        if (window.__BH__.passthrough) {
            if (e.shiftKey && (e.key === '`' || e.key === '~')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.__BH__.togglePassthrough();
            }
            return;
        }

        // ` = cycle overlay
        if (!e.shiftKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.__BH__.cycleOverlay();
            return;
        }

        // Shift + ` = passthrough
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
        // Load active template
        window.__BH__.activeTemplateId = window.__BH__.loadActiveTemplate();

        // Render overlay
        window.__BH__.render();

        // Render loop mỗi 500ms real time
        window.__BH__.rt.setInterval(function () {
            if (window.__BH__.render) {
                window.__BH__.render();
            }
        }, 500);

        console.log('[BH Bot v3.0] Loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();