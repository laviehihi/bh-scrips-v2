// ui/template-picker.js
// Dropdown chọn template

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.renderTemplatePicker = function (container) {
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
            cursor: 'pointer',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            userSelect: 'auto',
            WebkitUserSelect: 'auto',
            MozUserSelect: 'auto',
            position: 'relative',
            zIndex: '1'
        });

        const templateId = BH.activeTemplateId || BH.loadActiveTemplate();

        const templates = BH.getAllTemplates();
        for (let i = 0; i < templates.length; i++) {
            const t = templates[i];
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === templateId) opt.selected = true;
            select.appendChild(opt);
        }

        select.addEventListener('change', function () {
            const newId = select.value;

            if (BH.activeAuto) BH.stopAuto();

            BH.activeTemplateId = newId;
            BH.saveActiveTemplate(newId);

            BH.setMsg('Template: ' + BH.getTemplate(newId).name);
            BH.render();
        });

        // Chặn event bubble lên overlay
        select.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });

        container.appendChild(select);
    };

})(window);