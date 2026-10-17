// core/screens.js
// Chụp/lưu/so sánh vùng ảnh (regions) để nhận diện màn hình, icon, popup.

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const STORAGE_KEY = 'bh_v3_screens';

    // =========================================================
    // SCREEN DEFINITIONS — danh sách regions cần chụp
    // =========================================================

    BH.SCREEN_DEFS = [
        // ===== Icons hoạt động cố định =====
        { id: 'icon_dungeon', group: 'Icons (cố định)', label: 'Icon Dungeon', hint: 'Icon Dungeon trên màn chính' },
        { id: 'icon_pvp', group: 'Icons (cố định)', label: 'Icon PvP', hint: 'Icon PvP trên màn chính' },
        { id: 'icon_wb', group: 'Icons (cố định)', label: 'Icon WB', hint: 'Icon World Boss trên màn chính' },
        { id: 'icon_raid', group: 'Icons (cố định)', label: 'Icon Raid', hint: 'Icon Raid trên màn chính' },

        // ===== Icons hoạt động xoay tua =====
        { id: 'icon_invasion', group: 'Icons (xoay tua)', label: 'Icon Invasion', hint: 'Icon Invasion (nếu tuần này có)' },
        { id: 'icon_expedition', group: 'Icons (xoay tua)', label: 'Icon Expedition', hint: 'Icon Expedition (nếu tuần này có)' },
        { id: 'icon_gvp', group: 'Icons (xoay tua)', label: 'Icon GvP', hint: 'Icon GvP (nếu tuần này có)' },
        { id: 'icon_trials', group: 'Icons (xoay tua)', label: 'Icon Trials', hint: 'Icon Trials (nếu tuần này có)' },
        { id: 'icon_gauntlet', group: 'Icons (xoay tua)', label: 'Icon Gauntlet', hint: 'Icon Gauntlet (nếu tuần này có)' },

        // ===== Text xác nhận màn =====
        { id: 'text_dungeon', group: 'Text màn', label: 'Text Dungeon', hint: 'Chữ "Dungeon" khi vào màn' },
        { id: 'text_pvp', group: 'Text màn', label: 'Text PvP', hint: 'Chữ "PvP" khi vào màn' },
        { id: 'text_wb', group: 'Text màn', label: 'Text WB', hint: 'Chữ "World Boss" khi vào màn' },
        { id: 'text_raid', group: 'Text màn', label: 'Text Raid', hint: 'Chữ "Raid" khi vào màn' },
        { id: 'text_invasion', group: 'Text màn', label: 'Text Invasion', hint: 'Chữ "Invasion"' },
        { id: 'text_expedition', group: 'Text màn', label: 'Text Expedition', hint: 'Chữ "Expedition"' },
        { id: 'text_gvp', group: 'Text màn', label: 'Text GvP', hint: 'Chữ "GvP"' },
        { id: 'text_trials', group: 'Text màn', label: 'Text Trials', hint: 'Chữ "Trials"' },
        { id: 'text_gauntlet', group: 'Text màn', label: 'Text Gauntlet', hint: 'Chữ "Gauntlet"' },

        // ===== Popups =====
        { id: 'popup_confirm', group: 'Popups', label: 'Popup Confirm', hint: 'Popup "Xác nhận chưa full team"' },
        { id: 'popup_outOfTickets', group: 'Popups', label: 'Popup Hết vé', hint: 'Popup "Hết vé" / "Out of tickets"' },
        { id: 'popup_leave', group: 'Popups', label: 'Popup Thoát', hint: 'Popup "Thoát trận" + nút Yes' },

        // ===== WB clicks =====
        { id: 'wb_check', group: 'WB', label: 'WB check', hint: 'Text xác nhận đã vào màn WB (sau click icon)' },
        { id: 'wb_click1', group: 'WB', label: 'WB Click 1', hint: 'Nút click thứ 1 khi vào WB' },
        { id: 'wb_click2', group: 'WB', label: 'WB Click 2', hint: 'Nút click thứ 2' },
        { id: 'wb_click3', group: 'WB', label: 'WB Click 3', hint: 'Nút click thứ 3' },

        // ===== Raid clicks =====
        { id: 'raid_check', group: 'Raid', label: 'Raid check', hint: 'Text xác nhận đã vào màn Raid' },
        { id: 'raid_click1', group: 'Raid', label: 'Raid Click 1', hint: 'Nút click thứ 1 khi vào Raid' },
        { id: 'raid_click2', group: 'Raid', label: 'Raid Click 2', hint: 'Nút click thứ 2' },
        { id: 'raid_click3', group: 'Raid', label: 'Raid Click 3', hint: 'Nút click thứ 3' },

        // ===== Dungeon clicks =====
        { id: 'dungeon_check', group: 'Dungeon', label: 'Dungeon check', hint: 'Text xác nhận đã vào màn Dungeon' },
        { id: 'dungeon_click1', group: 'Dungeon', label: 'Dungeon Click 1', hint: 'Nút click thứ 1 khi vào Dungeon' },
        { id: 'dungeon_click2', group: 'Dungeon', label: 'Dungeon Click 2', hint: 'Nút click thứ 2' },
        { id: 'dungeon_click3', group: 'Dungeon', label: 'Dungeon Click 3', hint: 'Nút click thứ 3' }
    ];

    // =========================================================
    // STATE
    // =========================================================

    BH.screens = {};  // { regionId: { bufX, bufY, width, height, data, tol, minMatch } }

    // =========================================================
    // CAPTURE / COMPARE
    // =========================================================

    BH.captureRegion = function (bufX, bufY, width, height) {
        const canvas = BH.getCanvas();
        if (!canvas) return null;

        const gl = BH.getGL(canvas);
        if (!gl) return null;

        const pixels = new Uint8Array(width * height * 4);
        try {
            gl.readPixels(bufX, bufY, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        } catch (e) {
            return null;
        }

        return pixels;
    };

    BH.compareRegions = function (r1, r2, tol) {
        if (!r1 || !r2 || r1.length !== r2.length) return 0;

        let match = 0;
        const total = r1.length / 4;

        for (let i = 0; i < r1.length; i += 4) {
            if (Math.abs(r1[i] - r2[i]) <= tol &&
                Math.abs(r1[i + 1] - r2[i + 1]) <= tol &&
                Math.abs(r1[i + 2] - r2[i + 2]) <= tol) {
                match++;
            }
        }

        return match / total;
    };

    // =========================================================
    // SERIALIZE / DESERIALIZE
    // =========================================================

    function serialize(pixels) {
        let binary = '';
        const chunk = 8192;

        for (let i = 0; i < pixels.length; i += chunk) {
            binary += String.fromCharCode.apply(null, pixels.subarray(i, i + chunk));
        }

        return btoa(binary);
    }

    function deserialize(base64) {
        const binary = atob(base64);
        const pixels = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            pixels[i] = binary.charCodeAt(i);
        }

        return pixels;
    }

    BH.serializeRegion = serialize;
    BH.deserializeRegion = deserialize;

    // =========================================================
    // SAVE / LOAD
    // =========================================================

    BH.saveScreens = function () {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(BH.screens));
        } catch (e) {
            console.warn('[BH] save screens fail:', e);
        }
    };

    BH.loadScreens = function () {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                BH.screens = parsed;
            }
        } catch (e) {
            console.warn('[BH] load screens fail:', e);
        }
    };

    // =========================================================
    // SAVE / GET / REMOVE SINGLE REGION
    // =========================================================

    BH.saveScreenRegion = function (regionId, bufX, bufY, width, height) {
        const pixels = BH.captureRegion(bufX, bufY, width, height);
        if (!pixels) return false;

        BH.screens[regionId] = {
            bufX: bufX,
            bufY: bufY,
            width: width,
            height: height,
            data: serialize(pixels),
            tol: 20,
            minMatch: 0.85
        };

        BH.saveScreens();
        return true;
    };

    BH.getScreenRegion = function (regionId) {
        return BH.screens[regionId] || null;
    };

    BH.removeScreenRegion = function (regionId) {
        delete BH.screens[regionId];
        BH.saveScreens();
    };

    // =========================================================
    // CHECK REGION (so sánh với pixel hiện tại)
    // =========================================================

    BH.checkRegion = function (regionId) {
        const region = BH.screens[regionId];
        if (!region) return 0;

        const current = BH.captureRegion(region.bufX, region.bufY, region.width, region.height);
        if (!current) return 0;

        const stored = deserialize(region.data);
        return BH.compareRegions(current, stored, region.tol);
    };

    BH.matchRegion = function (regionId) {
        const region = BH.screens[regionId];
        if (!region) return false;

        const ratio = BH.checkRegion(regionId);
        return ratio >= region.minMatch;
    };

    // =========================================================
    // CLICK CENTER OF REGION
    // =========================================================

    BH.clickRegion = function (regionId) {
        const region = BH.screens[regionId];
        if (!region) return false;

        const cx = region.bufX + Math.floor(region.width / 2);
        const cy = region.bufY + Math.floor(region.height / 2);

        return BH.clickAtBuf(cx, cy);
    };

    // =========================================================
    // DETECT MAIN SCREEN (4 icon cố định)
    // =========================================================

    BH.MAIN_ICONS = ['icon_dungeon', 'icon_pvp', 'icon_wb', 'icon_raid'];

    BH.isMainScreen = function () {
        let matchCount = 0;

        for (let i = 0; i < BH.MAIN_ICONS.length; i++) {
            if (BH.matchRegion(BH.MAIN_ICONS[i])) {
                matchCount++;
            }
        }

        return matchCount >= 3;  // match ≥ 3/4 → màn chính
    };

    // =========================================================
    // DETECT SPECIFIC SCREEN
    // =========================================================

    BH.detectScreen = function () {
        // Check màn chính trước
        if (BH.isMainScreen()) {
            return 'main';
        }

        // Check text các màn
        const screenIds = ['dungeon', 'pvp', 'wb', 'raid', 'invasion', 'expedition', 'gvp', 'trials', 'gauntlet'];

        for (let i = 0; i < screenIds.length; i++) {
            const id = screenIds[i];
            if (BH.matchRegion('text_' + id)) {
                return id;
            }
        }

        return null;
    };

    // =========================================================
    // RESET ALL
    // =========================================================

    BH.clearAllScreens = function () {
        BH.screens = {};
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { }
    };

})(window);