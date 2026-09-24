// core/engine.js
// Runtime engine

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const SCAN_INTERVAL = 300;

    // =========================================================
    // STATE
    // =========================================================

    BH.activeAuto = null;
    BH.activeTemplateId = null;
    BH.lastActionTime = 0;

    BH.checkTimerId = null;
    BH.autoStopTimerId = null;

    BH.AUTO_STOP_TIMEOUT = 3 * 60 * 1000;

    // =========================================================
    // RESET RUNTIME STATE
    // =========================================================

    function resetRuntimeState() {
        // Inva state
        BH.invaAutoCheckedAt = 0;
        BH.invaEscSent = false;

        // Cooldown (nếu có dùng)
        BH.clickCooldownUntil = 0;

        // Keypress state (nếu có dùng)
        BH.keypressSent = {};

        // Wait state (nếu có dùng)
        BH.waitStepDone = {};

        // Pending click
        if (BH.clearPendingClick) {
            BH.clearPendingClick();
        }
    }

    // =========================================================
    // LOAD CALIBRATION
    // =========================================================

    BH.loadCalibration = function (templateId) {
        const template = BH.getTemplate(templateId);
        if (!template) return;

        if (templateId === 'custom') {
            const customSteps = BH.loadCustomSteps();
            if (customSteps && Array.isArray(customSteps) && customSteps.length > 0) {
                template.steps = customSteps;
                template.flow.order = customSteps.map(function (s) { return s.id; });
            }
        }

        const state = BH.loadTemplateState(templateId) || {};

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            const saved = state[step.id];

            if (saved && saved.x != null && saved.hex) {
                step.x = saved.x;
                step.y = saved.y;
                step.hex = saved.hex;
                step.tol = saved.tol || 15;
                step.calibrated = true;
            } else {
                step.calibrated = false;
            }
        }
    };

    // =========================================================
    // DO CHECK
    // =========================================================

    BH.doCheck = function () {
        if (!BH.activeAuto) return;
        if (BH.isSetupLock) return;

        // Cooldown sau click
        if (BH.clickCooldownUntil && BH.rt.now() < BH.clickCooldownUntil) {
            return;
        }

        const template = BH.getTemplate(BH.activeAuto);
        if (!template) return;

        const flowHandler = BH.FLOW_TYPES[template.flow.type];
        if (!flowHandler) {
            BH.setMsg('Flow type không hỗ trợ: ' + template.flow.type);
            return;
        }

        const options = BH.loadTemplateOptions(template.id);
        const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

        const matched = flowHandler(template, function (step) {
            const stepHandler = BH.STEP_TYPES[step.type || 'click'];
            if (!stepHandler) return;

            stepHandler.action(step, clickDelay);
        });

        if (!matched) {
            // Không match step nào
        }
    };

    // =========================================================
    // AUTO-STOP
    // =========================================================

    BH.checkAutoStop = function () {
        if (!BH.activeAuto) return;

        const elapsed = BH.rt.now() - BH.lastActionTime;

        if (elapsed >= BH.AUTO_STOP_TIMEOUT) {
            const stopped = BH.activeAuto;
            BH.stopAuto();
            BH.setMsg('⚠ ' + stopped.toUpperCase() + ' auto-stop (3 phút không click)');
        }
    };

    // =========================================================
    // START / STOP
    // =========================================================

    BH.startAuto = function (templateId) {
        if (BH.activeAuto && BH.activeAuto !== templateId) {
            BH.stopAuto();
        }

        if (BH.activeAuto === templateId) {
            BH.stopAuto();
            return;
        }

        const template = BH.getTemplate(templateId);
        if (!template) {
            BH.setMsg('Template không tồn tại: ' + templateId);
            return;
        }

        BH.loadCalibration(templateId);

        // Reset state trước khi bắt đầu
        resetRuntimeState();

        BH.activeAuto = templateId;
        BH.activeTemplateId = templateId;
        BH.lastActionTime = BH.rt.now();

        BH.autoStopTimerId = BH.rt.setInterval(BH.checkAutoStop, 5000);
        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, SCAN_INTERVAL);

        BH.doCheck();

        const options = BH.loadTemplateOptions(templateId);
        const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

        if (BH.overlayState === 'expanded') {
            BH.overlayState = 'compact';
        }

        BH.setMsg(template.name + ' started · scan 0.3s · click delay ' + (clickDelay / 1000) + 's');

        if (BH.render) BH.render();
    };

    BH.stopAuto = function () {
        if (!BH.activeAuto) return;

        const stopped = BH.activeAuto;
        BH.activeAuto = null;

        if (BH.checkTimerId !== null) {
            BH.rt.clearInterval(BH.checkTimerId);
            BH.checkTimerId = null;
        }

        if (BH.autoStopTimerId !== null) {
            BH.rt.clearInterval(BH.autoStopTimerId);
            BH.autoStopTimerId = null;
        }

        // Reset state khi stop
        resetRuntimeState();

        BH.setMsg(stopped.toUpperCase() + ' stopped');

        if (BH.render) BH.render();
    };

    BH.toggleAuto = function (templateId) {
        if (BH.activeAuto === templateId) {
            BH.stopAuto();
        } else {
            BH.startAuto(templateId);
        }
    };

    // =========================================================
    // SET CLICK DELAY
    // =========================================================

    BH.setTemplateClickDelay = function (templateId, ms) {
        const options = BH.loadTemplateOptions(templateId);
        options.clickDelay = ms;
        BH.saveTemplateOptions(templateId, options);

        if (BH.render) BH.render();
    };

    BH.getTemplateClickDelay = function (templateId) {
        const template = BH.getTemplate(templateId);
        if (!template) return 500;

        const options = BH.loadTemplateOptions(templateId);
        return options.clickDelay || template.defaultClickDelay || 500;
    };

})(window);