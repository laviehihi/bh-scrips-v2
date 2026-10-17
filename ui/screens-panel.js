// ui/screens-panel.js
// Panel setup Screens

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.renderScreensPanel = function (el, scale) {
        // Check mode: hiển thị % ratio + nút tắt
        if (BH.screensCheckMode) {
            renderCheckMode(el, scale);
            return;
        }

        if (BH.screensSetupCollapsed) {
            renderCollapsed(el, scale);
            return;
        }

        el.style.width = (240 * scale) + 'px';
        el.style.padding = (10 * scale) + 'px ' + (12 * scale) + 'px';
        el.style.borderColor = '#8ec8ff';

        el.innerHTML = '';

        // Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: (8 * scale) + 'px',
            paddingBottom: (6 * scale) + 'px',
            borderBottom: '1px solid rgba(142,200,255,.3)'
        });

        const title = document.createElement('span');
        title.textContent = '📸 SCREENS';
        title.style.color = '#8ec8ff';
        title.style.fontWeight = '700';
        title.style.fontSize = (12 * scale) + 'px';
        title.style.flex = '1';
        header.appendChild(title);

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '4px';

        btnGroup.appendChild(makeLocalBtn('─', function () {
            BH.screensSetupCollapsed = true;
            BH.render();
        }, { padding: '1px 6px', color: '#8ec8ff', border: '1px solid #8ec8ff' }));

        btnGroup.appendChild(makeLocalBtn('×', function () {
            BH.exitScreensSetup();
        }, { padding: '1px 6px', color: '#ff6666', border: '1px solid #ff6666' }));

        header.appendChild(btnGroup);
        el.appendChild(header);

        // Current region info
        const def = BH.SCREEN_DEFS[BH.screensSetupIndex];
        const total = BH.SCREEN_DEFS.length;

        if (!def) return;

        const info = document.createElement('div');
        Object.assign(info.style, {
            fontSize: (11 * scale) + 'px',
            marginBottom: (8 * scale) + 'px',
            lineHeight: '1.6'
        });

        const typeLabel = def.type === 'position' ? '📍 Vị trí' : '📷 Ảnh';

        const titleLine = document.createElement('div');
        titleLine.style.color = '#fff';
        titleLine.style.fontWeight = '700';
        titleLine.style.marginBottom = '4px';
        titleLine.textContent = def.label + ' (' + (BH.screensSetupIndex + 1) + '/' + total + ') · ' + typeLabel;
        info.appendChild(titleLine);

        const hintLine = document.createElement('div');
        hintLine.style.color = '#888';
        hintLine.style.fontSize = (10 * scale) + 'px';
        hintLine.textContent = def.hint;
        info.appendChild(hintLine);

        const statusLine = document.createElement('div');
        statusLine.style.fontSize = (10 * scale) + 'px';
        statusLine.style.marginTop = '4px';

        const existing = BH.getScreenRegion(def.id);

        if (BH.screensSetupPending) {
            statusLine.style.color = '#ffaa33';
            statusLine.textContent = '⏳ Chờ lưu (' + BH.screensSetupPending.width + '×' + BH.screensSetupPending.height + ')';
        } else if (existing) {
            statusLine.style.color = '#70e0a8';
            statusLine.textContent = '✓ Đã lưu (' + existing.width + '×' + existing.height + ')';
        } else {
            statusLine.style.color = '#ffaa33';
            statusLine.textContent = '⚠ Chưa lưu';
        }

        info.appendChild(statusLine);
        el.appendChild(info);

        // Buttons
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            gap: '4px',
            marginBottom: (8 * scale) + 'px',
            flexWrap: 'wrap'
        });

        if (BH.screensSetupPending) {
            row.appendChild(makeLocalBtn('[Lưu]', function () {
                BH.saveScreensPending();
            }, {
                bg: 'rgba(112,224,168,0.2)',
                color: '#70e0a8',
                border: '1px solid #70e0a8',
                flex: '1'
            }));

            row.appendChild(makeLocalBtn('[Huỷ]', function () {
                BH.cancelScreensCapture();
            }, {
                color: '#ff6666',
                border: '1px solid #ff6666',
                flex: '1'
            }));
        } else {
            row.appendChild(makeLocalBtn('[Chụp]', function () {
                BH.startScreensCapture();
            }, {
                bg: 'rgba(142,200,255,0.2)',
                color: '#8ec8ff',
                border: '1px solid #8ec8ff',
                flex: '1'
            }));

            if (existing) {
                row.appendChild(makeLocalBtn('[Check]', function () {
                    BH.startScreensCheck();
                }, {
                    bg: 'rgba(112,224,168,0.2)',
                    color: '#70e0a8',
                    border: '1px solid #70e0a8',
                    flex: '1'
                }));

                row.appendChild(makeLocalBtn('[Xoá]', function () {
                    BH.removeScreenRegion(def.id);
                    BH.setMsg('Đã xoá ' + def.label);
                    BH.render();
                }, {
                    color: '#ff6666',
                    border: '1px solid #ff6666'
                }));
            }
        }

        el.appendChild(row);

        // Nav
        const navRow = document.createElement('div');
        Object.assign(navRow.style, {
            display: 'flex',
            gap: '4px',
            marginBottom: (8 * scale) + 'px',
            flexWrap: 'wrap'
        });

        navRow.appendChild(makeLocalBtn('← Trước', function () {
            BH.screensSetupPrev();
        }, {
            disabled: BH.screensSetupIndex <= 0,
            flex: '1'
        }));

        navRow.appendChild(makeLocalBtn('Tiếp →', function () {
            BH.screensSetupNext();
        }, {
            disabled: BH.screensSetupIndex >= total - 1,
            flex: '1'
        }));

        el.appendChild(navRow);

        // Progress dots
        const progressRow = document.createElement('div');
        Object.assign(progressRow.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            paddingTop: (6 * scale) + 'px',
            borderTop: '1px solid rgba(255,255,255,.1)'
        });

        for (let i = 0; i < BH.SCREEN_DEFS.length; i++) {
            const d = BH.SCREEN_DEFS[i];
            const dot = document.createElement('div');

            let bg;
            if (i === BH.screensSetupIndex) bg = '#ffaa33';
            else if (BH.getScreenRegion(d.id)) bg = '#70e0a8';
            else bg = 'rgba(255,255,255,.15)';

            Object.assign(dot.style, {
                width: (6 * scale) + 'px',
                height: (6 * scale) + 'px',
                borderRadius: '50%',
                background: bg,
                boxShadow: i === BH.screensSetupIndex ? '0 0 6px #ffaa33' : 'none'
            });

            progressRow.appendChild(dot);
        }

        el.appendChild(progressRow);
    };

    // =========================================================
    // CHECK MODE RENDER
    // =========================================================

    function renderCheckMode(el, scale) {
        el.style.width = 'auto';
        el.style.padding = (6 * scale) + 'px ' + (10 * scale) + 'px';
        el.style.borderColor = '#8ec8ff';

        el.innerHTML = '';

        const def = BH.SCREEN_DEFS[BH.screensSetupIndex];
        if (!def) return;

        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            alignItems: 'center',
            gap: (8 * scale) + 'px',
            whiteSpace: 'nowrap'
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = def.label;
        nameSpan.style.color = '#8ec8ff';
        nameSpan.style.fontWeight = '700';
        nameSpan.style.fontSize = (11 * scale) + 'px';
        row.appendChild(nameSpan);

        const ratioSpan = document.createElement('span');
        ratioSpan.setAttribute('data-bh-check-ratio', '1');
        ratioSpan.textContent = '...';
        ratioSpan.style.fontWeight = '700';
        ratioSpan.style.fontSize = (12 * scale) + 'px';
        ratioSpan.style.color = '#ffaa33';
        ratioSpan.style.minWidth = (48 * scale) + 'px';
        ratioSpan.style.textAlign = 'right';
        row.appendChild(ratioSpan);

        row.appendChild(makeLocalBtn('■', function () {
            BH.stopScreensCheck();
        }, {
            padding: '2px 8px',
            fontSize: '12px',
            color: '#ff6666',
            border: '1px solid #ff6666'
        }));

        el.appendChild(row);
    }

    // =========================================================
    // COLLAPSED RENDER
    // =========================================================

    function renderCollapsed(el, scale) {
        el.style.width = 'auto';
        el.style.padding = (6 * scale) + 'px ' + (10 * scale) + 'px';
        el.style.borderColor = '#8ec8ff';

        el.innerHTML = '';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = (6 * scale) + 'px';

        const txt = document.createElement('span');
        txt.textContent = '📸 SCREENS';
        txt.style.color = '#8ec8ff';
        txt.style.fontWeight = '700';
        txt.style.fontSize = (11 * scale) + 'px';
        row.appendChild(txt);

        row.appendChild(makeLocalBtn('▲', function () {
            BH.screensSetupCollapsed = false;
            BH.render();
        }, { padding: '2px 6px', color: '#8ec8ff', border: '1px solid #8ec8ff' }));

        row.appendChild(makeLocalBtn('×', function () {
            BH.exitScreensSetup();
        }, { padding: '2px 6px', color: '#ff6666', border: '1px solid #ff6666' }));

        el.appendChild(row);
    }

    function makeLocalBtn(text, onClick, opts) {
        opts = opts || {};

        const btn = document.createElement('button');
        btn.textContent = text;

        const isDisabled = opts.disabled === true;

        Object.assign(btn.style, {
            padding: opts.padding || '3px 6px',
            margin: '1px',
            background: opts.bg || 'rgba(255,255,255,0.08)',
            color: opts.color || '#ddd',
            border: opts.border || '1px solid rgba(255,255,255,0.15)',
            borderRadius: '3px',
            fontFamily: 'inherit',
            fontSize: opts.fontSize || '9px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? '0.4' : '1',
            flex: opts.flex || 'initial',
            pointerEvents: isDisabled ? 'none' : 'auto'
        });

        if (!isDisabled) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            });
        }

        return btn;
    }

})(window);