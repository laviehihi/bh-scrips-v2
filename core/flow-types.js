// core/flow-types.js
// Định nghĩa các loại flow

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.FLOW_TYPES = {};

    // =========================================================
    // SEQUENTIAL
    // =========================================================

    BH.FLOW_TYPES.sequential = function (template, onMatch) {
        const order = template.flow.order || [];

        for (let i = 0; i < order.length; i++) {
            const step = BH.getStep(template, order[i]);
            if (!step) continue;
            if (!step.calibrated) continue;

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                onMatch(step);
                return true;
            }
        }

        return false;
    };

    // =========================================================
    // WB
    // =========================================================

    BH.FLOW_TYPES.wb = function (template, onMatch) {
        const options = BH.loadTemplateOptions(template.id);
        const partySize = options.partySize || 1;
        BH.wbPartySize = partySize;

        if (partySize === 1) {
            BH.wbCurrentPlayers = 1;
            return checkNonSlotSteps(template, onMatch);
        }

        const startStep = BH.getStep(template, 'start');
        const readyStep = BH.getStep(template, 'ready');

        let startVisible = false;
        let readyVisible = false;

        if (startStep && startStep.calibrated) {
            const handler = BH.STEP_TYPES[startStep.type || 'click'];
            if (handler && handler.check(startStep)) {
                startVisible = true;
            }
        }

        if (readyStep && readyStep.calibrated) {
            const handler = BH.STEP_TYPES[readyStep.type || 'click'];
            if (handler && handler.check(readyStep)) {
                readyVisible = true;
            }
        }

        if (!startVisible && !readyVisible) {
            return checkNonSlotSteps(template, onMatch);
        }

        const currentPlayers = BH.countWBPlayers(template);
        BH.wbCurrentPlayers = currentPlayers;

        if (currentPlayers < partySize) {
            BH.setMsg('Chờ member (' + currentPlayers + '/' + partySize + ')');
            return false;
        }

        return checkNonSlotSteps(template, onMatch);
    };

    function checkNonSlotSteps(template, onMatch) {
        const order = template.flow.order || [];

        for (let i = 0; i < order.length; i++) {
            const step = BH.getStep(template, order[i]);
            if (!step) continue;
            if (!step.calibrated) continue;
            if (step.type === 'slot') continue;

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                onMatch(step);
                return true;
            }
        }

        return false;
    }

    // =========================================================
    // COUNT WB PLAYERS
    // =========================================================

    BH.countWBPlayers = function (template) {
        const canvas = BH.getCanvas();
        if (!canvas || canvas.width === 0 || canvas.height === 0) return 0;

        const disabledHex = template.config.disabledHex;
        const tol = template.config.tol || 15;
        let count = 0;

        for (let i = 0; i < template.steps.length; i++) {
            const step = template.steps[i];
            if (step.type !== 'slot') continue;
            if (!step.calibrated) continue;

            const pixel = BH.readPixelAtBuf(step.x, step.y);
            if (!pixel) continue;

            if (BH.matchHex(pixel, disabledHex, tol)) continue;
            if (BH.matchHex(pixel, step.hex, step.tol || tol)) continue;

            count++;
        }

        return count;
    };

    // =========================================================
    // INVA
    // =========================================================

    BH.FLOW_TYPES.inva = function (template, onMatch) {
        const options = BH.loadTemplateOptions(template.id);
        const duration = options.duration || 10;

        // Reset state lần đầu
        if (BH.invaAutoCheckedAt == null) {
            BH.invaAutoCheckedAt = 0;
            BH.invaEscSent = false;
        }

        // Phase 1: chưa check auto → check steps trước auto
        if (!BH.invaAutoCheckedAt) {
            const beforeAuto = ['start', 'confirmTeam', 'yesNo'];

            for (let i = 0; i < beforeAuto.length; i++) {
                const step = BH.getStep(template, beforeAuto[i]);
                if (!step) continue;
                if (!step.calibrated) continue;

                const handler = BH.STEP_TYPES[step.type || 'click'];
                if (!handler) continue;

                if (handler.check(step)) {
                    // Reset state khi bắt đầu vòng mới
                    if (step.id === 'start') {
                        BH.invaAutoCheckedAt = 0;
                        BH.invaEscSent = false;
                    }

                    onMatch(step);

                    // Sau khi click confirmTeam hoặc yesNo → đợi 1s rồi check auto
                    if (step.id === 'confirmTeam' || step.id === 'yesNo') {
                        BH.rt.setTimeout(function () {
                            if (BH.activeAuto === template.id) {
                                checkAutoAndStartTimer(template);
                            }
                        }, 1000);
                    }

                    return true;
                }
            }

            return false;
        }

        // Phase 2: đã check auto → đếm X giây
        const elapsed = BH.rt.now() - BH.invaAutoCheckedAt;

        if (elapsed < duration * 1000) {
            const remain = Math.ceil((duration * 1000 - elapsed) / 1000);
            BH.setMsg('Auto đang chạy... còn ' + remain + 's');
            return false;
        }

        // Phase 3: hết X giây → gửi ESC
        if (!BH.invaEscSent) {
            BH.dispatchKeyPress('Escape');
            BH.invaEscSent = true;
            BH.setMsg('Đã gửi ESC — chờ popup');

            BH.rt.setTimeout(function () {
                if (BH.activeAuto === template.id) {
                    BH.doCheck();
                }
            }, 1000);

            return true;
        }

        // Phase 4: sau ESC → check yesLeave, returnHome
        const afterEsc = ['yesLeave', 'returnHome'];

        for (let i = 0; i < afterEsc.length; i++) {
            const step = BH.getStep(template, afterEsc[i]);
            if (!step) continue;
            if (!step.calibrated) continue;

            const handler = BH.STEP_TYPES[step.type || 'click'];
            if (!handler) continue;

            if (handler.check(step)) {
                onMatch(step);

                if (step.id === 'returnHome') {
                    BH.rt.setTimeout(function () {
                        BH.invaAutoCheckedAt = 0;
                        BH.invaEscSent = false;
                    }, 3000);
                }

                return true;
            }
        }

        return false;
    };

    // =========================================================
    // CHECK AUTO AND START TIMER
    // =========================================================

    function checkAutoAndStartTimer(template) {
        const autoStep = BH.getStep(template, 'autoInGame');

        if (autoStep && autoStep.calibrated) {
            const pixel = BH.readPixelAtBuf(autoStep.x, autoStep.y);
            const tol = autoStep.tol || 15;

            if (pixel && BH.matchHex(pixel, autoStep.hex, tol)) {
                // Auto đang tắt → click để bật
                BH.clickAtBuf(autoStep.x, autoStep.y);
                BH.setMsg('Đã bật auto');
            } else {
                BH.setMsg('Auto đã bật sẵn — bắt đầu đếm');
            }
        } else {
            BH.setMsg('Auto chưa setup — bỏ qua');
        }

        // Bắt đầu đếm dù có click hay không
        BH.invaAutoCheckedAt = BH.rt.now();

        if (BH.render) BH.render();
    }

    // =========================================================
    // GET STEP
    // =========================================================

    BH.getStep = function (template, stepId) {
        if (!template || !template.steps) return null;
        for (let i = 0; i < template.steps.length; i++) {
            if (template.steps[i].id === stepId) return template.steps[i];
        }
        return null;
    };

})(window);