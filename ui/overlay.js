// ui/overlay.js
// Overlay chính — compact / expanded / setup / test
// Auto-scale theo canvas size

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const OVERLAY_STATES = ['compact', 'expanded', 'hidden'];

    BH.overlayState = 'compact';
    BH.overlayEl = null;
    BH.lastMsg = '';
    BH.passthrough = false;

    // =========================================================
    // AUTO-SCALE
    // =========================================================

    function getOverlayScale() {
        const canvas = BH.getCanvas();
        if (!canvas) return 1;

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;

        if (w < 500) return 0.75;
        if (w < 800) return 0.9;
        if (w < 1200) return 1;
        if (w < 1600) return 1.1;
        return 1.2;
    }

    function applyScale(el) {
        const scale = getOverlayScale();
        el.style.fontSize = (11 * scale) + 'px';
        return scale;
    }

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

        const isDisabled = opts.disabled === true;

        Object.assign(btn.style, {
            padding: opts.padding || '4px 8px',
            margin: '2px',
            background: opts.bg || 'rgba(255,255,255,0.08)',
            color: opts.color || '#ddd',
            border: opts.border || '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: opts.fontSize || '10px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'background .15s',
            pointerEvents: isDisabled ? 'none' : 'auto',
            userSelect: 'none',
            opacity: isDisabled ? '0.4' : '1'
        });

        if (!isDisabled) {
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
        }

        return btn;
    }

    // =========================================================
    // RENDER COMPACT
    // =========================================================

    function renderCompact() {
        const el = BH.overlayEl;
        const scale = applyScale(el);
        el.style.width = 'auto';
        el.style.padding = (6 * scale) + 'px ' + (10 * scale) + 'px';
        el.style.borderColor = 'rgba(255,255,255,0.12)';

        el.innerHTML = '';

        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            alignItems: 'center',
            gap: (8 * scale) + 'px',
            fontSize: (12 * scale) + 'px',
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

        // WB → hiện số người
        if (template && template.id === 'wb' && BH.activeAuto === 'wb') {
            const countSpan = document.createElement('span');
            const current = BH.wbCurrentPlayers || 0;
            const total = BH.wbPartySize || 1;
            const isFull = current >= total;

            countSpan.textContent = current + '/' + total;
            countSpan.style.color = isFull ? '#70e0a8' : '#ffaa33';
            countSpan.style.fontWeight = '700';
            countSpan.style.paddingLeft = (6 * scale) + 'px';
            countSpan.style.borderLeft = '1px solid rgba(255,255,255,.15)';
            row.appendChild(countSpan);
        }

        // Speed
        const speedSpan = document.createElement('span');
        speedSpan.textContent = BH.getSpeed() + '×';
        speedSpan.style.color = BH.getSpeed() === 1 ? '#ddd' : '#66ff66';
        speedSpan.style.fontWeight = '700';
        speedSpan.style.paddingLeft = (6 * scale) + 'px';
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
        const scale = applyScale(el);
        el.style.width = (270 * scale) + 'px';
        el.style.padding = (10 * scale) + 'px ' + (12 * scale) + 'px';
        el.style.borderColor = 'rgba(255,255,255,0.12)';

        el.innerHTML = '';

        const isRunning = BH.activeAuto !== null;

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: (8 * scale) + 'px',
            paddingBottom: (6 * scale) + 'px',
            borderBottom: '1px solid rgba(255,255,255,.1)'
        });
        header.innerHTML = `
            <span style="color:#fff;font-weight:700;font-size:${12 * scale}px;letter-spacing:.3px;">BH BOT</span>
            <span style="color:#777;font-size:${10 * scale}px;">v2.0</span>
        `;
        el.appendChild(header);

        BH.renderTemplatePicker(el, isRunning);

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);

        if (template && template.options && template.options.partySize) {
            renderPartySizeOption(el, template, isRunning, scale);
        }

        renderClickDelayPreset(el, template, isRunning, scale);
        renderStartStopTools(el, template, scale);
        renderLog(el, scale);
    }

    // =========================================================
    // PARTY SIZE
    // =========================================================

    function renderPartySizeOption(el, template, isRunning, scale) {
        const label = document.createElement('div');
        label.textContent = 'SỐ NGƯỜI:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: (10 * scale) + 'px',
            marginTop: (8 * scale) + 'px',
            marginBottom: (4 * scale) + 'px'
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
                border: isActive ? '1px solid #70e0a8' : undefined,
                disabled: isRunning
            }));
        }

        el.appendChild(row);
    }

    // =========================================================
    // CLICK DELAY PRESET
    // =========================================================

    const DELAY_PRESETS = [300, 500, 1000, 2000, 5000];

    function renderClickDelayPreset(el, template, isRunning, scale) {
        if (!template) return;

        const label = document.createElement('div');
        label.textContent = 'DELAY CLICK:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: (10 * scale) + 'px',
            marginTop: (8 * scale) + 'px',
            marginBottom: (4 * scale) + 'px'
        });
        el.appendChild(label);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';

        const current = BH.getTemplateClickDelay(template.id);

        for (let i = 0; i < DELAY_PRESETS.length; i++) {
            const ms = DELAY_PRESETS[i];
            const isActive = ms === current;
            const lbl = (ms >= 1000) ? (ms / 1000) + 's' : (ms / 1000).toFixed(1) + 's';

            row.appendChild(makeBtn(lbl, function () {
                BH.setTemplateClickDelay(template.id, ms);
            }, {
                bg: isActive ? 'rgba(112,224,168,0.25)' : undefined,
                color: isActive ? '#70e0a8' : undefined,
                border: isActive ? '1px solid #70e0a8' : undefined,
                disabled: isRunning
            }));
        }

        el.appendChild(row);
    }

    // =========================================================
    // START/STOP + TOOLS (gộp)
    // =========================================================

    function renderStartStopTools(el, template, scale) {
        if (!template) return;

        const row = document.createElement('div');
        Object.assign(row.style, {
            marginTop: (10 * scale) + 'px',
            paddingTop: (8 * scale) + 'px',
            borderTop: '1px solid rgba(255,255,255,.1)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center'
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

        row.appendChild(makeBtn('[Setup]', function () {
            BH.toggleSetupMode();
        }, {
            disabled: isRunning,
            padding: '6px 10px',
            fontSize: '11px'
        }));

        row.appendChild(makeBtn('[Test]', function () {
            BH.toggleTestMode();
        }, {
            disabled: isRunning,
            padding: '6px 10px',
            fontSize: '11px'
        }));

        el.appendChild(row);
    }

    // =========================================================
    // LOG
    // =========================================================

    function renderLog(el, scale) {
        const log = document.createElement('div');
        Object.assign(log.style, {
            marginTop: (8 * scale) + 'px',
            paddingTop: (6 * scale) + 'px',
            borderTop: '1px solid rgba(255,255,255,.1)',
            color: '#9aa',
            fontSize: (10 * scale) + 'px',
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
        const scale = applyScale(el);

        // Thu gọn
        if (BH.setupCollapsed) {
            el.style.width = 'auto';
            el.style.padding = (6 * scale) + 'px ' + (10 * scale) + 'px';
            el.style.borderColor = '#ffaa33';

            el.innerHTML = '';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = (6 * scale) + 'px';

            const txt = document.createElement('span');
            txt.textContent = '🔧 SETUP · ' + (BH.setupTemplate ? BH.setupTemplate.name : '');
            txt.style.color = '#ffaa33';
            txt.style.fontWeight = '700';
            txt.style.fontSize = (11 * scale) + 'px';
            row.appendChild(txt);

            row.appendChild(makeBtn('▲', function () {
                BH.setupCollapsed = false;
                BH.render();
            }, { padding: '2px 6px', color: '#ffaa33', border: '1px solid #ffaa33' }));

            row.appendChild(makeBtn('×', function () {
                BH.exitSetupMode();
            }, { padding: '2px 6px', color: '#ff6666', border: '1px solid #ff6666' }));

            el.appendChild(row);
            return;
        }

        el.style.width = (240 * scale) + 'px';
        el.style.padding = (10 * scale) + 'px ' + (12 * scale) + 'px';
        el.style.borderColor = '#ffaa33';

        el.innerHTML = '';

        // Header + nút
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: (8 * scale) + 'px',
            paddingBottom: (6 * scale) + 'px',
            borderBottom: '1px solid rgba(255,170,51,.3)'
        });

        const headerTitle = document.createElement('span');
        headerTitle.textContent = '🔧 SETUP · ' + (BH.setupTemplate ? BH.setupTemplate.name : '');
        headerTitle.style.color = '#ffaa33';
        headerTitle.style.fontWeight = '700';
        headerTitle.style.fontSize = (12 * scale) + 'px';
        headerTitle.style.flex = '1';
        header.appendChild(headerTitle);

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '4px';

        btnGroup.appendChild(makeBtn('─', function () {
            BH.setupCollapsed = true;
            BH.render();
        }, { padding: '1px 6px', color: '#ffaa33', border: '1px solid #ffaa33' }));

        btnGroup.appendChild(makeBtn('×', function () {
            BH.exitSetupMode();
        }, { padding: '1px 6px', color: '#ff6666', border: '1px solid #ff6666' }));

        header.appendChild(btnGroup);
        el.appendChild(header);

        // Current step info
        const total = BH.setupTemplate ? BH.setupTemplate.steps.length : 0;
        const curIndex = BH.setupCurrentIndex;
        const curStep = BH.setupTemplate ? BH.setupTemplate.steps[curIndex] : null;

        if (curStep) {
            const info = document.createElement('div');
            Object.assign(info.style, {
                fontSize: (11 * scale) + 'px',
                marginBottom: (8 * scale) + 'px',
                lineHeight: '1.6'
            });

            info.innerHTML = `
                <div style="color:#fff;font-weight:700;margin-bottom:4px;">
                    Nút ${curIndex + 1}/${total}: ${curStep.label}
                </div>
                <div style="color:#888;font-size:${10 * scale}px;">
                    ${curStep.hint || ''}
                </div>
                <div style="color:${curStep.calibrated ? '#70e0a8' : '#ffaa33'};font-size:${10 * scale}px;margin-top:4px;">
                    ${curStep.calibrated ? '✓ ' + curStep.hex : '⚠ Chưa setup'}
                </div>
            `;

            el.appendChild(info);
        }

        // Nav buttons
        const navRow = document.createElement('div');
        Object.assign(navRow.style, {
            display: 'flex',
            gap: '6px',
            marginBottom: (8 * scale) + 'px'
        });

        navRow.appendChild(makeBtn('← Trước', function () {
            BH.setupPrevStep();
        }, {
            disabled: curIndex <= 0,
            flex: '1'
        }));

        navRow.appendChild(makeBtn('Tiếp →', function () {
            BH.setupNextStep();
        }, {
            disabled: curIndex >= total - 1,
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

        if (BH.setupTemplate) {
            for (let i = 0; i < BH.setupTemplate.steps.length; i++) {
                const s = BH.setupTemplate.steps[i];
                const dot = document.createElement('div');

                let bg;
                if (i === curIndex) bg = '#ffaa33';
                else if (s.calibrated) bg = '#70e0a8';
                else bg = 'rgba(255,255,255,.15)';

                Object.assign(dot.style, {
                    width: (8 * scale) + 'px',
                    height: (8 * scale) + 'px',
                    borderRadius: '50%',
                    background: bg,
                    boxShadow: i === curIndex ? '0 0 6px #ffaa33' : 'none'
                });

                progressRow.appendChild(dot);
            }
        }

        el.appendChild(progressRow);
    }

    // =========================================================
    // RENDER TEST PANEL
    // =========================================================

    function renderTestPanel() {
        const el = BH.overlayEl;
        const scale = applyScale(el);

        if (BH.testCollapsed) {
            el.style.width = 'auto';
            el.style.padding = (6 * scale) + 'px ' + (10 * scale) + 'px';
            el.style.borderColor = '#ff66cc';

            el.innerHTML = '';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = (6 * scale) + 'px';

            const txt = document.createElement('span');
            txt.textContent = '🧪 TEST';
            txt.style.color = '#ff66cc';
            txt.style.fontWeight = '700';
            txt.style.fontSize = (11 * scale) + 'px';
            row.appendChild(txt);

            row.appendChild(makeBtn('▲', function () {
                BH.testCollapsed = false;
                BH.render();
            }, { padding: '2px 6px', color: '#ff66cc', border: '1px solid #ff66cc' }));

            row.appendChild(makeBtn('×', function () {
                BH.exitTestMode();
            }, { padding: '2px 6px', color: '#ff6666', border: '1px solid #ff6666' }));

            el.appendChild(row);
            return;
        }

        el.style.width = (280 * scale) + 'px';
        el.style.padding = (10 * scale) + 'px ' + (12 * scale) + 'px';
        el.style.borderColor = '#ff66cc';

        el.innerHTML = '';

        // Header + nút
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: (8 * scale) + 'px',
            paddingBottom: (6 * scale) + 'px',
            borderBottom: '1px solid rgba(255,102,204,.3)'
        });

        const headerTitle = document.createElement('span');
        headerTitle.textContent = '🧪 TEST';
        headerTitle.style.color = '#ff66cc';
        headerTitle.style.fontWeight = '700';
        headerTitle.style.fontSize = (12 * scale) + 'px';
        headerTitle.style.flex = '1';
        header.appendChild(headerTitle);

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '4px';

        btnGroup.appendChild(makeBtn('─', function () {
            BH.testCollapsed = true;
            BH.render();
        }, { padding: '1px 6px', color: '#ff66cc', border: '1px solid #ff66cc' }));

        btnGroup.appendChild(makeBtn('×', function () {
            BH.exitTestMode();
        }, { padding: '1px 6px', color: '#ff6666', border: '1px solid #ff6666' }));

        header.appendChild(btnGroup);
        el.appendChild(header);

        // List steps
        const listWrapper = document.createElement('div');
        Object.assign(listWrapper.style, {
            maxHeight: (250 * scale) + 'px',
            overflowY: 'auto'
        });

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();
        const template = BH.getTemplate(templateId);

        let matchCount = 0;
        let totalCount = 0;

        if (template) {
            for (let i = 0; i < template.steps.length; i++) {
                const step = template.steps[i];
                const result = BH.getTestResult(step.id);

                totalCount++;

                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: (10 * scale) + 'px',
                    marginBottom: '3px',
                    padding: '2px 4px',
                    gap: '6px'
                });

                let icon, color;

                if (!result || result.status === 'uncalibrated') {
                    icon = '⚠';
                    color = '#ffaa33';
                } else if (result.status === 'match' || result.status === 'player') {
                    icon = '✓';
                    color = '#70e0a8';
                    matchCount++;
                } else if (result.status === 'disabled') {
                    icon = '⊘';
                    color = '#666';
                } else if (result.status === 'empty') {
                    icon = '○';
                    color = '#8ea5c2';
                    matchCount++;
                } else {
                    icon = '✗';
                    color = '#ff6666';
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = icon + ' ' + step.label;
                nameSpan.style.color = color;
                nameSpan.style.flex = '1';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                row.appendChild(nameSpan);

                // Cột màu chuẩn (step.hex) — luôn xanh nếu có
                const expectedSpan = document.createElement('span');
                expectedSpan.textContent = step.hex || '---';
                expectedSpan.style.color = step.hex ? '#70e0a8' : '#666';
                expectedSpan.style.fontSize = (9 * scale) + 'px';
                expectedSpan.style.minWidth = (50 * scale) + 'px';
                expectedSpan.style.textAlign = 'right';
                row.appendChild(expectedSpan);

                // Cột màu thực tế — đỏ nếu sai, xanh nếu đúng
                const actualSpan = document.createElement('span');
                actualSpan.textContent = (result && result.actualHex) || '---';

                let actualColor = '#888';
                if (result && result.actualHex) {
                    if (result.status === 'match' || result.status === 'player' || result.status === 'empty') {
                        actualColor = '#70e0a8';
                    } else if (result.status === 'nomatch') {
                        actualColor = '#ff6666';
                    }
                }

                actualSpan.style.color = actualColor;
                actualSpan.style.fontSize = (9 * scale) + 'px';
                actualSpan.style.minWidth = (50 * scale) + 'px';
                actualSpan.style.textAlign = 'right';
                row.appendChild(actualSpan);

                listWrapper.appendChild(row);
            }
        }

        el.appendChild(listWrapper);

        // Match count
        const bottomRow = document.createElement('div');
        Object.assign(bottomRow.style, {
            marginTop: (8 * scale) + 'px',
            paddingTop: (6 * scale) + 'px',
            borderTop: '1px solid rgba(255,255,255,.1)',
            color: '#70e0a8',
            fontSize: (10 * scale) + 'px',
            fontWeight: '700',
            textAlign: 'center'
        });
        bottomRow.textContent = 'Match: ' + matchCount + '/' + totalCount;
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
            BH.setupCollapsed = !BH.setupCollapsed;
            BH.render();
            return;
        }
        if (BH.testMode) {
            BH.testCollapsed = !BH.testCollapsed;
            BH.render();
            return;
        }

        const idx = OVERLAY_STATES.indexOf(BH.overlayState);
        const next = (idx + 1) % OVERLAY_STATES.length;
        BH.overlayState = OVERLAY_STATES[next];

        BH.render();
    };

})(window);