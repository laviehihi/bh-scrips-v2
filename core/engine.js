// core/engine.js
// Runtime engine

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const SCAN_INTERVAL = 300;

    // STATE
    BH.activeAuto = null;
    BH.activeTemplateId = null;
    BH.lastActionTime = 0;
    BH.checkTimerId = null;
    BH.currentScreen = null;
    BH.navigationPending = false;
    BH._navigatedForActivity = false;

    BH.allContentQueue = [];
    BH.allContentIndex = 0;
    BH.allContentRunning = false;
    BH.allCurrentActivity = null;
    BH.allState = 'navigate';
    BH._mainDetectedAt = 0;
    BH._extraClicksRunning = false;
    BH._activityOutOfTickets = false;
    BH._outOfTicketsHandling = false;
    BH._navigatingBack = false;
    BH._navigateInFlight = false;
    BH._navigateStartTime = 0;
    BH._lastAllStateLog = '';

    // RESET
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
        BH._navigatedForActivity = false;
        BH._navigatingBack = false;
        BH._navigateInFlight = false;
        BH._navigateStartTime = 0;

        if (BH.clearPendingClick) BH.clearPendingClick();
    }

    // =========================================================
    // RESOLVE ACTIVITY ID FROM TEMPLATE ID
    // =========================================================

    function resolveActivityForTemplate(templateId) {
        if (templateId === 'inva') return 'invasion';
        if (templateId === 'rerun') return 'dungeon';

        if (templateId === 'tg') {
            if (BH.getScreenRegion('icon_trials')) return 'trials';
            if (BH.getScreenRegion('icon_gauntlet')) return 'gauntlet';
            return 'trials';
        }

        return templateId;
    }

    BH.resolveActivityForTemplate = resolveActivityForTemplate;

    // =========================================================
    // LOG STATE TRANSITION
    // =========================================================

    function setAllState(newState, reason) {
        if (BH.allState === newState) return;

        const old = BH.allState;
        BH.allState = newState;

        const act = BH.allCurrentActivity || '?';
        const idx = (BH.allContentIndex || 0) + 1;
        const total = (BH.allContentQueue && BH.allContentQueue.length) || 0;

        const logMsg = '[ALL] ' + idx + '/' + total + ' ' + act + ': ' + old + ' → ' + newState + (reason ? ' (' + reason + ')' : '');
        console.log(logMsg);

        BH._lastAllStateLog = logMsg;

        if (newState === 'navigate') {
            BH._navigateStartTime = BH.rt.now();
        }
    }

    // LOAD CALIBRATION
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

    // IS TEMPLATE READY
    BH.isTemplateReady = function (templateId) {
        const template = BH.getTemplate(templateId);
        if (!template) return false;

        BH.loadCalibration(templateId);

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            if (step.required && step.calibrated) return true;
        }

        for (let i = 0; i < template.steps.length; i++) {
            if (template.steps[i].calibrated) return true;
        }

        return false;
    };

    // OUT OF TICKETS
    function startOutOfTicketsHandling() {
        if (BH._outOfTicketsHandling) return;
        BH._outOfTicketsHandling = true;
        BH._activityOutOfTickets = true;

        BH.handleOutOfTickets(function (success) {
            BH._outOfTicketsHandling = false;

            if (BH.activeAuto === 'all') {
                if (success && BH.isMainScreen()) {
                    setAllState('next', 'outOfTickets');
                    BH._activityOutOfTickets = false;
                } else {
                    BH._activityOutOfTickets = false;
                    BH.setMsg('⚠ Không về được main — thử lại');
                }
            } else {
                BH.stopAuto();
                BH.setMsg('⚠ Hết vé — dừng bot');
            }
        });
    }

    // ENSURE MAIN SCREEN
    function ensureMainScreen(callback) {
        if (BH.isMainScreen()) {
            if (callback) callback(true);
            return;
        }

        BH.setMsg('Đang về màn chính...');

        let escCount = 0;
        const maxEsc = 5;

        function step() {
            if (escCount >= maxEsc) {
                if (callback) callback(false, 'Không về được màn chính');
                return;
            }

            if (BH.isMainScreen()) {
                if (callback) callback(true);
                return;
            }

            escCount++;
            BH.dispatchKeyPress('Escape');

            BH.rt.setTimeout(function () {
                if (BH.matchRegion('popup_leave')) {
                    if (BH.getScreenRegion('popup_leave_yes')) {
                        BH.clickRegion('popup_leave_yes');
                    }
                }
                step();
            }, 1500);
        }

        step();
    }

    // DO CHECK
    BH.doCheck = function () {
        if (!BH.activeAuto) return;
        if (BH.isSetupLock) return;
        if (BH.screensSetupMode) return;
        if (BH.clickCooldownUntil && BH.rt.now() < BH.clickCooldownUntil) return;

        if (BH.activeAuto === 'all') {
            runAllContentTick();
            return;
        }

        const template = BH.getTemplate(BH.activeAuto);
        if (!template) return;

        // Popup: outOfTickets và leave
        if (BH.detectPopup && !BH.navigationPending && !BH._outOfTicketsHandling) {
            const popup = BH.detectPopup();

            if (popup === 'outOfTickets') {
                startOutOfTicketsHandling();
                return;
            }

            if (popup === 'leave') {
                if (BH.getScreenRegion('popup_leave_yes')) BH.clickRegion('popup_leave_yes');
                return;
            }
        }

        if (BH._activityOutOfTickets) return;

        // Navigate 1 lần duy nhất
        if (!BH._navigatedForActivity && BH.screens && Object.keys(BH.screens).length > 0) {
            BH._navigatedForActivity = true;
            BH.navigationPending = true;

            const activityId = resolveActivityForTemplate(BH.activeAuto);

            ensureMainScreen(function (ok) {
                if (!ok) {
                    BH.navigationPending = false;
                    BH.setMsg('⚠ Không về được màn chính');
                    return;
                }

                BH.navigateToActivity(activityId, function (success) {
                    BH.navigationPending = false;

                    if (!success) {
                        BH.setMsg('⚠ Không vào được ' + activityId);
                        return;
                    }

                    const map = BH.ACTIVITY_MAP[activityId];
                    if (map && map.clicks && map.clicks.length > 0) {
                        BH.doClickSequence(map.clicks, function () {
                            BH.setMsg('✓ Đã vào ' + activityId);
                        });
                    }
                });
            });

            return;
        }

        // Flow
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

    // ALL CONTENT
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

        if (BH.setupMode && BH.exitSetupMode) BH.exitSetupMode();
        if (BH.screensSetupMode && BH.exitScreensSetup) BH.exitScreensSetup();

        BH.loadScreens();

        let mainIconCount = 0;
        for (let i = 0; i < BH.MAIN_ICONS.length; i++) {
            if (BH.getScreenRegion(BH.MAIN_ICONS[i])) mainIconCount++;
        }
        if (mainIconCount < 3) {
            BH.setMsg('⚠ Chưa chụp đủ icon màn chính (cần ≥3/' + BH.MAIN_ICONS.length + ')');
            if (BH.render) BH.render();
            return;
        }

        const queue = BH.ALL_CONTENT_DEFAULT.filter(function (id) {
            const map = BH.ACTIVITY_MAP[id];
            if (!map) return false;
            return !!BH.getScreenRegion(map.icon);
        });

        if (queue.length === 0) {
            BH.setMsg('⚠ Chưa chụp icon hoạt động nào');
            if (BH.render) BH.render();
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
        BH._navigatingBack = false;
        BH._navigateInFlight = false;
        BH._navigateStartTime = BH.rt.now();

        BH.activeAuto = 'all';
        BH.lastActionTime = BH.rt.now();

        resetRuntimeState();

        BH.checkTimerId = BH.rt.setInterval(BH.doCheck, SCAN_INTERVAL);

        BH.overlayState = 'compact';

        console.log('[ALL] Start queue:', queue.join(' → '));
        BH.setMsg('All: ' + queue.join(' → '));

        if (BH.render) BH.render();
    };

    function runAllContentTick() {
        if (!BH.allContentRunning) return;

        // Popup: outOfTickets và leave
        if (BH.detectPopup && !BH._navigateInFlight && !BH._outOfTicketsHandling) {
            const popup = BH.detectPopup();

            if (popup === 'outOfTickets') {
                BH.setMsg('⚠ ' + BH.allCurrentActivity + ' hết vé');
                startOutOfTicketsHandling();
                return;
            }

            if (popup === 'leave') {
                if (BH.getScreenRegion('popup_leave_yes')) BH.clickRegion('popup_leave_yes');
                return;
            }
        }

        if (BH._navigateInFlight) return;
        if (BH._outOfTicketsHandling) return;
        if (BH._activityOutOfTickets) return;

        const currentActivity = BH.allContentQueue[BH.allContentIndex];
        if (!currentActivity) {
            BH.stopAuto();
            BH.setMsg('✓ All Content xong');
            return;
        }

        // NAVIGATE
        if (BH.allState === 'navigate') {
            // Timeout cứng: nếu ở navigate quá 30s → bỏ qua
            if (BH._navigateStartTime && BH.rt.now() - BH._navigateStartTime > 30000) {
                BH.setMsg('⚠ Navigate timeout ' + currentActivity);
                console.log('[ALL] Navigate timeout:', currentActivity);
                setAllState('next', 'navigate timeout');
                return;
            }

            if (BH.clearPendingClick) BH.clearPendingClick();

            const screen = BH.detectScreen();
            BH.currentScreen = screen;

            if (screen === 'main') {
                BH._navigateInFlight = true;
                BH.setMsg('→ ' + currentActivity);

                BH.navigateToActivity(currentActivity, function (success) {
                    BH._navigateInFlight = false;

                    if (!success) {
                        BH.setMsg('⚠ Không vào được ' + currentActivity);
                        setAllState('next', 'navigate fail');
                        return;
                    }

                    BH.allCurrentActivity = currentActivity;
                    if (BH.render) BH.render();

                    if (currentActivity === 'invasion') {
                        BH.invaAutoCheckedAt = 0;
                        BH.invaEscSent = false;
                    }

                    const map = BH.ACTIVITY_MAP[currentActivity];
                    if (map && map.clicks && map.clicks.length > 0) {
                        setAllState('extra_clicks', 'nav ok');
                    } else {
                        setAllState('flow', 'nav ok');
                    }
                });
                return;
            }

            if (!BH._navigatingBack) {
                BH._navigatingBack = true;
                ensureMainScreen(function (ok) {
                    BH._navigatingBack = false;
                    if (!ok) {
                        setAllState('next', 'ensure main fail');
                    }
                });
            }
            return;
        }

        // EXTRA CLICKS
        if (BH.allState === 'extra_clicks') {
            const map = BH.ACTIVITY_MAP[currentActivity];
            if (!map || !map.clicks) {
                setAllState('flow', 'no clicks');
                return;
            }

            if (BH._extraClicksRunning) return;
            BH._extraClicksRunning = true;

            BH.doClickSequence(map.clicks, function (success) {
                BH._extraClicksRunning = false;

                if (!success) {
                    BH.setMsg('⚠ Click fail ' + currentActivity);
                    setAllState('next', 'clicks fail');
                    return;
                }

                BH.rt.setTimeout(function () {
                    if (BH.activeAuto === 'all') {
                        setAllState('flow', 'clicks done');
                    }
                }, 2000);
            });
            return;
        }

        // FLOW — loop liên tục cho đến khi hết vé
        if (BH.allState === 'flow') {
            // Clear pendingClick từ activity trước (phòng race)
            if (BH.clearPendingClick) BH.clearPendingClick();

            const map = BH.ACTIVITY_MAP[currentActivity];
            const templateId = (map && map.templateId) ? map.templateId : currentActivity;
            const template = BH.getTemplate(templateId);

            if (!template) {
                BH.setMsg('⚠ Không có template ' + templateId);
                setAllState('next', 'no template');
                return;
            }

            // Check template calibrated
            let anyCalibrated = false;
            for (let i = 0; i < template.steps.length; i++) {
                if (template.steps[i].calibrated) { anyCalibrated = true; break; }
            }
            if (!anyCalibrated) {
                BH.setMsg('⚠ Template ' + templateId + ' chưa setup');
                console.log('[ALL] Template not calibrated:', templateId);
                setAllState('next', 'template not setup');
                return;
            }

            const flowHandler = BH.FLOW_TYPES[template.flow.type];
            if (!flowHandler) {
                BH.setMsg('⚠ Không có flow ' + template.flow.type);
                setAllState('next', 'no flow');
                return;
            }

            const options = BH.loadTemplateOptions(templateId);
            const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

            const matched = flowHandler(template, function (step) {
                const stepHandler = BH.STEP_TYPES[step.type || 'click'];
                if (!stepHandler) return;
                stepHandler.action(step, clickDelay);
            });

            if (matched === false) {
                BH.setMsg('⏳ ' + currentActivity + ': chờ nút');
            }

            return;
        }

        // NEXT
        if (BH.allState === 'next') {
            if (BH.clearPendingClick) BH.clearPendingClick();

            BH.allContentIndex++;

            if (BH.allContentIndex >= BH.allContentQueue.length) {
                BH.stopAuto();
                BH.setMsg('✓ All Content xong');
                return;
            }

            BH._mainDetectedAt = 0;
            BH._extraClicksRunning = false;
            BH._activityOutOfTickets = false;
            BH._outOfTicketsHandling = false;
            BH._navigatingBack = false;
            BH._navigateInFlight = false;
            BH.lastActionTime = BH.rt.now();

            setAllState('navigate', 'next');

            BH.setMsg('→ ' + BH.allContentQueue[BH.allContentIndex]);
            if (BH.render) BH.render();
            return;
        }
    }

    // START / STOP
    BH.startAuto = function (templateId) {
        if (BH.activeAuto && BH.activeAuto !== templateId) BH.stopAuto();
        if (BH.activeAuto === templateId) { BH.stopAuto(); return; }

        const template = BH.getTemplate(templateId);
        if (!template) { BH.setMsg('Template không tồn tại: ' + templateId); return; }

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
        BH._navigatedForActivity = false;
        BH._navigatingBack = false;
        BH._navigateInFlight = false;
        BH._navigateStartTime = 0;

        if (BH.checkTimerId !== null) {
            BH.rt.clearInterval(BH.checkTimerId);
            BH.checkTimerId = null;
        }

        resetRuntimeState();
        BH.setMsg(stopped.toUpperCase() + ' stopped');

        if (BH.render) BH.render();
    };

    BH.toggleAuto = function (templateId) {
        if (BH.activeAuto === templateId) BH.stopAuto();
        else BH.startAuto(templateId);
    };

    // HOTKEY
    BH.toggleByHotkey = function (key) {
        if (key === '8') {
            if (BH.activeAuto === 'all') BH.stopAuto();
            else BH.startAllContent();
            return;
        }

        const found = BH.getTemplateByHotkey(key);
        if (!found) return;

        const template = found.template;
        const isTeam = found.isTeam;

        if (BH.setupMode) BH.exitSetupMode();
        if (BH.screensSetupMode) BH.exitScreensSetup();

        if (BH.activeAuto === template.id) { BH.stopAuto(); return; }
        if (BH.activeAuto) BH.stopAuto();

        BH.activeTemplateId = template.id;
        BH.saveActiveTemplate(template.id);

        if (template.id === 'wb') {
            const opts = BH.loadTemplateOptions('wb');
            if (isTeam) {
                if (!opts.partySize || opts.partySize === 1) opts.partySize = 2;
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

    // SET CLICK DELAY
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