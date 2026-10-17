// core/engine.js
// Runtime engine — hỗ trợ screen detection, navigation, All Content.

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

    BH.currentScreen = null;
    BH.navigationPending = false;

    BH.allContentQueue = [];
    BH.allContentIndex = 0;
    BH.allContentRunning = false;
    BH.allCurrentActivity = null;
    BH.allState = 'navigate';
    BH._mainDetectedAt = 0;
    BH._extraClicksRunning = false;

    BH._activityOutOfTickets = false;
    BH._outOfTicketsHandling = false;

    // Flag: flow đã click returnHome
    BH._flowReturnHomeClicked = false;

    // =========================================================
    // RESET RUNTIME STATE
    // =========================================================

    function resetRuntimeState() {
        BH.invaAutoCheckedAt = 0;
        BH.invaEscSent = false;
        BH.clickCooldownUntil = 0;
        BH.keypressSent = {};
        BH.waitStepDone = {};
        BH._mainDetectedAt = 0;
        BH._extraClicksRunning = false;
        BH._activityOutOfTickets = false;
        BH._outOfTicketsHandling = false;
        BH._flowReturnHomeClicked = false;

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
    // HANDLE OUT OF TICKETS
    // =========================================================

    function startOutOfTicketsHandling() {
        if (BH._outOfTicketsHandling) return;
        BH._outOfTicketsHandling = true;
        BH._activityOutOfTickets = true;

        BH.handleOutOfTickets(function (success) {
            BH._outOfTicketsHandling = false;

            if (BH.activeAuto === 'all') {
                BH.allState = 'next';
                BH._activityOutOfTickets = false;
            } else {
                BH.stopAuto();
                BH.setMsg('⚠ Hết vé — dừng bot');
            }
        });
    }

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

        if (BH.activeAuto === 'all') {
            runAllContentTick();
            return;
        }

        const template = BH.getTemplate(BH.activeAuto);
        if (!template) return;

        if (BH.detectPopup && !BH.navigationPending && !BH._outOfTicketsHandling) {
            const popup = BH.detectPopup();

            if (popup === 'outOfTickets') {
                startOutOfTicketsHandling();
                return;
            }

            if (popup === 'leave') {
                if (BH.getScreenRegion('popup_leave_yes')) {
                    BH.clickRegion('popup_leave_yes');
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

        if (BH._activityOutOfTickets) return;

        if (BH.screens && Object.keys(BH.screens).length > 0 && !BH.navigationPending) {
            const screen = BH.detectScreen();
            BH.currentScreen = screen;

            if (screen === 'main' && BH.activeAuto && BH.ACTIVITY_MAP[BH.activeAuto]) {
                BH.navigationPending = true;

                BH.navigateToActivity(BH.activeAuto, function (success) {
                    BH.navigationPending = false;

                    if (!success) {
                        BH.setMsg('⚠ Không vào được ' + BH.activeAuto);
                        return;
                    }

                    const map = BH.ACTIVITY_MAP[BH.activeAuto];
                    if (map && map.clicks && map.clicks.length > 0) {
                        BH.doClickSequence(map.clicks, function () {
                            BH.setMsg('✓ Đã vào ' + BH.activeAuto);
                        });
                    }
                });

                return;
            }
        }

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
    // ALL CONTENT
    // =========================================================

    BH.ALL_CONTENT_DEFAULT = [
        'dungeon',
        'pvp',
        'invasion',
        'expedition',
        'gvp',
        'trials',
        'gauntlet',
        'wb',
        'raid'
    ];

    BH.startAllContent = function () {
        if (BH.activeAuto) BH.stopAuto();

        BH.loadScreens();

        const queue = BH.ALL_CONTENT_DEFAULT.filter(function (id) {
            const map = BH.ACTIVITY_MAP[id];
            if (!map) return false;
            return !!BH.getScreenRegion(map.icon);
        });

        if (queue.length === 0) {
            BH.setMsg('⚠ Chưa chụp icon hoạt động nào');
            return;
        }

        BH.allContentQueue = queue;
        BH.allContentIndex = 0;
        BH.allContentRunning = true;
        BH.allCurrentActivity = queue[0];
        BH.allState = 'navigate';
        BH._mainDetectedAt = 0;
        BH._extraClicksRunning = false;
        BH._activityOutOfTickets = false;
        BH._outOfTicketsHandling = false;
        BH._flowReturnHomeClicked = false;

        BH.activeAuto = 'all';
        BH.lastActionTime = BH.rt.now();

        resetRuntimeState();

        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, SCAN_INTERVAL);

        BH.overlayState = 'compact';

        BH.setMsg('All: ' + queue.join(' → '));

        if (BH.render) BH.render();
    };

    function runAllContentTick() {
        if (!BH.allContentRunning) return;

        if (BH.detectPopup && !BH.navigationPending && !BH._outOfTicketsHandling) {
            const popup = BH.detectPopup();

            if (popup === 'outOfTickets') {
                BH.setMsg('⚠ ' + BH.allCurrentActivity + ' hết vé');
                startOutOfTicketsHandling();
                return;
            }

            if (popup === 'leave') {
                if (BH.getScreenRegion('popup_leave_yes')) {
                    BH.clickRegion('popup_leave_yes');
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
        if (BH._outOfTicketsHandling) return;
        if (BH._activityOutOfTickets) return;

        const currentActivity = BH.allContentQueue[BH.allContentIndex];
        if (!currentActivity) {
            BH.stopAuto();
            BH.setMsg('✓ All Content xong');
            return;
        }

        // ===== NAVIGATE =====
        if (BH.allState === 'navigate') {
            const screen = BH.detectScreen();
            BH.currentScreen = screen;

            if (screen === 'main') {
                BH.navigationPending = true;
                BH.setMsg('→ ' + currentActivity);

                BH.navigateToActivity(currentActivity, function (success) {
                    BH.navigationPending = false;

                    if (!success) {
                        BH.setMsg('⚠ Không vào được ' + currentActivity);
                        BH.allState = 'next';
                        return;
                    }

                    BH.allCurrentActivity = currentActivity;
                    if (BH.render) BH.render();

                    const map = BH.ACTIVITY_MAP[currentActivity];
                    if (map && map.clicks && map.clicks.length > 0) {
                        BH.allState = 'extra_clicks';
                    } else {
                        BH.allState = 'flow';
                    }
                });
                return;
            }

            return;
        }

        // ===== EXTRA CLICKS =====
        if (BH.allState === 'extra_clicks') {
            const map = BH.ACTIVITY_MAP[currentActivity];
            if (!map || !map.clicks) {
                BH.allState = 'flow';
                return;
            }

            if (BH._extraClicksRunning) return;
            BH._extraClicksRunning = true;

            BH.doClickSequence(map.clicks, function (success) {
                BH._extraClicksRunning = false;

                if (!success) {
                    BH.setMsg('⚠ Click fail ' + currentActivity);
                    BH.allState = 'next';
                    return;
                }

                BH.rt.setTimeout(function () {
                    BH.allState = 'flow';
                }, 2000);
            });
            return;
        }

        // ===== FLOW =====
        if (BH.allState === 'flow') {
            const map = BH.ACTIVITY_MAP[currentActivity];
            const templateId = (map && map.templateId) ? map.templateId : currentActivity;
            const template = BH.getTemplate(templateId);

            if (!template) {
                BH.setMsg('⚠ Không có template ' + templateId);
                BH.allState = 'next';
                return;
            }

            const flowHandler = BH.FLOW_TYPES[template.flow.type];
            if (!flowHandler) {
                BH.setMsg('⚠ Không có flow ' + template.flow.type);
                BH.allState = 'next';
                return;
            }

            const options = BH.loadTemplateOptions(templateId);
            const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

            flowHandler(template, function (step) {
                const stepHandler = BH.STEP_TYPES[step.type || 'click'];
                if (!stepHandler) return;
                stepHandler.action(step, clickDelay);
            });

            // Next khi click returnHome thành công
            if (BH._flowReturnHomeClicked) {
                BH._flowReturnHomeClicked = false;
                BH.allState = 'next';
            }
            return;
        }

        // ===== NEXT =====
        if (BH.allState === 'next') {
            BH.allContentIndex++;

            if (BH.allContentIndex >= BH.allContentQueue.length) {
                BH.stopAuto();
                BH.setMsg('✓ All Content xong');
                return;
            }

            BH.allState = 'navigate';
            BH._mainDetectedAt = 0;
            BH._extraClicksRunning = false;
            BH._activityOutOfTickets = false;
            BH._outOfTicketsHandling = false;
            BH._flowReturnHomeClicked = false;
            BH.lastActionTime = BH.rt.now();
            BH.setMsg('→ ' + BH.allContentQueue[BH.allContentIndex]);
            if (BH.render) BH.render();
            return;
        }
    }

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

        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, SCAN_INTERVAL);

        BH.doCheck();

        BH.overlayState = 'compact';

        BH.setMsg(template.name + ' started');

        if (BH.render) BH.render();
    };

    BH.stopAuto = function () {
        if (!BH.activeAuto) return;

        const stopped = BH.activeAuto;
        BH.activeAuto = null;

        BH.allContentRunning = false;
        BH.allContentQueue = [];
        BH.allContentIndex = 0;
        BH.allCurrentActivity = null;
        BH.allState = 'navigate';
        BH.navigationPending = false;
        BH._mainDetectedAt = 0;
        BH._extraClicksRunning = false;
        BH._activityOutOfTickets = false;
        BH._outOfTicketsHandling = false;
        BH._flowReturnHomeClicked = false;

        if (BH.checkTimerId !== null) {
            BH.rt.clearInterval(BH.checkTimerId);
            BH.checkTimerId = null;
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