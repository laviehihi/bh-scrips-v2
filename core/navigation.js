// core/navigation.js

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // ACTIVITY MAP
    // =========================================================

    BH.ACTIVITY_MAP = {
        dungeon: { icon: 'icon_dungeon', text: 'text_dungeon', clicks: ['dungeon_click1', 'dungeon_click2', 'dungeon_click3'] },
        pvp: { icon: 'icon_pvp', text: 'text_pvp', clicks: null },
        wb: { icon: 'icon_wb', text: 'text_wb', clicks: ['wb_click1', 'wb_click2', 'wb_click3'] },
        raid: { icon: 'icon_raid', text: 'text_raid', clicks: ['raid_click1', 'raid_click2', 'raid_click3'] },
        invasion: { icon: 'icon_invasion', text: 'text_invasion', clicks: null },
        expedition: { icon: 'icon_expedition', text: 'text_expedition', clicks: null },
        gvp: { icon: 'icon_gvp', text: 'text_gvp', clicks: null },
        trials: { icon: 'icon_trials', text: 'text_trials', clicks: null },
        gauntlet: { icon: 'icon_gauntlet', text: 'text_gauntlet', clicks: null }
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

        if (!BH.getScreenRegion(map.icon)) {
            if (callback) callback(false, 'Missing icon: ' + map.icon);
            return;
        }

        const clicked = BH.clickRegion(map.icon);

        if (!clicked) {
            if (callback) callback(false, 'Click icon fail');
            return;
        }

        BH.setMsg('Click icon ' + activityId);

        BH.rt.setTimeout(function () {
            if (!map.text || !BH.getScreenRegion(map.text)) {
                if (callback) callback(true);
                return;
            }

            if (BH.matchRegion(map.text)) {
                if (callback) callback(true);
            } else {
                if (callback) callback(false, 'Không thấy text ' + activityId);
            }
        }, 2000);
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
    // SEQUENTIAL CLICKS (delay 1s)
    // =========================================================

    BH.doSequentialClicks = function (regionIds, callback) {
        let index = 0;
        let clickRetry = 0;
        const MAX_CLICK_RETRY = 3;
        let waitRetry = 0;
        const MAX_WAIT_RETRY = 10;

        function clickCurrent() {
            if (index >= regionIds.length) {
                if (callback) callback(true);
                return;
            }

            const regionId = regionIds[index];

            if (!BH.getScreenRegion(regionId)) {
                BH.setMsg('⚠ Chưa chụp ' + regionId + ' — skip');
                index++;
                clickRetry = 0;
                waitRetry = 0;
                BH.rt.setTimeout(clickCurrent, 500);
                return;
            }

            if (!BH.matchRegion(regionId)) {
                waitRetry++;

                if (waitRetry > MAX_WAIT_RETRY) {
                    BH.setMsg('⚠ Không thấy ' + regionId + ' — skip');
                    index++;
                    clickRetry = 0;
                    waitRetry = 0;
                    BH.rt.setTimeout(clickCurrent, 500);
                    return;
                }

                BH.rt.setTimeout(clickCurrent, 500);
                return;
            }

            waitRetry = 0;

            BH.clickRegion(regionId);
            BH.setMsg('Click ' + (index + 1) + '/' + regionIds.length);

            // Chờ 1s → check nút đã biến mất chưa
            BH.rt.setTimeout(function () {
                if (BH.matchRegion(regionId)) {
                    clickRetry++;

                    if (clickRetry >= MAX_CLICK_RETRY) {
                        BH.setMsg('⚠ Click fail ' + regionId + ' — skip');
                        index++;
                        clickRetry = 0;
                        waitRetry = 0;
                        BH.rt.setTimeout(clickCurrent, 500);
                        return;
                    }

                    BH.rt.setTimeout(clickCurrent, 1000);
                    return;
                }

                index++;
                clickRetry = 0;
                BH.rt.setTimeout(clickCurrent, 500);
            }, 1000);
        }

        clickCurrent();
    };

    // =========================================================
    // WB / RAID / DUNGEON CLICKS
    // =========================================================

    BH.doWBClicks = function (callback) {
        BH.doSequentialClicks(['wb_click1', 'wb_click2', 'wb_click3'], callback);
    };

    BH.doRaidClicks = function (callback) {
        BH.doSequentialClicks(['raid_click1', 'raid_click2', 'raid_click3'], callback);
    };

    BH.doDungeonClicks = function (callback) {
        BH.doSequentialClicks(['dungeon_click1', 'dungeon_click2', 'dungeon_click3'], callback);
    };

    // =========================================================
    // HANDLE OUT OF TICKETS
    // =========================================================

    BH.handleOutOfTickets = function (callback) {
        BH.setMsg('⚠ Hết vé — ESC để về màn chính');

        let escCount = 0;
        const maxEsc = 5;

        function doEsc() {
            if (escCount >= maxEsc) {
                if (callback) callback(false, 'ESC quá nhiều lần');
                return;
            }

            escCount++;

            if (BH.matchRegion('popup_leave')) {
                if (BH.getScreenRegion('popup_leave_yes')) {
                    BH.clickRegion('popup_leave_yes');
                    BH.setMsg('Click Yes thoát popup');
                }
            } else {
                BH.dispatchKeyPress('Escape');
                BH.setMsg('ESC lần ' + escCount);
            }

            BH.rt.setTimeout(function () {
                if (BH.isMainScreen()) {
                    if (callback) callback(true);
                    return;
                }
                doEsc();
            }, 3000);
        }

        doEsc();
    };

    // =========================================================
    // DETECT POPUP
    // =========================================================

    BH.detectPopup = function () {
        if (BH.matchRegion('popup_outOfTickets')) {
            return 'outOfTickets';
        }
        if (BH.matchRegion('popup_leave')) {
            return 'leave';
        }
        if (BH.matchRegion('popup_confirm')) {
            return 'confirm';
        }
        return null;
    };

})(window);