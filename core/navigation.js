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
    // - Click icon, verify text
    // - Guard: nếu bot đã stop (activeAuto thay đổi) → không callback
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

        // Snapshot activeAuto tại thời điểm gọi
        const expectedActive = BH.activeAuto;
        const expectedActivity = BH.allCurrentActivity;

        BH.clickAtBuf(cx, cy);
        BH.setMsg('Click icon ' + activityId);

        // Helper: chỉ callback nếu bot còn chạy đúng activity này
        function safeCallback(success, reason) {
            if (BH.activeAuto !== expectedActive) return;
            if (BH.activeAuto === 'all' && BH.allCurrentActivity !== expectedActivity) return;
            if (callback) callback(success, reason);
        }

        // Fallback: nếu chưa chụp text → tin click sau 2s
        const textRegionId = map.text;
        if (!textRegionId || !BH.getScreenRegion(textRegionId)) {
            BH.rt.setTimeout(function () {
                safeCallback(true);
            }, 2000);
            return;
        }

        // Verify bằng text: poll mỗi 300ms, tối đa 5s
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
                safeCallback(false, 'Text not matched: ' + textRegionId);
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
    // CLICK SEQUENCE (có timeout để tránh treo)
    // =========================================================

    BH.doClickSequence = function (regionIds, callback) {
        let index = 0;
        let skippedCount = 0;

        const startTime = BH.rt.now();
        const TIMEOUT = 15000;

        function next() {
            if (BH.rt.now() - startTime > TIMEOUT) {
                BH.setMsg('⚠ Click sequence timeout');
                if (callback) callback(false, 'Timeout');
                return;
            }

            if (index >= regionIds.length) {
                if (skippedCount >= regionIds.length) {
                    if (callback) callback(false, 'All regions missing');
                    return;
                }
                if (callback) callback(true);
                return;
            }

            const regionId = regionIds[index];

            if (!BH.getScreenRegion(regionId)) {
                BH.setMsg('⚠ Chưa chụp ' + regionId + ' — skip');
                skippedCount++;
                index++;
                BH.rt.setTimeout(next, 500);
                return;
            }

            if (BH.matchRegion(regionId)) {
                BH.clickRegion(regionId);
                BH.setMsg('Click ' + (index + 1) + '/' + regionIds.length + ': ' + regionId);
                index++;
                BH.rt.setTimeout(next, 2000);
            } else {
                BH.rt.setTimeout(next, 500);
            }
        }

        next();
    };

    BH.doWBClicks = function (callback) {
        BH.doClickSequence(['wb_click1', 'wb_click2', 'wb_click3'], callback);
    };

    BH.doRaidClicks = function (callback) {
        BH.doClickSequence(['raid_click1', 'raid_click2', 'raid_click3'], callback);
    };

    BH.doDungeonClicks = function (callback) {
        BH.doClickSequence(['dungeon_click1', 'dungeon_click2', 'dungeon_click3'], callback);
    };

    // =========================================================
    // HANDLE OUT OF TICKETS
    // ESC liên tục, click Yes nếu popup leave, ESC tiếp, về main
    // =========================================================

    BH.handleOutOfTickets = function (callback) {
        BH.setMsg('⚠ Hết vé — ESC để về màn chính');

        let escCount = 0;
        const maxEsc = 10;

        const expectedActive = BH.activeAuto;
        const expectedActivity = BH.allCurrentActivity;

        function safeCallback(success, reason) {
            if (BH.activeAuto !== expectedActive) return;
            if (BH.activeAuto === 'all' && BH.allCurrentActivity !== expectedActivity) return;
            if (callback) callback(success, reason);
        }

        function step() {
            if (BH.activeAuto !== expectedActive) return;

            if (escCount >= maxEsc) {
                safeCallback(false, 'ESC quá nhiều lần');
                return;
            }

            if (BH.isMainScreen()) {
                BH.setMsg('✓ Đã về màn chính');
                safeCallback(true);
                return;
            }

            // Popup leave → click Yes trước
            if (BH.matchRegion('popup_leave')) {
                if (BH.getScreenRegion('popup_leave_yes')) {
                    BH.clickRegion('popup_leave_yes');
                    BH.setMsg('Click Yes thoát popup');

                    BH.rt.setTimeout(function () {
                        if (BH.activeAuto !== expectedActive) return;
                        if (BH.isMainScreen()) {
                            BH.setMsg('✓ Đã về màn chính');
                            safeCallback(true);
                            return;
                        }
                        escCount++;
                        BH.dispatchKeyPress('Escape');
                        BH.setMsg('ESC lần ' + escCount);
                        BH.rt.setTimeout(step, 2000);
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
                    BH.setMsg('✓ Đã về màn chính');
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