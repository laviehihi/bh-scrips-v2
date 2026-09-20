// ui/magnifier.js
// Kính lúp — hiện color map + đường dẫn đến marker

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const RADIUS = 4;
    const CELL_SIZE = 10;

    BH.magnifier = null;
    BH.magnifierVisible = false;
    BH.magnifierLine = null;
    BH.magnifierTimerId = null;
    BH.magnifierTarget = null;

    // =========================================================
    // ENSURE ELEMENTS
    // =========================================================

    BH.ensureMagnifier = function () {
        if (BH.magnifier) return;

        if (!document.getElementById('bh-magnifier-svg')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'bh-magnifier-svg';
            Object.assign(svg.style, {
                position: 'fixed',
                inset: '0',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: '2147483644'
            });

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', '#ffaa33');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-dasharray', '5 4');
            line.setAttribute('opacity', '0.7');
            line.style.display = 'none';

            svg.appendChild(line);
            document.documentElement.appendChild(svg);

            BH.magnifierLine = line;
        }

        const el = document.createElement('div');

        Object.assign(el.style, {
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: '2147483647',
            background: 'rgba(12, 14, 18, 0.95)',
            color: '#ddd',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '10px',
            padding: '8px 10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            userSelect: 'none',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'none'
        });

        (document.documentElement || document.body).appendChild(el);
        BH.magnifier = el;
    };

    // =========================================================
    // RENDER COLOR MAP
    // =========================================================

    function renderColorMap(map) {
        let html = '<div style="display:grid;grid-template-columns:repeat(' +
            (RADIUS * 2 + 1) + ', ' + CELL_SIZE + 'px);gap:1px;width:max-content;border:1px solid #555;padding:3px;background:#222;">';

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const pixel = map[y][x];

                if (!pixel) {
                    html += '<div style="width:' + CELL_SIZE + 'px;height:' + CELL_SIZE + 'px;background:#000;"></div>';
                    continue;
                }

                const hex = BH.rgbToHex(pixel);
                const isCenter = (x === RADIUS && y === RADIUS);

                html += '<div title="' + hex + '" style="width:' + CELL_SIZE + 'px;height:' + CELL_SIZE + 'px;background:' + hex + ';' +
                    (isCenter ? 'outline:2px solid #fff;outline-offset:-2px;' : '') +
                    '"></div>';
            }
        }

        html += '</div>';
        return html;
    }

    // =========================================================
    // RENDER
    // =========================================================

    function renderMagnifier() {
        if (!BH.magnifierTarget) return;

        const canvas = BH.getCanvas();
        if (!canvas) return;

        const gl = BH.getGL(canvas);
        if (!gl) return;

        const bufX = BH.magnifierTarget.bufX;
        const bufY = BH.magnifierTarget.bufY;

        const centerPixel = BH.readPixel(gl, bufX, bufY);
        const map = BH.readColorMap(gl, bufX, bufY, RADIUS);

        const hex = centerPixel ? BH.rgbToHex(centerPixel) : '#000000';
        const rgbStr = centerPixel
            ? centerPixel.r + ', ' + centerPixel.g + ', ' + centerPixel.b
            : '---';

        BH.magnifier.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="
                    width:24px;height:24px;
                    border-radius:4px;
                    border:1px solid #fff;
                    background:${hex};
                    flex:none;
                "></div>
                <div>
                    <div style="font-weight:700;font-size:11px;">${hex}</div>
                    <div style="color:#888;font-size:9px;">${rgbStr}</div>
                </div>
            </div>
            <div style="color:#888;font-size:9px;margin-bottom:4px;">
                ${bufX}, ${bufY}
            </div>
            ${renderColorMap(map)}
        `;

        BH.magnifier.style.display = 'block';
        BH.magnifierVisible = true;

        updateLine(BH.magnifierTarget.clientX, BH.magnifierTarget.clientY);
    }

    // =========================================================
    // LINE — từ góc DƯỚI-PHẢI của kính lúp đến marker
    // =========================================================

    function updateLine(targetX, targetY) {
        if (!BH.magnifierLine || !BH.magnifier) return;

        const rect = BH.magnifier.getBoundingClientRect();

        // Góc dưới-phải của kính lúp
        const lineX1 = rect.right;
        const lineY1 = rect.bottom;

        BH.magnifierLine.setAttribute('x1', lineX1);
        BH.magnifierLine.setAttribute('y1', lineY1);
        BH.magnifierLine.setAttribute('x2', targetX);
        BH.magnifierLine.setAttribute('y2', targetY);
        BH.magnifierLine.style.display = 'block';
    }

    // =========================================================
    // SHOW / HIDE
    // =========================================================

    BH.showMagnifier = function (bufX, bufY, targetClientX, targetClientY) {
        BH.ensureMagnifier();

        BH.magnifierTarget = {
            bufX: bufX,
            bufY: bufY,
            clientX: targetClientX,
            clientY: targetClientY
        };

        renderMagnifier();

        if (BH.magnifierTimerId === null) {
            BH.magnifierTimerId = BH.rt.setInterval(function () {
                if (!BH.magnifierVisible) return;
                renderMagnifier();
            }, 200);
        }
    };

    BH.hideMagnifier = function () {
        if (BH.magnifier) {
            BH.magnifier.style.display = 'none';
        }
        if (BH.magnifierLine) {
            BH.magnifierLine.style.display = 'none';
        }

        if (BH.magnifierTimerId !== null) {
            BH.rt.clearInterval(BH.magnifierTimerId);
            BH.magnifierTimerId = null;
        }

        BH.magnifierVisible = false;
        BH.magnifierTarget = null;
    };

    // =========================================================
    // UPDATE TARGET
    // =========================================================

    BH.updateMagnifierTarget = function (clientX, clientY) {
        if (!BH.magnifierTarget) return;
        BH.magnifierTarget.clientX = clientX;
        BH.magnifierTarget.clientY = clientY;
        updateLine(clientX, clientY);
    };

})(window);