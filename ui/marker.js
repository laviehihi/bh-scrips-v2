// ui/marker.js
// Marker component — kéo thả để calibrate
//
// States:
// - pending: chưa calibrate, hiện vòng tròn dashed hồng
// - dragging: đang kéo
// - done: đã calibrate, hiện tick xanh

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    const COLOR_PENDING = '#ffaa33';
    const COLOR_DRAGGING = '#ff00cc';
    const COLOR_DONE = '#00ffff';

    // =========================================================
    // CREATE MARKER
    // =========================================================

    BH.createMarker = function (step, options) {
        options = options || {};

        const marker = document.createElement('div');

        Object.assign(marker.style, {
            position: 'fixed',
            left: (options.x || window.innerWidth / 2) + 'px',
            top: (options.y || window.innerHeight / 2) + 'px',
            width: '40px',
            height: '40px',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            cursor: 'move',
            zIndex: '2147483646'
        });

        const iconContainer = document.createElement('div');
        Object.assign(iconContainer.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none'
        });

        const circle = document.createElement('div');
        Object.assign(circle.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '24px',
            height: '24px',
            border: '2px dashed ' + COLOR_PENDING,
            borderRadius: '50%',
            background: 'rgba(255, 170, 51, 0.15)',
            boxShadow: '0 0 10px ' + COLOR_PENDING,
            transform: 'translate(-50%, -50%)',
            animation: 'bh-marker-pulse 1s ease-in-out infinite',
            transition: 'opacity .3s, border-color .3s'
        });

        const centerDot = document.createElement('div');
        Object.assign(centerDot.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '4px',
            height: '4px',
            background: COLOR_PENDING,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 4px ' + COLOR_PENDING,
            pointerEvents: 'none',
            transition: 'opacity .3s, background .3s'
        });

        const checkmark = document.createElement('div');
        Object.assign(checkmark.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            color: COLOR_DONE,
            fontSize: '24px',
            fontWeight: 'bold',
            textShadow: '0 0 8px ' + COLOR_DONE + ', 0 0 16px ' + COLOR_DONE,
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity .3s'
        });
        checkmark.textContent = '✓';

        iconContainer.appendChild(circle);
        iconContainer.appendChild(centerDot);
        iconContainer.appendChild(checkmark);
        marker.appendChild(iconContainer);

        const label = document.createElement('div');
        Object.assign(label.style, {
            position: 'absolute',
            left: '50%',
            top: '100%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '3px 8px',
            background: 'rgba(0,0,0,0.85)',
            color: COLOR_PENDING,
            fontSize: '10px',
            fontFamily: 'Consolas, monospace',
            fontWeight: '700',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
        });
        label.textContent = step.label || step.id;
        marker.appendChild(label);

        // Inject keyframe CSS 1 lần
        if (!document.getElementById('bh-marker-style')) {
            const style = document.createElement('style');
            style.id = 'bh-marker-style';
            style.textContent = `
                @keyframes bh-marker-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }

        (document.documentElement || document.body).appendChild(marker);

        marker._elements = {
            circle: circle,
            centerDot: centerDot,
            checkmark: checkmark,
            label: label
        };

        marker._step = step;

        return marker;
    };

    // =========================================================
    // SET STATE
    // =========================================================

    BH.setMarkerState = function (marker, state, hex) {
        const el = marker._elements;
        if (!el) return;

        if (state === 'pending') {
            el.circle.style.opacity = '1';
            el.circle.style.borderColor = COLOR_PENDING;
            el.circle.style.boxShadow = '0 0 10px ' + COLOR_PENDING;
            el.circle.style.background = 'rgba(255, 170, 51, 0.15)';

            el.centerDot.style.opacity = '1';
            el.centerDot.style.background = COLOR_PENDING;
            el.centerDot.style.boxShadow = '0 0 4px ' + COLOR_PENDING;

            el.checkmark.style.opacity = '0';

            el.label.style.color = COLOR_PENDING;
        } else if (state === 'dragging') {
            el.circle.style.opacity = '1';
            el.circle.style.borderColor = COLOR_DRAGGING;
            el.circle.style.boxShadow = '0 0 12px ' + COLOR_DRAGGING;
            el.circle.style.background = 'rgba(255, 0, 204, 0.2)';

            el.centerDot.style.opacity = '1';
            el.centerDot.style.background = COLOR_DRAGGING;
            el.centerDot.style.boxShadow = '0 0 4px ' + COLOR_DRAGGING;

            el.checkmark.style.opacity = '0';

            el.label.style.color = COLOR_DRAGGING;
        } else if (state === 'checking') {
            el.circle.style.opacity = '1';
            el.circle.style.borderColor = '#ff66cc';
            el.circle.style.boxShadow = '0 0 12px #ff66cc';

            el.centerDot.style.opacity = '1';
            el.centerDot.style.background = '#ff66cc';

            el.checkmark.style.opacity = '0';

            el.label.textContent = 'Đang lấy màu...';
            el.label.style.color = '#ff66cc';
        } else if (state === 'done') {
            el.circle.style.opacity = '0';
            el.centerDot.style.opacity = '0';
            el.checkmark.style.opacity = '1';
            el.label.textContent = '✓ ' + (marker._step.label || marker._step.id) + ' ' + (hex || '');
            el.label.style.color = COLOR_DONE;
        }
    };

    // =========================================================
    // REMOVE
    // =========================================================

    BH.removeMarker = function (marker) {
        if (marker && marker.parentNode) {
            marker.remove();
        }
    };

})(window);