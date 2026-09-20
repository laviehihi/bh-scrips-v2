// core/engine.js
// Runtime engine — gọi flow handler tương ứng

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // STATE
    // =========================================================

    BH.activeAuto = null;        // 'rerun' | 'pvp' | ... | null
    BH.activeTemplateId = null;
    BH.isClicking = false;
    BH.lastActionTime = 0;

    BH.checkTimerId = null;
    BH.autoStopTimerId = null;

    BH.AUTO_STOP_TIMEOUT = 3 * 60 * 1000;  // 3 phút real time

    // =========================================================
    // DO CHECK
    // =========================================================

    BH.doCheck = function () {
        if (!BH.activeAuto) return;

        const template = BH.getTemplate(BH.activeAuto);
        if (!template) return;

        const flowHandler = BH.FLOW_TYPES[template.flow.type];
        if (!flowHandler) {
            BH.setMsg('Flow type không hỗ trợ: ' + template.flow.type);
            return;
        }

        const matched = flowHandler(template, function (step) {
            const stepHandler = BH.STEP_TYPES[step.type || 'click'];
            if (!stepHandler) return;

            stepHandler.action(step);

            BH.lastActionTime = BH.rt.now();
            BH.setMsg(BH.nowTime() + ' • ' + step.label + ' → CLICK');
        });

        if (!matched) {
            // Không match step nào — có thể do chưa đủ người hoặc chưa có nút
            // Flow handler tự set msg rồi
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

        BH.activeAuto = templateId;
        BH.activeTemplateId = templateId;
        BH.lastActionTime = BH.rt.now();

        // Lấy interval từ options (user có thể đổi), fallback về default
        const options = BH.loadTemplateOptions(templateId);
        const interval = options.interval || template.defaultInterval;

        // Timer auto-stop
        BH.autoStopTimerId = BH.rt.setInterval(BH.checkAutoStop, 5000);

        // Timer check chính
        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, interval);

        // Check ngay lần đầu
        BH.doCheck();

        BH.setMsg(template.name + ' started · ' + (interval / 1000) + 's');
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

        BH.setMsg(stopped.toUpperCase() + ' stopped');
    };

    BH.toggleAuto = function (templateId) {
        if (BH.activeAuto === templateId) {
            BH.stopAuto();
        } else {
            BH.startAuto(templateId);
        }
    };

    // =========================================================
    // SET DELAY (interval) CHO TEMPLATE
    // =========================================================

    BH.setTemplateInterval = function (templateId, ms) {
        const options = BH.loadTemplateOptions(templateId);
        options.interval = ms;
        BH.saveTemplateOptions(templateId, options);

        // Nếu đang chạy template này → restart để áp dụng
        if (BH.activeAuto === templateId) {
            BH.stopAuto();
            BH.startAuto(templateId);
        }

        if (BH.render) BH.render();
    };

    BH.getTemplateInterval = function (templateId) {
        const template = BH.getTemplate(templateId);
        if (!template) return 3000;

        const options = BH.loadTemplateOptions(templateId);
        return options.interval || template.defaultInterval;
    };

})(window);