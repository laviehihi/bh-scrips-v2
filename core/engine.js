// core/engine.js
// Runtime engine — hỗ trợ screen detection, navigation, All Content.

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const SCAN_INTERVAL = 300;

    // =========================================================
    // STATE
    // =========================================================

    BH.activeAuto = null;          // templateId hoặc 'all'
    BH.activeTemplateId = null;
    BH.lastActionTime = 0;

    BH.checkTimerId = null;
    BH.autoStopTimerId = null;

    BH.AUTO_STOP_TIMEOUT = 3 * 60 * 1000;

    // Navigation state
    BH.currentScreen = null;
    BH.navigationPending = false;

    // All Content state
    BH.allContentQueue = [];
    BH.allContentIndex = 0;
    BH.allContentRunning = false;

    // =========================================================
    // RESET RUNTIME STATE
    // =========================================================

    function resetRuntimeState() {
        BH.invaAutoCheckedAt = 0;
        BH.invaEscSent = false;
        BH.clickCooldownUntil = 0;
        BH.keypressSent = {};
        BH.waitStepDone = {};

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
    // IS TEMPLATE READY
    // =========================================================

    BH.isTemplateReady = function (templateId) {
        const template = BH.getTemplate(templateId);
        if (!template) return false;

        BH.loadCalibration(templateId);

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            if (step.required && step.calibrated) {
                return true;
            }
        }

        for (let i = 0; i < template.steps.length; i++) {
            if (template.steps[i].calibrated) {
                return true;
            }
        }

        return false;
    };

    // =========================================================
    // DO CHECK
    // =========================================================

    BH.doCheck = function () {
        if (!BH.activeAuto) return;
        if (BH.isSetupLock) return;
        if (BH.screensSetupMode) return;

        if (BH.clickCooldownUntil && BH.rt.now() < BH.clickCooldownUntil) {
            return;
        }

        // ===== All Content mode =====
        if (BH.activeAuto === 'all') {
            runAllContentTick();
            return;
        }

        // ===== Single template mode =====
        const template = BH.getTemplate(BH.activeAuto);
        if (!template) return;

        // Check popup trước
        if (BH.detectPopup && !BH.navigationPending) {
            const popup = BH.detectPopup();

            if (popup === 'outOfTickets') {
                BH.handleOutOfTickets(function (success) {
                    if (!success) {
                        BH.stopAuto();
                    }
                });
                return;
            }

            if (popup === 'leave') {
                // Click Yes thoát
                if (BH.matchRegion('popup_leave')) {
                    BH.clickRegion('popup_leave');
                }
                return;
            }

            if (popup === 'confirm') {
                // Click Yes confirm
                if (BH.matchRegion('popup_confirm')) {
                    BH.clickRegion('popup_confirm');
                }
                return;
            }
        }

        // Check screen — nếu không phải màn đúng → navigate
        if (BH.screens && Object.keys(BH.screens).length > 0 && !BH.navigationPending) {
            const screen = BH.detectScreen();
            BH.currentScreen = screen;

            if (screen === 'main' && BH.activeAuto && BH.ACTIVITY_MAP[BH.activeAuto]) {
                // Đang ở màn chính → navigate đến activity
                BH.navigationPending = true;

                BH.navigateToActivity(BH.activeAuto, function (success) {
                    BH.navigationPending = false;

                    if (!success) {
                        BH.setMsg('⚠ Không vào được ' + BH.activeAuto);
                    }
                });

                return;
            }
        }

        // Chạy flow
        const flowHandler = BH.FLOW_TYPES[template.flow.type];
        if (!flowHandler) {
            BH.setMsg('Flow type không hỗ trợ: ' + template.flow.type);
            return;
        }

        const options = BH.loadTemplateOptions(template.id);
        const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

        flowHandler(template, function (step) {
            const stepHandler = BH.STEP_TYPES[step.type || 'click'];
            if (!stepHandler) return;

            stepHandler.action(step, clickDelay);
        });
    };

    // =========================================================
    // ALL CONTENT — chạy tuần tự các activity
    // =========================================================

    BH.ALL_CONTENT_DEFAULT = ['pvp', 'wb', 'raid', 'dungeon', 'invasion', 'expedition', 'gvp', 'trials', 'gauntlet'];

    BH.startAllContent = function () {
        if (BH.activeAuto) {
            BH.stopAuto();
        }

        // Lấy danh sách activity có setup icon
        const queue = BH.ALL_CONTENT_DEFAULT.filter(function (id) {
            const map = BH.ACTIVITY_MAP[id];
            if (!map) return false;
            return !!BH.getScreenRegion(map.icon);
        });

        if (queue.length === 0) {
            BH.setMsg('⚠ Chưa chụp icon hoạt động nào');
            return;
        }

        BH.loadScreens();

        BH.allContentQueue = queue;
        BH.allContentIndex = 0;
        BH.allContentRunning = true;

        BH.activeAuto = 'all';
        BH.lastActionTime = BH.rt.now();

        resetRuntimeState();

        BH.autoStopTimerId = BH.rt.setInterval(BH.checkAutoStop, 5000);
        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, SCAN_INTERVAL);

        BH.overlayState = 'compact';

        BH.setMsg('All Content: ' + queue.join(' → '));

        if (BH.render) BH.render();
    };

    function runAllContentTick() {
        if (!BH.allContentRunning) return;

        // Check popup
        if (BH.detectPopup && !BH.navigationPending) {
            const popup = BH.detectPopup();

            if (popup === 'outOfTickets') {
                BH.handleOutOfTickets(function (success) {
                    if (!success) {
                        nextActivity('hết vé');
                    }
                });
                return;
            }

            if (popup === 'leave') {
                if (BH.matchRegion('popup_leave')) {
                    BH.clickRegion('popup_leave');
                }
                return;
            }

            if (popup === 'confirm') {
                if (BH.matchRegion('popup_confirm')) {
                    BH.clickRegion('popup_confirm');
                }
                return;
            }
        }

        if (BH.navigationPending) return;

        const currentActivity = BH.allContentQueue[BH.allContentIndex];
        if (!currentActivity) {
            // Hết queue
            BH.stopAuto();
            BH.setMsg('✓ All Content xong');
            return;
        }

        const screen = BH.detectScreen();
        BH.currentScreen = screen;

        // Nếu đang ở màn chính → navigate đến activity hiện tại
        if (screen === 'main') {
            BH.navigationPending = true;

            BH.navigateToActivity(currentActivity, function (success) {
                BH.navigationPending = false;

                if (!success) {
                    BH.setMsg('⚠ Không vào được ' + currentActivity + ' → skip');
                    nextActivity('navigate fail');
                } else {
                    // Nếu là WB → chạy 3 click trước
                    if (currentActivity === 'wb') {
                        BH.doWBClicks(function () {
                            startActivityFlow(currentActivity);
                        });
                    } else if (currentActivity === 'raid') {
                        BH.doRaidClicks(function () {
                            startActivityFlow(currentActivity);
                        });
                    } else if (currentActivity === 'dungeon') {
                        BH.doDungeonClicks(function () {
                            startActivityFlow(currentActivity);
                        });
                    } else {
                        startActivityFlow(currentActivity);
                    }
                }
            });

            return;
        }

        // Đang ở màn activity → chạy flow
        if (screen === currentActivity) {
            const template = BH.getTemplate(currentActivity);
            if (!template) {
                nextActivity('no template');
                return;
            }

            const flowHandler = BH.FLOW_TYPES[template.flow.type];
            if (!flowHandler) {
                nextActivity('no flow');
                return;
            }

            const options = BH.loadTemplateOptions(template.id);
            const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

            flowHandler(template, function (step) {
                const stepHandler = BH.STEP_TYPES[step.type || 'click'];
                if (!stepHandler) return;
                stepHandler.action(step, clickDelay);
            });
        }
    }

    function startActivityFlow(activityId) {
        // Đánh dấu đã vào activity, chờ flow chạy
        BH.setMsg('▶ ' + activityId);
    }

    function nextActivity(reason) {
        BH.allContentIndex++;

        if (BH.allContentIndex >= BH.allContentQueue.length) {
            BH.stopAuto();
            BH.setMsg('✓ All Content xong');
            return;
        }

        BH.setMsg('→ ' + BH.allContentQueue[BH.allContentIndex] + ' (' + reason + ')');
        BH.lastActionTime = BH.rt.now();
    }

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
        BH.loadScreens();

        resetRuntimeState();

        BH.activeAuto = templateId;
        BH.activeTemplateId = templateId;
        BH.lastActionTime = BH.rt.now();

        BH.autoStopTimerId = BH.rt.setInterval(BH.checkAutoStop, 5000);
        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, SCAN_INTERVAL);

        BH.doCheck();

        const options = BH.loadTemplateOptions(templateId);
        const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

        BH.overlayState = 'compact';

        BH.setMsg(template.name + ' started · scan 0.3s · click delay ' + (clickDelay / 1000) + 's');

        if (BH.render) BH.render();
    };

    BH.stopAuto = function () {
        if (!BH.activeAuto) return;

        const stopped = BH.activeAuto;
        BH.activeAuto = null;

        BH.allContentRunning = false;
        BH.allContentQueue = [];
        BH.allContentIndex = 0;
        BH.navigationPending = false;

        if (BH.checkTimerId !== null) {
            BH.rt.clearInterval(BH.checkTimerId);
            BH.checkTimerId = null;
        }

        if (BH.autoStopTimerId !== null) {
            BH.rt.clearInterval(BH.autoStopTimerId);
            BH.autoStopTimerId = null;
        }

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
    // HOTKEY TOGGLE
    // =========================================================

    BH.toggleByHotkey = function (key) {
        // Phím 8 → All Content
        if (key === '8') {
            if (BH.activeAuto === 'all') {
                BH.stopAuto();
            } else {
                BH.startAllContent();
            }
            return;
        }

        const found = BH.getTemplateByHotkey(key);
        if (!found) return;

        const template = found.template;
        const isTeam = found.isTeam;

        if (BH.setupMode) BH.exitSetupMode();
        if (BH.screensSetupMode) BH.exitScreensSetup();

        if (BH.activeAuto === template.id) {
            BH.stopAuto();
            return;
        }

        if (BH.activeAuto) {
            BH.stopAuto();
        }

        BH.activeTemplateId = template.id;
        BH.saveActiveTemplate(template.id);

        if (template.id === 'wb') {
            const opts = BH.loadTemplateOptions('wb');
            if (isTeam) {
                if (!opts.partySize || opts.partySize === 1) {
                    opts.partySize = 2;
                }
            } else {
                opts.partySize = 1;
            }
            BH.saveTemplateOptions('wb', opts);
        }

        if (!BH.isTemplateReady(template.id)) {
            BH.setMsg('⚠ ' + template.name + ' chưa setup');
            if (BH.render) BH.render();
            return;
        }

        BH.startAuto(template.id);
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