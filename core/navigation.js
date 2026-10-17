// core/navigation.js
// Điều hướng giữa các màn hình.
// Từ màn chính → click icon hoạt động.
// Từ màn hoạt động → click "Về thành" (dùng flow hiện tại).

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // MAPPING: activity → icon region id + text check id
    // =========================================================

    BH.ACTIVITY_MAP = {
        dungeon: { icon: 'icon_dungeon', text: 'text_dungeon', check: 'dungeon_check' },
        pvp: { icon: 'icon_pvp', text: 'text_pvp', check: null },
        wb: { icon: 'icon_wb', text: 'text_wb', check: 'wb_check' },
        raid: { icon: 'icon_raid', text: 'text_raid', check: 'raid_check' },
        invasion: { icon: 'icon_invasion', text: 'text_invasion', check: null },
        expedition: { icon: 'icon_expedition', text: 'text_expedition', check: null },
        gvp: { icon: 'icon_gvp', text: 'text_gvp', check: null },
        trials: { icon: 'icon_trials', text: 'text_trials', check: null },
        gauntlet: { icon: 'icon_gauntlet', text: 'text_gauntlet', check: null }
    };

    // =========================================================
    // NAVIGATE TO ACTIVITY
    // =========================================================
    // Từ màn chính → click icon hoạt động.
    // Chờ 2s → check text màn (nếu có).
    // → callback(success)

    BH.navigateToActivity = function (activityId, callback) {
        const map = BH.ACTIVITY_MAP[activityId];
        if (!map) {
            if (callback) callback(false, 'Không có mapping cho: ' + activityId);
            return;
        }

        // Check màn chính trước
        if (!BH.isMainScreen()) {
            if (callback) callback(false, 'Không phải màn chính');
            return;
        }

        // Check icon có tồn tại không
        if (!BH.getScreenRegion(map.icon)) {
            if (callback) callback(false, 'Chưa chụp icon: ' + map.icon);
            return;
        }

        // Click icon
        const clicked = BH.clickRegion(map.icon);

        if (!clicked) {
            if (callback) callback(false, 'Click icon thất bại');
            return;
        }

        BH.setMsg('Đã click ' + activityId + ', chờ vào màn...');

        // Chờ 2s → check text màn
        BH.rt.setTimeout(function () {
            // Nếu không có text check → coi như OK
            if (!map.text || !BH.getScreenRegion(map.text)) {
                if (callback) callback(true);
                return;
            }

            if (BH.matchRegion(map.text)) {
                BH.setMsg('✓ Đã vào ' + activityId);
                if (callback) callback(true);
            } else {
                if (callback) callback(false, 'Không thấy text màn ' + activityId);
            }
        }, 2000);
    };

    // =========================================================
    // RETURN TO MAIN
    // =========================================================
    // Từ màn hoạt động → click nút "Về thành".
    // Flow hiện tại đã có step returnHome.
    // Hàm này chỉ để check + báo.

    BH.returnToMain = function (callback) {
        if (BH.isMainScreen()) {
            if (callback) callback(true);
            return;
        }

        // Không tự navigate — flow hiện tại đã click "Về thành"
        // Chỉ chờ + check
        BH.setMsg('Chờ về màn chính...');

        let attempts = 0;
        const maxAttempts = 20;  // 20 × 500ms = 10s

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
    // WB FLOW: 3 clicks trước khi vào flow chính
    // =========================================================

    BH.doWBClicks = function (callback) {
        const clicks = ['wb_click1', 'wb_click2', 'wb_click3'];

        let index = 0;

        function next() {
            if (index >= clicks.length) {
                if (callback) callback(true);
                return;
            }

            const regionId = clicks[index];
            index++;

            if (!BH.getScreenRegion(regionId)) {
                BH.setMsg('⚠ Chưa chụp ' + regionId);
                next();
                return;
            }

            BH.clickRegion(regionId);
            BH.setMsg('WB click ' + index);

            BH.rt.setTimeout(next, 500);
        }

        next();
    };

    // =========================================================
    // RAID FLOW: 3 clicks
    // =========================================================

    BH.doRaidClicks = function (callback) {
        const clicks = ['raid_click1', 'raid_click2', 'raid_click3'];

        let index = 0;

        function next() {
            if (index >= clicks.length) {
                if (callback) callback(true);
                return;
            }

            const regionId = clicks[index];
            index++;

            if (!BH.getScreenRegion(regionId)) {
                BH.setMsg('⚠ Chưa chụp ' + regionId);
                next();
                return;
            }

            BH.clickRegion(regionId);
            BH.setMsg('Raid click ' + index);

            BH.rt.setTimeout(next, 500);
        }

        next();
    };

    // =========================================================
    // DUNGEON FLOW: 3 clicks
    // =========================================================

    BH.doDungeonClicks = function (callback) {
        const clicks = ['dungeon_click1', 'dungeon_click2', 'dungeon_click3'];

        let index = 0;

        function next() {
            if (index >= clicks.length) {
                if (callback) callback(true);
                return;
            }

            const regionId = clicks[index];
            index++;

            if (!BH.getScreenRegion(regionId)) {
                BH.setMsg('⚠ Chưa chụp ' + regionId);
                next();
                return;
            }

            BH.clickRegion(regionId);
            BH.setMsg('Dungeon click ' + index);

            BH.rt.setTimeout(next, 500);
        }

        next();
    };

    // =========================================================
    // HANDLE POPUP OUT OF TICKETS
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

            // Nếu có popup_leave → click Yes trước
            if (BH.matchRegion('popup_leave')) {
                BH.clickRegion('popup_leave');
                BH.setMsg('Click Yes thoát popup');
            } else {
                // Gửi ESC
                BH.dispatchKeyPress('Escape');
                BH.setMsg('ESC lần ' + escCount);
            }

            // Chờ 3s → check màn chính
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
        // Ưu tiên: outOfTickets > leave > confirm
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