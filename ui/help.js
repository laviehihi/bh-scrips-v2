// ui/help.js
// Bảng help — hiện khi user bấm [?] trên overlay

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.helpVisible = false;
    BH.helpBox = null;

    BH.ensureHelpBox = function () {
        if (BH.helpBox) return;

        BH.helpBox = document.createElement('div');

        Object.assign(BH.helpBox.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '2147483647',
            width: '360px',
            boxSizing: 'border-box',
            padding: '16px 18px',
            background: 'rgba(12, 14, 18, 0.96)',
            color: '#ddd',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '10px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '11.5px',
            lineHeight: '1.7',
            boxShadow: '0 6px 30px rgba(0,0,0,0.7)',
            userSelect: 'none',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'none'
        });

        BH.helpBox.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:10px;
                padding-bottom:8px;
                border-bottom:1px solid rgba(255,255,255,.15);
            ">
                <span style="color:#fff;font-size:14px;font-weight:700;letter-spacing:.4px;">
                    📖 HELP
                </span>
                <span style="color:#777;font-size:10px;">
                    Bấm [?] để đóng
                </span>
            </div>

            <div style="color:#8ec8ff;font-size:10.5px;font-weight:700;margin-top:4px;margin-bottom:4px;">
                ▸ OVERLAY
            </div>

            <div style="display:flex;justify-content:space-between;gap:10px;">
                <span style="color:#8ec8ff;font-weight:700;">\`</span>
                <span style="flex:1;text-align:right;color:#ccc;">Mở/thu nhỏ/ẩn overlay</span>
            </div>

            <div style="display:flex;justify-content:space-between;gap:10px;">
                <span style="color:#8ec8ff;font-weight:700;">Shift + \`</span>
                <span style="flex:1;text-align:right;color:#ccc;">Passthrough (gõ phím bình thường)</span>
            </div>

            <div style="color:#8ec8ff;font-size:10.5px;font-weight:700;margin-top:10px;margin-bottom:4px;">
                ▸ CÁCH DÙNG
            </div>

            <div style="color:#ccc;font-size:10.5px;">
                1. Vào đúng màn trong game (PvP, WB, Rerun...)<br>
                2. Chọn template trên overlay<br>
                3. Bấm [Setup] để calibrate các nút<br>
                4. Bấm [▶ BẮT ĐẦU] để chạy
            </div>

            <div style="color:#8ec8ff;font-size:10.5px;font-weight:700;margin-top:10px;margin-bottom:4px;">
                ▸ SETUP
            </div>

            <div style="color:#ccc;font-size:10.5px;">
                - Kéo marker vào đúng nút<br>
                - Bot tự chụp màu (5 mẫu)<br>
                - Tick xanh = đã lưu<br>
                - Kéo lại marker để sửa
            </div>

            <div style="color:#8ec8ff;font-size:10.5px;font-weight:700;margin-top:10px;margin-bottom:4px;">
                ▸ SPEED
            </div>

            <div style="color:#ccc;font-size:10.5px;">
                - Click [+] / [-] trên overlay<br>
                - Hoặc chọn preset [1×][2×][3×][5×]
            </div>

            <div style="
                margin-top:12px;
                padding-top:8px;
                border-top:1px solid rgba(255,255,255,.12);
                color:#888;
                font-size:10px;
                text-align:center;
            ">
                Auto-stop: 3 phút không click → tự tắt
            </div>
        `;

        (document.documentElement || document.body).appendChild(BH.helpBox);
    };

    BH.toggleHelp = function () {
        BH.helpVisible = !BH.helpVisible;

        BH.ensureHelpBox();

        BH.helpBox.style.display = BH.helpVisible ? 'block' : 'none';
    };

})(window);