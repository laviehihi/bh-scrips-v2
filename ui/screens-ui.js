// ui/screens-ui.js
// Setup UI cho Screens — chụp từng vùng một.

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.screensSetupMode = false;
    BH.screensSetupIndex = 0;
    BH.screensSetupCollapsed = false;
    BH.screensSetupPending = null;
    BH.screensSetupRect = null;

    BH.screensCheckMode = false;
    BH.screensCheckTimerId = null;

    // =========================================================
    // ENTER / EXIT
    // =========================================================

    BH.enterScreensSetup = function () {
        if (BH.screensSetupMode) return;

        if (BH.activeAuto) {
            BH.setMsg('⚠ Tắt bot trước khi setup screens');
            return;
        }

        BH.screensSetupMode = true;
        BH.screensSetupIndex = 0;
        BH.screensSetupCollapsed = false;
        BH.screensSetupPending = null;

        BH.screensCheckMode = false;
        if (BH.screensCheckTimerId !== null) {
            BH.rt.clearTimeout(BH.screensCheckTimerId);
            BH.screensCheckTimerId = null;
        }

        BH.loadScreens();

        BH.setMsg('Setup Screens: ' + BH.SCREEN_DEFS[0].label);

        if (BH.render) BH.render();
    };

    BH.exitScreensSetup = function () {
        if (!BH.screensSetupMode) return;

        BH.screensSetupMode = false;
        BH.screensSetupIndex = 0;
        BH.screensSetupCollapsed = false;
        BH.screensSetupPending = null;

        BH.screensCheckMode = false;
        if (BH.screensCheckTimerId !== null) {
            BH.rt.clearTimeout(BH.screensCheckTimerId);
            BH.screensCheckTimerId = null;
        }

        if (BH.screensSetupRect) {
            BH.screensSetupRect.remove();
            BH.screensSetupRect = null;
        }

        BH.setMsg('Thoát setup screens');
        if (BH.render) BH.render();
    };

    // =========================================================
    // NAVIGATE
    // =========================================================

    BH.screensSetupPrev = function () {
        if (BH.screensSetupIndex <= 0) return;

        BH.screensSetupIndex--;
        BH.screensSetupPending = null;
        clearPendingRect();

        BH.setMsg('Setup: ' + BH.SCREEN_DEFS[BH.screensSetupIndex].label);
        if (BH.render) BH.render();
    };

    BH.screensSetupNext = function () {
        if (BH.screensSetupIndex >= BH.SCREEN_DEFS.length - 1) return;

        BH.screensSetupIndex++;
        BH.screensSetupPending = null;
        clearPendingRect();

        BH.setMsg('Setup: ' + BH.SCREEN_DEFS[BH.screensSetupIndex].label);
        if (BH.render) BH.render();
    };

    // =========================================================
    // CAPTURE FLOW
    // =========================================================

    BH.startScreensCapture = function () {
        if (!BH.screensSetupMode) return;

        // Ẩn overlay hoàn toàn để không đè lên icon
        BH.screensSetupCollapsed = true;
        if (BH.overlayEl) BH.overlayEl.style.display = 'none';

        BH.setMsg('Kéo vùng trên canvas');

        BH.screensCaptureActive = true;
        BH.screensCaptureStart = null;
    };

    BH.cancelScreensCapture = function () {
        BH.screensCaptureActive = false;
        BH.screensCaptureStart = null;

        if (BH.screensSetupRect) {
            BH.screensSetupRect.remove();
            BH.screensSetupRect = null;
        }

        BH.screensSetupCollapsed = false;
        BH.screensSetupPending = null;

        if (BH.overlayEl) BH.overlayEl.style.display = 'block';
        BH.render();
    };

    // =========================================================
    // CHECK MODE — xem % match realtime + flash click ảo
    // =========================================================

    BH.startScreensCheck = function () {
        if (!BH.screensSetupMode) return;

        const def = BH.SCREEN_DEFS[BH.screensSetupIndex];
        if (!def) return;

        BH.screensCheckMode = true;
        BH.screensSetupCollapsed = true;

        // Tắt capture nếu đang bật
        BH.screensCaptureActive = false;
        BH.screensCaptureStart = null;
        if (BH.screensSetupRect) {
            BH.screensSetupRect.remove();
            BH.screensSetupRect = null;
        }

        BH.render();
        scheduleCheckTick();
    };

    BH.stopScreensCheck = function () {
        if (!BH.screensCheckMode) return;

        BH.screensCheckMode = false;
        BH.screensSetupCollapsed = false;

        if (BH.screensCheckTimerId !== null) {
            BH.rt.clearTimeout(BH.screensCheckTimerId);
            BH.screensCheckTimerId = null;
        }

        if (BH.hideMagnifier) BH.hideMagnifier();

        BH.render();
    };

    function scheduleCheckTick() {
        if (!BH.screensCheckMode) return;

        if (BH.screensCheckTimerId !== null) {
            BH.rt.clearTimeout(BH.screensCheckTimerId);
            BH.screensCheckTimerId = null;
        }

        BH.screensCheckTimerId = BH.rt.setTimeout(function () {
            if (!BH.screensCheckMode) return;

            const def = BH.SCREEN_DEFS[BH.screensSetupIndex];
            if (!def) return;

            const region = BH.getScreenRegion(def.id);

            if (region) {
                // Flash click ảo tại tâm region
                const canvas = BH.getCanvas();
                if (canvas && BH.showClickFlash) {
                    const cx = region.bufX + Math.floor(region.width / 2);
                    const cy = region.bufY + Math.floor(region.height / 2);
                    const pos = BH.bufferToClient(canvas, cx, cy);
                    BH.showClickFlash(pos.clientX, pos.clientY);
                }

                // Cập nhật % trên overlay
                updateCheckOverlay(def, region);
            }

            scheduleCheckTick();
        }, 400);
    }

    function updateCheckOverlay(def, region) {
        if (!BH.overlayEl) return;

        const el = BH.overlayEl.querySelector('[data-bh-check-ratio]');
        if (!el) return;

        if (region.isPosition || !region.data) {
            el.textContent = '📍 vị trí';
            el.style.color = '#8ec8ff';
            return;
        }

        const ratio = BH.checkRegion(def.id);
        const pct = Math.round(ratio * 100);
        const passed = ratio >= (region.minMatch || 0.85);

        el.textContent = pct + '%';
        el.style.color = passed ? '#70e0a8' : '#ff9966';
    }

    // =========================================================
    // FINISH CAPTURE
    // =========================================================

    BH.finishScreensCapture = function (clientX1, clientY1, clientX2, clientY2) {
        const canvas = BH.getCanvas();
        if (!canvas) {
            BH.cancelScreensCapture();
            return;
        }

        const p1 = BH.clientToBuffer(canvas, clientX1, clientY1);
        const p2 = BH.clientToBuffer(canvas, clientX2, clientY2);

        const bufX = Math.min(p1.x, p2.x);
        const bufY = Math.min(p1.y, p2.y);
        const width = Math.abs(p2.x - p1.x);
        const height = Math.abs(p2.y - p1.y);

        if (width < 5 || height < 5) {
            BH.cancelScreensCapture();
            return;
        }

        BH.screensSetupPending = { bufX, bufY, width, height };

        BH.screensCaptureActive = false;
        BH.screensSetupCollapsed = false;

        // Hiện lại overlay
        if (BH.overlayEl) BH.overlayEl.style.display = 'block';

        showPendingRect(canvas, bufX, bufY, width, height);

        BH.setMsg('Vùng ' + width + '×' + height + ' — bấm [Lưu]');
        BH.render();
    };

    // =========================================================
    // SAVE — icon chỉ lưu vị trí, không chụp ảnh
    // =========================================================

    BH.saveScreensPending = function () {
        if (!BH.screensSetupPending) return;

        const def = BH.SCREEN_DEFS[BH.screensSetupIndex];
        const p = BH.screensSetupPending;

        let ok;

        if (def.type === 'position') {
            // Chỉ lưu vị trí
            ok = BH.saveScreenPosition(def.id, p.bufX, p.bufY, p.width, p.height);
        } else {
            // Chụp ảnh (text, popup)
            ok = BH.saveScreenRegion(def.id, p.bufX, p.bufY, p.width, p.height);
        }

        BH.screensSetupPending = null;
        clearPendingRect();

        if (ok) {
            BH.setMsg('✓ Đã lưu ' + def.label);

            if (BH.screensSetupIndex < BH.SCREEN_DEFS.length - 1) {
                BH.rt.setTimeout(function () {
                    if (BH.screensSetupMode) {
                        BH.screensSetupIndex++;
                        BH.setMsg('Setup: ' + BH.SCREEN_DEFS[BH.screensSetupIndex].label);
                        BH.render();
                    }
                }, 500);
            } else {
                BH.setMsg('✓ Đã setup xong tất cả screens!');
            }
        } else {
            BH.setMsg('⚠ Lưu thất bại');
        }

        BH.render();
    };

    // =========================================================
    // PENDING RECT
    // =========================================================

    function showPendingRect(canvas, bufX, bufY, width, height) {
        clearPendingRect();

        const rect = canvas.getBoundingClientRect();
        const sx = rect.width / canvas.width;
        const sy = rect.height / canvas.height;

        const clientX = rect.left + bufX * sx;
        const clientTop = rect.bottom - (bufY + height) * sy;
        const clientW = width * sx;
        const clientH = height * sy;

        BH.screensSetupRect = document.createElement('div');

        Object.assign(BH.screensSetupRect.style, {
            position: 'fixed',
            left: clientX + 'px',
            top: clientTop + 'px',
            width: clientW + 'px',
            height: clientH + 'px',
            border: '2px dashed #ffaa33',
            background: 'rgba(255,170,51,0.1)',
            pointerEvents: 'none',
            zIndex: '2147483646'
        });

        document.documentElement.appendChild(BH.screensSetupRect);
    }

    function clearPendingRect() {
        if (BH.screensSetupRect) {
            BH.screensSetupRect.remove();
            BH.screensSetupRect = null;
        }
    }

    // =========================================================
    // MOUSE EVENTS
    // =========================================================

    document.addEventListener('mousedown', function (e) {
        if (!BH.screensCaptureActive) return;
        if (e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        BH.screensCaptureStart = { x: e.clientX, y: e.clientY };

        if (!BH.screensSetupRect) {
            BH.screensSetupRect = document.createElement('div');
            Object.assign(BH.screensSetupRect.style, {
                position: 'fixed',
                border: '2px solid #ffaa33',
                background: 'rgba(255,170,51,0.15)',
                pointerEvents: 'none',
                zIndex: '2147483646'
            });
            document.documentElement.appendChild(BH.screensSetupRect);
        }

        BH.screensSetupRect.style.left = e.clientX + 'px';
        BH.screensSetupRect.style.top = e.clientY + 'px';
        BH.screensSetupRect.style.width = '0px';
        BH.screensSetupRect.style.height = '0px';
        BH.screensSetupRect.style.display = 'block';
    }, true);

    document.addEventListener('mousemove', function (e) {
        if (!BH.screensCaptureActive || !BH.screensCaptureStart) return;
        e.preventDefault();

        const x = Math.min(BH.screensCaptureStart.x, e.clientX);
        const y = Math.min(BH.screensCaptureStart.y, e.clientY);
        const w = Math.abs(e.clientX - BH.screensCaptureStart.x);
        const h = Math.abs(e.clientY - BH.screensCaptureStart.y);

        if (BH.screensSetupRect) {
            BH.screensSetupRect.style.left = x + 'px';
            BH.screensSetupRect.style.top = y + 'px';
            BH.screensSetupRect.style.width = w + 'px';
            BH.screensSetupRect.style.height = h + 'px';
        }
    }, true);

    document.addEventListener('mouseup', function (e) {
        if (!BH.screensCaptureActive || !BH.screensCaptureStart) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const x1 = BH.screensCaptureStart.x;
        const y1 = BH.screensCaptureStart.y;
        const x2 = e.clientX;
        const y2 = e.clientY;

        BH.screensCaptureStart = null;

        BH.finishScreensCapture(x1, y1, x2, y2);
    }, true);

})(window);