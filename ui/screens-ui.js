// ui/screens-ui.js
// Setup UI cho Screens — chụp từng vùng một.
// Flow: bấm [Setup Screens] → thu nhỏ overlay → hiện marker vùng → user kéo → [Lưu] → next.

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // STATE
    // =========================================================

    BH.screensSetupMode = false;
    BH.screensSetupIndex = 0;
    BH.screensSetupCollapsed = false;
    BH.screensSetupPending = null;   // { bufX, bufY, width, height }
    BH.screensSetupRect = null;       // DOM element (vùng dashed)

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

        // Thu nhỏ overlay để user kéo vùng
        BH.screensSetupCollapsed = true;
        BH.render();

        BH.setMsg('Kéo vùng trên canvas để chụp');

        // Bật capture mode
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
        BH.render();
    };

    // =========================================================
    // FINISH CAPTURE (user thả chuột)
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

        // Hiện lại overlay, chờ user bấm [Lưu]
        BH.screensCaptureActive = false;
        BH.screensSetupCollapsed = false;

        // Hiện vùng dashed trên canvas
        showPendingRect(canvas, bufX, bufY, width, height);

        BH.setMsg('Vùng ' + width + '×' + height + ' — bấm [Lưu]');
        BH.render();
    };

    // =========================================================
    // SAVE
    // =========================================================

    BH.saveScreensPending = function () {
        if (!BH.screensSetupPending) return;

        const def = BH.SCREEN_DEFS[BH.screensSetupIndex];
        const p = BH.screensSetupPending;

        const ok = BH.saveScreenRegion(def.id, p.bufX, p.bufY, p.width, p.height);

        BH.screensSetupPending = null;
        clearPendingRect();

        if (ok) {
            BH.setMsg('✓ Đã lưu ' + def.label);

            // Auto next
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
    // PENDING RECT (vùng dashed cam)
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
    // MOUSE EVENTS (capture mode)
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