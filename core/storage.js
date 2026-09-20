// core/storage.js
// localStorage: rules, template state, overlay position

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const PREFIX = 'bh_v3_';

    // =========================================================
    // GENERIC GET / SET
    // =========================================================

    function getKey(key) {
        return PREFIX + key;
    }

    BH.storageGet = function (key, defaultValue) {
        try {
            const raw = localStorage.getItem(getKey(key));
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            return defaultValue;
        }
    };

    BH.storageSet = function (key, value) {
        try {
            localStorage.setItem(getKey(key), JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    };

    BH.storageRemove = function (key) {
        try {
            localStorage.removeItem(getKey(key));
        } catch (e) { }
    };

    // =========================================================
    // TEMPLATE STATE — calibration của từng template
    // =========================================================

    BH.loadTemplateState = function (templateId) {
        return BH.storageGet('tpl_' + templateId, null);
    };

    BH.saveTemplateState = function (templateId, state) {
        return BH.storageSet('tpl_' + templateId, state);
    };

    BH.clearTemplateState = function (templateId) {
        BH.storageRemove('tpl_' + templateId);
    };

    // =========================================================
    // TEMPLATE OPTIONS — delay, partySize, ...
    // =========================================================

    BH.loadTemplateOptions = function (templateId) {
        return BH.storageGet('opt_' + templateId, {});
    };

    BH.saveTemplateOptions = function (templateId, options) {
        return BH.storageSet('opt_' + templateId, options);
    };

    // =========================================================
    // OVERLAY POSITION
    // =========================================================

    BH.loadOverlayPos = function () {
        return BH.storageGet('overlay_pos', { x: null, y: null });
    };

    BH.saveOverlayPos = function (x, y) {
        return BH.storageSet('overlay_pos', { x: x, y: y });
    };

    // =========================================================
    // ACTIVE TEMPLATE
    // =========================================================

    BH.loadActiveTemplate = function () {
        return BH.storageGet('active_template', 'rerun');
    };

    BH.saveActiveTemplate = function (id) {
        return BH.storageSet('active_template', id);
    };

})(window);