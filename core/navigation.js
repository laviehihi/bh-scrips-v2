// core/navigation.js
// Điều hướng giữa các màn hình.

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
    // CLICK SEQUENCE — "thấy là click"
    // =========================================================

    BH.doClickSequence = function (regionIds, callback) {
        let index = 0;

        function next() {
            if (index >= regionIds.length) {
                if (callback) callback(true);
                return;
            }

            const regionId = regionIds[index];

            if (!BH.getScreenRegion(regionId)) {
                BH.setMsg('⚠ Chưa chụp ' + regionId + ' — skip');
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
    // HANDLE OUT OF TICKETS — sync cơ bản
    // =========================================================
    // ESC 1 lần → chờ 3s → check màn chính.
    // Chưa về → ESC lần 2 → chờ 3s → ...
    // Tối đa 5 lần.

    BH.handleOutOfTickets = function (callback) {
        BH.setMsg('⚠ Hết vé — ESC để về màn chính');

        let escCount = 0;
        const maxEsc = 5;

        function step() {
            if (escCount >= maxEsc) {
                if (callback) callback(false, 'ESC quá nhiều lần');
                return;
            }

            if (BH.isMainScreen()) {
                BH.setMsg('✓ Đã về màn chính');
                if (callback) callback(true);
                return;
            }

            escCount++;

            // Nếu có popup leave → click Yes
            if (BH.matchRegion('popup_leave')) {
                if (BH.getScreenRegion('popup_leave_yes')) {
                    BH.clickRegion('popup_leave_yes');
                    BH.setMsg('Click Yes thoát popup (lần ' + escCount + ')');
                }
            } else {
                BH.dispatchKeyPress('Escape');
                BH.setMsg('ESC lần ' + escCount);
            }

            BH.rt.setTimeout(step, 3000);
        }

        step();
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