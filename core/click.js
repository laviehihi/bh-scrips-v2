// core/click.js
// Dispatch click event chain + reset hover + click flash

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.isClicking = false;

    // =========================================================
    // FIRE EVENT
    // =========================================================

    function fireAll(targets, type, Ctor, opts) {
        for (let i = 0; i < targets.length; i++) {
            try {
                targets[i].dispatchEvent(new Ctor(type, opts));
            } catch (e) { }
        }
    }

    function makePointerOpts(x, y, buttons) {
        return {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: window.screenX + x,
            screenY: window.screenY + y,
            button: 0,
            buttons: buttons,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            pressure: buttons ? 0.5 : 0,
            width: 1,
            height: 1
        };
    }

    function makeMouseOpts(x, y, buttons) {
        return {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: window.screenX + x,
            screenY: window.screenY + y,
            button: 0,
            buttons: buttons,
            detail: 1
        };
    }

    // =========================================================
    // DISPATCH FULL CLICK
    // =========================================================

    BH.dispatchFullClick = function (canvas, x, y) {
        const targets = [canvas, document, window];

        fireAll(targets, 'pointerover', PointerEvent, makePointerOpts(x, y, 0));
        fireAll(targets, 'pointerenter', PointerEvent, makePointerOpts(x, y, 0));
        fireAll(targets, 'pointermove', PointerEvent, makePointerOpts(x, y, 0));
        fireAll(targets, 'mouseover', MouseEvent, makeMouseOpts(x, y, 0));
        fireAll(targets, 'mousemove', MouseEvent, makeMouseOpts(x, y, 0));

        fireAll(targets, 'pointerdown', PointerEvent, makePointerOpts(x, y, 1));
        fireAll(targets, 'mousedown', MouseEvent, makeMouseOpts(x, y, 1));

        fireAll(targets, 'pointerup', PointerEvent, makePointerOpts(x, y, 0));
        fireAll(targets, 'mouseup', MouseEvent, makeMouseOpts(x, y, 0));
        fireAll(targets, 'click', MouseEvent, makeMouseOpts(x, y, 0));

        fireAll(targets, 'pointerout', PointerEvent, makePointerOpts(x, y, 0));
        fireAll(targets, 'pointerleave', PointerEvent, makePointerOpts(x, y, 0));
        fireAll(targets, 'mouseout', MouseEvent, makeMouseOpts(x, y, 0));
        fireAll(targets, 'mouseleave', MouseEvent, makeMouseOpts(x, y, 0));
    };

    // =========================================================
    // CLICK AT BUFFER COORDS
    // =========================================================

    BH.clickAtBuf = function (bufX, bufY) {
        if (BH.isClicking) return false;

        const canvas = BH.getCanvas();
        if (!canvas) return false;

        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;

        const pos = BH.bufferToClient(canvas, bufX, bufY);

        if (pos.clientX < rect.left || pos.clientX > rect.right) return false;
        if (pos.clientY < rect.top || pos.clientY > rect.bottom) return false;

        BH.isClicking = true;

        BH.dispatchFullClick(canvas, pos.clientX, pos.clientY);

        if (BH.showClickFlash) {
            BH.showClickFlash(pos.clientX, pos.clientY);
        }

        BH.rt.setTimeout(function () {
            BH.resetHover();
        }, 100);

        BH.rt.setTimeout(function () {
            BH.isClicking = false;
        }, 200);

        return true;
    };

    // =========================================================
    // RESET HOVER
    // =========================================================

    BH.resetHover = function () {
        const canvas = BH.getCanvas();
        if (!canvas) return;

        const pos = BH.bufferToClient(
            canvas,
            BH.RESET_POINT_X,
            BH.RESET_POINT_Y
        );

        BH.dispatchFullClick(canvas, pos.clientX, pos.clientY);
    };

})(window);