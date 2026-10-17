// core/screens.js
// Chụp/lưu/so sánh vùng ảnh (regions) để nhận diện màn hình, icon, popup.

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const STORAGE_KEY = 'bh_v3_screens';

    // =========================================================
    // SCREEN DEFINITIONS — theo cặp (icon + text cùng activity)
    // =========================================================

    BH.SCREEN_DEFS = [
        // ===== Dungeon =====
        { id: 'icon_dungeon', group: 'Dungeon', label: 'Icon Dungeon', hint: 'Icon Dungeon trên màn chính' },
        { id: 'text_dungeon', group: 'Dungeon', label: 'Text Dungeon', hint: 'Chữ "Dungeon" khi vào màn' },
        { id: 'dungeon_click1', group: 'Dungeon', label: 'Dungeon Click 1', hint: 'Nút click thứ 1 khi vào Dungeon' },
        { id: 'dungeon_click2', group: 'Dungeon', label: 'Dungeon Click 2', hint: 'Nút click thứ 2 (hiện sau click 1)' },
        { id: 'dungeon_click3', group: 'Dungeon', label: 'Dungeon Click 3', hint: 'Nút click thứ 3 (hiện sau click 2)' },

        // ===== PvP =====
        { id: 'icon_pvp', group: 'PvP', label: 'Icon PvP', hint: 'Icon PvP trên màn chính' },
        { id: 'text_pvp', group: 'PvP', label: 'Text PvP', hint: 'Chữ "PvP" khi vào màn' },

        // ===== WB =====
        { id: 'icon_wb', group: 'WB', label: 'Icon WB', hint: 'Icon World Boss trên màn chính' },
        { id: 'text_wb', group: 'WB', label: 'Text WB', hint: 'Chữ "World Boss" khi vào màn' },
        { id: 'wb_click1', group: 'WB', label: 'WB Click 1', hint: 'Nút click thứ 1 khi vào WB' },
        { id: 'wb_click2', group: 'WB', label: 'WB Click 2', hint: 'Nút click thứ 2 (hiện sau click 1)' },
        { id: 'wb_click3', group: 'WB', label: 'WB Click 3', hint: 'Nút click thứ 3 (hiện sau click 2)' },

        // ===== Raid =====
        { id: 'icon_raid', group: 'Raid', label: 'Icon Raid', hint: 'Icon Raid trên màn chính' },
        { id: 'text_raid', group: 'Raid', label: 'Text Raid', hint: 'Chữ "Raid" khi vào màn' },
        { id: 'raid_click1', group: 'Raid', label: 'Raid Click 1', hint: 'Nút click thứ 1 khi vào Raid' },
        { id: 'raid_click2', group: 'Raid', label: 'Raid Click 2', hint: 'Nút click thứ 2 (hiện sau click 1)' },
        { id: 'raid_click3', group: 'Raid', label: 'Raid Click 3', hint: 'Nút click thứ 3 (hiện sau click 2)' },

        // ===== Invasion (xoay tua) — chụp ảnh + lưu vị trí =====
        { id: 'icon_invasion', group: 'Invasion', type: 'position', label: 'Icon Invasion', hint: 'Kéo vùng quanh icon Invasion (click theo vị trí)' },
        { id: 'text_invasion', group: 'Invasion', label: 'Text Invasion', hint: 'Chữ "Invasion" khi vào màn' },

        // ===== Expedition (xoay tua) =====
        { id: 'icon_expedition', group: 'Expedition', type: 'position', label: 'Icon Expedition', hint: 'Kéo vùng quanh icon Expedition (click theo vị trí)' },
        { id: 'text_expedition', group: 'Expedition', label: 'Text Expedition', hint: 'Chữ "Expedition" khi vào màn' },

        // ===== GvP (xoay tua) =====
        { id: 'icon_gvp', group: 'GvP', type: 'position', label: 'Icon GvP', hint: 'Kéo vùng quanh icon GvP (click theo vị trí)' },
        { id: 'text_gvp', group: 'GvP', label: 'Text GvP', hint: 'Chữ "GvP" khi vào màn' },

        // ===== Trials (xoay tua) =====
        { id: 'icon_trials', group: 'Trials', type: 'position', label: 'Icon Trials', hint: 'Kéo vùng quanh icon Trials (click theo vị trí)' },
        { id: 'text_trials', group: 'Trials', label: 'Text Trials', hint: 'Chữ "Trials" khi vào màn' },

        // ===== Gauntlet (xoay tua) =====
        { id: 'icon_gauntlet', group: 'Gauntlet', type: 'position', label: 'Icon Gauntlet', hint: 'Kéo vùng quanh icon Gauntlet (click theo vị trí)' },
        { id: 'text_gauntlet', group: 'Gauntlet', label: 'Text Gauntlet', hint: 'Chữ "Gauntlet" khi vào màn' },

        // ===== Popups =====
        { id: 'popup_confirm', group: 'Popups', label: 'Popup Confirm', hint: 'Popup "Xác nhận chưa full team"' },
        { id: 'popup_outOfTickets', group: 'Popups', label: 'Popup Hết vé', hint: 'Popup "Hết vé" / "Out of tickets"' },
        { id: 'popup_leave', group: 'Popups', label: 'Popup Thoát (text)', hint: 'Text popup "Thoát trận"' },
        { id: 'popup_leave_yes', group: 'Popups', label: 'Popup Thoát (nút Yes)', hint: 'Nút Yes trong popup thoát trận' }
    ];

    // =========================================================
    // STATE
    // =========================================================

    BH.screens = {};

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
    // SAVE / GET / REMOVE
    // =========================================================

    BH.saveScreenRegion = function (regionId, bufX, bufY, width, height, isPosition) {
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

        if (isPosition) {
            BH.screens[regionId].isPosition = true;
        }

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
    // CHECK REGION
    // =========================================================

    BH.checkRegion = function (regionId) {
        const region = BH.screens[regionId];
        if (!region) return 0;
        if (!region.data) return 0;

        const current = BH.captureRegion(region.bufX, region.bufY, region.width, region.height);
        if (!current) return 0;

        const stored = deserialize(region.data);
        return BH.compareRegions(current, stored, region.tol);
    };

    BH.matchRegion = function (regionId) {
        const region = BH.screens[regionId];
        if (!region) return false;

        // Region position: không dùng để detect screen (tránh ảnh hưởng isMainScreen/detectScreen)
        if (region.isPosition) return false;
        if (!region.data) return false;

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
    // DETECT MAIN SCREEN
    // =========================================================

    BH.MAIN_ICONS = ['icon_dungeon', 'icon_pvp', 'icon_wb', 'icon_raid'];

    BH.isMainScreen = function () {
        let matchCount = 0;

        for (let i = 0; i < BH.MAIN_ICONS.length; i++) {
            if (BH.matchRegion(BH.MAIN_ICONS[i])) {
                matchCount++;
            }
        }

        return matchCount >= 3;
    };

    // =========================================================
    // DETECT SCREEN
    // =========================================================

    BH.detectScreen = function () {
        if (BH.isMainScreen()) {
            return 'main';
        }

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
    // RESET
    // =========================================================

    BH.clearAllScreens = function () {
        BH.screens = {};
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { }
    };

})(window);