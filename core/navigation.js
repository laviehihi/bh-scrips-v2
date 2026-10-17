// core/navigation.js
// Điều hướng giữa các màn hình.

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // ACTIVITY MAP
    // =========================================================

    BH.ACTIVITY_MAP = {
        dungeon: { templateId: 'rerun', icon: 'icon_dungeon', text: 'text_dungeon', clicks: ['dungeon_click1', 'dungeon_click2', 'dungeon_click3'] },
        pvp: { templateId: 'pvp', icon: 'icon_pvp', text: 'text_pvp', clicks: null },
        wb: { templateId: 'wb', icon: 'icon_wb', text: 'text_wb', clicks: ['wb_click1', 'wb_click2', 'wb_click3'] },
        raid: { templateId: 'rerun', icon: 'icon_raid', text: 'text_raid', clicks: ['raid_click1', 'raid_click2', 'raid_click3'] },
        invasion: { templateId: 'inva', icon: 'icon_invasion', text: 'text_invasion', clicks: null },
        expedition: { templateId: 'expedition', icon: 'icon_expedition', text: 'text_expedition', clicks: null },
        gvp: { templateId: 'gvp', icon: 'icon_gvp', text: 'text_gvp', clicks: null },
        trials: { templateId: 'tg', icon: 'icon_trials', text: 'text_trials', clicks: null },
        gauntlet: { templateId: 'tg', icon: 'icon_gauntlet', text: 'text_gauntlet', clicks: null }
    };

    // =========================================================
    // NAVIGATE TO ACTIVITY
    // =========================================================

    BH.navigateToActivity = function (activityId, callback) {
        const map = BH.ACTIVITY_MAP[activityId];
        if (!map) {
            if (callback) callback(false, 'No mapping: ' + activityId);
            return;
        }

        if (!BH.isMainScreen()) {
            if (callback) callback(false, 'Not on main screen');
            return;
        }

        const pos = BH.getScreenRegion(map.icon);
        if (!pos) {
            if (callback) callback(false, 'Missing pos: ' + map.icon);
            return;
        }

        const cx = pos.bufX + Math.floor(pos.width / 2);
        const cy = pos.bufY + Math.floor(pos.height / 2);

        const expectedActive = BH.activeAuto;

        BH.clickAtBuf(cx, cy);
        BH.setMsg('Click icon ' + activityId);

        // Chỉ callback nếu bot còn chạy (không check allCurrentActivity để tránh nuốt callback)
        function safeCallback(success, reason) {
            if (BH.activeAuto === null) return;
            if (BH.activeAuto !== expectedActive) return;
            if (callback) callback(success, reason);
        }

        // Fallback: chưa chụp text → tin click sau 2s
        const textRegionId = map.text;
        if (!textRegionId || !BH.getScreenRegion(textRegionId)) {
            BH.rt.setTimeout(function () {
                safeCallback(true);
            }, 2000);
            return;
        }

        // Verify bằng text: poll 300ms, tối đa 5s
        const startTime = BH.rt.now();
        const maxWait = 5000;
        const interval = 300;

        function poll() {
            if (BH.activeAuto !== expectedActive) return;

            if (BH.matchRegion(textRegionId)) {
                safeCallback(true);
                return;
            }

            if (BH.rt.now() - startTime >= maxWait) {
                BH.setMsg('⚠ Không vào được ' + activityId);
                safeCallback(false, 'Text not matched');
                return;
            }

            BH.rt.setTimeout(poll, interval);
        }

        BH.rt.setTimeout(poll, interval);
    };

    // =========================================================
    // RETURN TO MAIN
    // =========================================================

    BH.returnToMain = function (callback) {
        if (BH.isMainScreen()) {
            if (callback) callback(true);
            return;
        }

        BH.setMsg('Chờ về màn chính...');

        let attempts = 0;
        const maxAttempts = 20;

        const timer = BH.rt.setInterval(function () {
            attempts++;

            if (BH.isMainScreen()) {
                BH.rt.clearInterval(timer);
                if (callback) callback(true);
                return;
            }

            if (attempts >= maxAttempts) {
                BH.rt.clearInterval(timer);
                if (callback) callback(false, 'Không về được màn chính');
            }
        }, 500);
    };

    // =========================================================
    // CLICK SEQUENCE
    // - Không timeout nếu đã click được ≥1 (tránh bỏ dở giữa chừng)
    // - Chỉ timeout nếu chưa click được gì sau 20s (region chưa chụp / không match)
    // =========================================================

    BH.doClickSequence = function (regionIds, callback) {
        let index = 0;
        let skippedCount = 0;
        let clickedCount = 0;

        const startTime = BH.rt.now();
        const TIMEOUT_EMPTY = 20000;

        function next() {
            // Timeout chỉ khi chưa click được gì
            if (clickedCount === 0 && BH.rt.now() - startTime > TIMEOUT_EMPTY) {
                BH.setMsg('⚠ Không click được nút nào');
                if (callback) callback(false, 'Timeout no clicks');
                return;
            }

            if (index >= regionIds.length) {
                if (clickedCount === 0 && skippedCount >= regionIds.length) {
                    if (callback) callback(false, 'All regions missing');
                    return;
                }
                if (callback) callback(true);
                return;
            }

            const regionId = regionIds[index];

            if (!BH.getScreenRegion(regionId)) {
                skippedCount++;
                index++;
                BH.rt.setTimeout(next, 300);
                return;
            }

            if (BH.matchRegion(regionId)) {
                BH.clickRegion(regionId);
                clickedCount++;
                BH.setMsg('Click ' + (index + 1) + '/' + regionIds.length + ': ' + regionId);
                index++;
                BH.rt.setTimeout(next, 2000);
            } else {
                BH.rt.setTimeout(next, 500);
            }
        }

        next();
    };

    // =========================================================
    // HANDLE OUT OF TICKETS
    // ESC liên tục → về main
    // CHỈ gọi khi thực sự hết vé (popup_outOfTickets đã match)
    // =========================================================

    BH.handleOutOfTickets = function (callback) {
        BH.setMsg('⚠ Hết vé — ESC về màn chính');

        let escCount = 0;
        const maxEsc = 12;

        const expectedActive = BH.activeAuto;

        function safeCallback(success, reason) {
            if (BH.activeAuto === null) return;
            if (BH.activeAuto !== expectedActive) return;
            if (callback) callback(success, reason);
        }

        function step() {
            if (BH.activeAuto !== expectedActive) return;

            if (BH.isMainScreen()) {
                BH.setMsg('✓ Đã về màn chính');
                safeCallback(true);
                return;
            }

            if (escCount >= maxEsc) {
                safeCallback(false, 'ESC quá nhiều lần');
                return;
            }

            // Nếu popup leave đang hiện → click Yes
            if (BH.matchRegion('popup_leave')) {
                if (BH.getScreenRegion('popup_leave_yes')) {
                    BH.clickRegion('popup_leave_yes');
                    BH.setMsg('Click Yes thoát popup');

                    BH.rt.setTimeout(function () {
                        if (BH.activeAuto !== expectedActive) return;
                        if (BH.isMainScreen()) {
                            safeCallback(true);
                            return;
                        }
                        step();
                    }, 2000);
                    return;
                }
            }

            escCount++;
            BH.dispatchKeyPress('Escape');
            BH.setMsg('ESC lần ' + escCount);

            BH.rt.setTimeout(function () {
                if (BH.activeAuto !== expectedActive) return;
                if (BH.isMainScreen()) {
                    safeCallback(true);
                    return;
                }
                step();
            }, 2000);
        }

        step();
    };

    // =========================================================
    // DETECT POPUP
    // =========================================================

    BH.detectPopup = function () {
        if (BH.matchRegion('popup_outOfTickets')) return 'outOfTickets';
        if (BH.matchRegion('popup_leave')) return 'leave';
        if (BH.matchRegion('popup_confirm')) return 'confirm';
        return null;
    };

})(window);