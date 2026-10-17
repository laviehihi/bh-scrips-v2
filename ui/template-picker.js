// ui/template-picker.js
// Dropdown chọn template — có hiển thị hotkey

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.renderTemplatePicker = function (container, isRunning) {
        const label = document.createElement('div');
        label.textContent = 'TEMPLATE:';
        Object.assign(label.style, {
            color: '#888',
            fontSize: '10px',
            marginBottom: '4px'
        });
        container.appendChild(label);

        const select = document.createElement('select');
        select.setAttribute('data-bh-overlay', '1');

        Object.assign(select.style, {
            width: '100%',
            padding: '4px 6px',
            background: 'rgba(255,255,255,0.08)',
            color: '#ddd',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '11px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
            pointerEvents: isRunning ? 'none' : 'auto',
            userSelect: 'auto',
            WebkitUserSelect: 'auto',
            MozUserSelect: 'auto',
            position: 'relative',
            zIndex: '1',
            opacity: isRunning ? '0.4' : '1'
        });

        if (isRunning) {
            select.disabled = true;
        }

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();

        const templates = BH.getAllTemplates();
        for (let i = 0; i < templates.length; i++) {
            const t = templates[i];

            // WB có 2 option: solo (hotkey 4), team (hotkey 5)
            if (t.id === 'wb') {
                const optSolo = document.createElement('option');
                optSolo.value = 'wb_solo';
                optSolo.textContent = '[4] ' + t.name + ' (Solo)';
                if (templateId === 'wb' && BH.loadTemplateOptions('wb').partySize === 1) {
                    optSolo.selected = true;
                }
                select.appendChild(optSolo);

                const optTeam = document.createElement('option');
                optTeam.value = 'wb_team';
                optTeam.textContent = '[5] ' + t.name + ' (Team)';
                if (templateId === 'wb' && BH.loadTemplateOptions('wb').partySize > 1) {
                    optTeam.selected = true;
                }
                select.appendChild(optTeam);
                continue;
            }

            const opt = document.createElement('option');
            opt.value = t.id;
            const hk = t.hotkey ? '[' + t.hotkey + '] ' : '';
            opt.textContent = hk + t.name;
            if (t.id === templateId) opt.selected = true;
            select.appendChild(opt);
        }

        select.addEventListener('change', function () {
            const newId = select.value;

            if (BH.activeAuto) BH.stopAuto();

            if (newId === 'wb_solo') {
                BH.activeTemplateId = 'wb';
                BH.saveActiveTemplate('wb');

                const opts = BH.loadTemplateOptions('wb');
                opts.partySize = 1;
                BH.saveTemplateOptions('wb', opts);
            } else if (newId === 'wb_team') {
                BH.activeTemplateId = 'wb';
                BH.saveActiveTemplate('wb');

                const opts = BH.loadTemplateOptions('wb');
                if (!opts.partySize || opts.partySize === 1) {
                    opts.partySize = 2;
                }
                BH.saveTemplateOptions('wb', opts);
            } else {
                BH.activeTemplateId = newId;
                BH.saveActiveTemplate(newId);
            }

            BH.loadCalibration(BH.activeTemplateId);

            BH.setMsg('Template: ' + BH.getTemplate(BH.activeTemplateId).name);
            BH.render();
        });

        select.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });

        container.appendChild(select);
    };

})(window);