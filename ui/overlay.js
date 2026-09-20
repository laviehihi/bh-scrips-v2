// ui/overlay.js
// Overlay chính — compact / expanded / setup / test
//
// Cố định góc phải trên. Không kéo di chuyển.
// Toggle bằng phím ` (cycleOverlay).

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const OVERLAY_STATES = ['compact', 'expanded', 'hidden'];

    BH.overlayState = 'compact';
    BH.overlayEl = null;
    BH.lastMsg = '';
    BH.passthrough = false;

    // =========================================================
    // ENSURE OVERLAY
    // =========================================================

    BH.ensureOverlay = function () {
        if (BH.overlayEl) return;

        const el = document.createElement('div');
        el.setAttribute('data-bh-overlay', '1');

        Object.assign(el.style, {
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: '2147483647',
            boxSizing: 'border-box',
            background: 'rgba(12, 14, 18, 0.92)',
            color: '#ddd',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '9px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '11px',
            lineHeight: '1.5',
            boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            transition: 'width .15s ease, padding .15s ease',
            pointerEvents: 'auto'
        });

        (document.documentElement || document.body).appendChild(el);

        BH.overlayEl = el;
    };

    // =========================================================
    // BUTTON HELPER
    // =========================================================

    function makeBtn(text, onClick, opts) {
        opts = opts || {};

        const btn = document.createElement('button');
        btn.textContent = text;

        Object.assign(btn.style, {
            padding: opts.padding || '4px 8px',
            margin: '2px',
            background: opts.bg || 'rgba(255,255,255,0.08)',
            color: opts.color || '#ddd',
            border: opts.border || '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: opts.fontSize || '10px',
            cursor: 'pointer',
            transition: 'background .15s',
            pointerEvents: 'auto',
            userSelect: 'none'
        });

        btn.addEventListener('mouseenter', function () {
            if (!opts.bg) btn.style.background = 'rgba(255,255,255,0.18)';
        });
        btn.addEventListener('mouseleave', function () {
            if (!opts.bg) btn.style.background = 'rgba(255,255,255,0.08)';
        });
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });

        return btn;
    }

    // =========================================================
    // RENDER COMPACT
    // =========================================================

    function renderCompact() {
        const el = BH.overlayEl;
        el.style.width = 'auto';
        el.style.padding = '6px 10px';
        el.style.borderColor = 'rgba(255,255,255,0.12)';

        el.innerHTML = '';

        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
        });

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);

        const dot = document.createElement('span');
        dot.textContent = '●';
        dot.style.color = BH.activeAuto ? '#70e0a8' : '#666';
        dot.style.fontWeight = '700';
        row.appendChild(dot);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = template ? template.name : 'No template';
        nameSpan.style.color = BH.activeAuto ? '#70e0a8' : '#ff9966';
        nameSpan.style.fontWeight = '700';
        row.appendChild(nameSpan);

        const speedSpan = document.createElement('span');
        speedSpan.textContent = BH.getSpeed() + '×';
        speedSpan.style.color = BH.getSpeed() === 1 ? '#ddd' : '#66ff66';
        speedSpan.style.fontWeight = '700';
        speedSpan.style.paddingLeft = '6px';
        speedSpan.style.borderLeft = '1px solid rgba(255,255,255,.15)';
        row.appendChild(speedSpan);

        const expandBtn = makeBtn('▼', function () {
            BH.overlayState = 'expanded';
            BH.render();
        }, { padding: '2px 6px' });
        row.appendChild(expandBtn);

        el.appendChild(row);
    }

    // =========================================================
    // RENDER EXPANDED
    // =========================================================

    function renderExpanded() {
        const el = BH.overlayEl;
        el.style.width = '270px';
        el.style.padding = '10px 12px';
        el.style.borderColor = 'rgba(255,255,255,0.12)';

        el.innerHTML = '';

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid rgba(255,255,255,.1)'
        });
        header.innerHTML = `
            <span style="color:#fff;font-weight:700;font-size:12px;letter-spacing:.3px;">BH BOT</span>
            <span style="color:#777;font-size:10px;">v2.0</span>
        `;
        el.appendChild(header);

        BH.renderTemplatePicker(el);

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);

        if (template && template.options && template.options.partySize) {
            renderPartySizeOption(el, template);
        }

        renderDelayPreset(el, template);
        renderSpeedDisplay(el);
        renderStartStop(el, template);
        renderTools(el, template);
        renderLog(el);
    }

    // =========================================================
    // PARTY SIZE OPTION (cho WB)
    // =========================================================

    function renderPartySizeOption(el, template) {
        const label = document.createElement('div');
        label.textContent = 'SỐ NGƯỜI:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: '10px',
            marginTop: '8px',
            marginBottom: '4px'
        });
        el.appendChild(label);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';

        const options = BH.loadTemplateOptions(template.id);
        const current = options.partySize || template.options.partySize.default;

        const values = template.options.partySize.values;
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            const isActive = v === current;

            row.appendChild(makeBtn(String(v), function () {
                const opts = BH.loadTemplateOptions(template.id);
                opts.partySize = v;
                BH.saveTemplateOptions(template.id, opts);
                BH.render();
            }, {
                bg: isActive ? 'rgba(112,224,168,0.25)' : undefined,
                color: isActive ? '#70e0a8' : undefined,
                border: isActive ? '1px solid #70e0a8' : undefined
            }));
        }

        el.appendChild(row);
    }

    // =========================================================
    // DELAY PRESET
    // =========================================================

    const DELAY_PRESETS = [300, 500, 1000, 2000, 5000];

    function renderDelayPreset(el, template) {
        if (!template) return;

        const label = document.createElement('div');
        label.textContent = 'DELAY QUÉT:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: '10px',
            marginTop: '8px',
            marginBottom: '4px'
        });
        el.appendChild(label);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';

        const current = BH.getTemplateInterval(template.id);

        for (let i = 0; i < DELAY_PRESETS.length; i++) {
            const ms = DELAY_PRESETS[i];
            const isActive = ms === current;
            const lbl = (ms >= 1000) ? (ms / 1000) + 's' : (ms / 1000).toFixed(1) + 's';

            row.appendChild(makeBtn(lbl, function () {
                BH.setTemplateInterval(template.id, ms);
            }, {
                bg: isActive ? 'rgba(112,224,168,0.25)' : undefined,
                color: isActive ? '#70e0a8' : undefined,
                border: isActive ? '1px solid #70e0a8' : undefined
            }));
        }

        el.appendChild(row);
    }

    // =========================================================
    // SPEED DISPLAY (chỉ hiển thị, đổi bằng +/-)
    // =========================================================

    function renderSpeedDisplay(el) {
        const label = document.createElement('div');
        label.textContent = 'SPEED:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: '10px',
            marginTop: '8px',
            marginBottom: '4px'
        });
        el.appendChild(label);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';

        const speedSpan = document.createElement('span');
        speedSpan.textContent = BH.getSpeed() + '×  (+/- để đổi)';
        speedSpan.style.color = BH.getSpeed() === 1 ? '#ddd' : '#66ff66';
        speedSpan.style.fontWeight = '700';
        speedSpan.style.fontSize = '12px';
        row.appendChild(speedSpan);

        el.appendChild(row);
    }

    // =========================================================
    // START / STOP
    // =========================================================

    function renderStartStop(el, template) {
        if (!template) return;

        const row = document.createElement('div');
        Object.assign(row.style, {
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,.1)'
        });

        const isRunning = BH.activeAuto === template.id;

        if (isRunning) {
            row.appendChild(makeBtn('[⏸ DỪNG]', function () {
                BH.stopAuto();
            }, {
                bg: 'rgba(255,153,102,0.2)',
                color: '#ff9966',
                border: '1px solid #ff9966',
                padding: '6px 12px',
                fontSize: '11px'
            }));
        } else {
            row.appendChild(makeBtn('[▶ BẮT ĐẦU]', function () {
                BH.startAuto(template.id);
            }, {
                bg: 'rgba(112,224,168,0.2)',
                color: '#70e0a8',
                border: '1px solid #70e0a8',
                padding: '6px 12px',
                fontSize: '11px'
            }));
        }

        el.appendChild(row);
    }

    // =========================================================
    // TOOLS
    // =========================================================

    function renderTools(el, template) {
        if (!template) return;

        const label = document.createElement('div');
        label.textContent = 'CÔNG CỤ:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: '10px',
            marginTop: '8px',
            marginBottom: '4px'
        });
        el.appendChild(label);

        const row = document.createElement('div');
        row.style.flexWrap = 'wrap';
        row.style.display = 'flex';

        row.appendChild(makeBtn(
            BH.setupMode ? '[Thoát Setup]' : '[Setup]',
            function () { BH.toggleSetupMode(); }
        ));

        row.appendChild(makeBtn(
            BH.testMode ? '[Thoát Test]' : '[Test]',
            function () { BH.toggleTestMode(); }
        ));

        el.appendChild(row);
    }

    // =========================================================
    // LOG
    // =========================================================

    function renderLog(el) {
        const log = document.createElement('div');
        Object.assign(log.style, {
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255,255,255,.1)',
            color: '#9aa',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        });
        log.textContent = BH.lastMsg || ' ';
        el.appendChild(log);
    }

    // =========================================================
    // RENDER SETUP PANEL
    // =========================================================

    function renderSetupPanel() {
        const el = BH.overlayEl;
        el.style.width = '230px';
        el.style.padding = '10px 12px';
        el.style.borderColor = '#ffaa33';

        el.innerHTML = '';

        const header = document.createElement('div');
        Object.assign(header.style, {
            color: '#ffaa33',
            fontWeight: '700',
            fontSize: '12px',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid rgba(255,170,51,.3)'
        });
        header.textContent = '🔧 SETUP · ' + (BH.setupTemplate ? BH.setupTemplate.name : '');
        el.appendChild(header);

        if (BH.setupTemplate) {
            for (let i = 0; i < BH.setupTemplate.steps.length; i++) {
                const step = BH.setupTemplate.steps[i];

                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    marginBottom: '3px',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    background: step.calibrated ? 'rgba(112,224,168,.1)' : 'rgba(255,170,51,.1)'
                });

                const info = document.createElement('span');
                info.textContent = (step.calibrated ? '✓ ' : '⚠ ') + step.label +
                    (step.hex ? '  ' + step.hex : '  chưa đặt');
                info.style.color = step.calibrated ? '#70e0a8' : '#ffaa33';
                info.style.flex = '1';
                row.appendChild(info);

                if (step.calibrated) {
                    const resetBtn = makeBtn('↺', function () {
                        BH.resetStep(step.id);
                    }, { padding: '1px 5px', fontSize: '9px' });
                    row.appendChild(resetBtn);
                }

                el.appendChild(row);
            }
        }

        const bottomRow = document.createElement('div');
        Object.assign(bottomRow.style, {
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255,255,255,.1)'
        });

        bottomRow.appendChild(makeBtn('[Thoát]', function () {
            BH.exitSetupMode();
        }, { color: '#ffaa33', border: '1px solid #ffaa33', bg: 'rgba(255,170,51,0.15)' }));

        el.appendChild(bottomRow);
    }

    // =========================================================
    // RENDER TEST PANEL
    // =========================================================

    function renderTestPanel() {
        const el = BH.overlayEl;
        el.style.width = '250px';
        el.style.padding = '10px 12px';
        el.style.borderColor = '#ff66cc';

        el.innerHTML = '';

        const header = document.createElement('div');
        Object.assign(header.style, {
            color: '#ff66cc',
            fontWeight: '700',
            fontSize: '12px',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid rgba(255,102,204,.3)'
        });
        header.textContent = '🧪 TEST';
        el.appendChild(header);

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);

        if (template) {
            for (let i = 0; i < template.steps.length; i++) {
                const step = template.steps[i];
                const result = BH.getTestResult(step.id);

                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    marginBottom: '3px',
                    padding: '2px 4px'
                });

                let icon, color;

                if (!result || result.status === 'uncalibrated') {
                    icon = '⚠';
                    color = '#ffaa33';
                } else if (result.status === 'match' || result.status === 'player') {
                    icon = '✓';
                    color = '#70e0a8';
                } else if (result.status === 'disabled') {
                    icon = '⊘';
                    color = '#666';
                } else if (result.status === 'empty') {
                    icon = '○';
                    color = '#8ea5c2';
                } else {
                    icon = '✗';
                    color = '#ff6666';
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = icon + ' ' + step.label;
                nameSpan.style.color = color;
                nameSpan.style.flex = '1';
                row.appendChild(nameSpan);

                if (result && result.actualHex) {
                    const hexSpan = document.createElement('span');
                    hexSpan.textContent = result.actualHex;
                    hexSpan.style.color = '#888';
                    hexSpan.style.fontSize = '9px';
                    row.appendChild(hexSpan);
                }

                el.appendChild(row);
            }
        }

        const bottomRow = document.createElement('div');
        Object.assign(bottomRow.style, {
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255,255,255,.1)'
        });

        bottomRow.appendChild(makeBtn('[Thoát Test]', function () {
            BH.exitTestMode();
        }, { color: '#ff66cc', border: '1px solid #ff66cc', bg: 'rgba(255,102,204,0.15)' }));

        el.appendChild(bottomRow);
    }

    // =========================================================
    // MAIN RENDER
    // =========================================================

    BH.render = function () {
        BH.ensureOverlay();

        if (BH.setupMode) {
            BH.overlayEl.style.display = 'block';
            renderSetupPanel();
            return;
        }

        if (BH.testMode) {
            BH.overlayEl.style.display = 'block';
            renderTestPanel();
            return;
        }

        if (BH.overlayState === 'hidden') {
            BH.overlayEl.style.display = 'none';
            return;
        }

        BH.overlayEl.style.display = 'block';

        if (BH.overlayState === 'compact') {
            renderCompact();
        } else {
            renderExpanded();
        }
    };

    // =========================================================
    // SET MSG
    // =========================================================

    BH.setMsg = function (msg) {
        BH.lastMsg = msg;

        if (!BH.setupMode && !BH.testMode && BH.overlayState !== 'hidden') {
            BH.render();
        }
    };

    // =========================================================
    // CYCLE OVERLAY
    // =========================================================

    BH.cycleOverlay = function () {
        if (BH.setupMode) {
            BH.exitSetupMode();
            return;
        }
        if (BH.testMode) {
            BH.exitTestMode();
            return;
        }

        const idx = OVERLAY_STATES.indexOf(BH.overlayState);
        const next = (idx + 1) % OVERLAY_STATES.length;
        BH.overlayState = OVERLAY_STATES[next];

        BH.render();
    };

})(window);