// core/speed-hack.js
// Override timing APIs để tăng tốc game
// PHẢI load SAU real-time.js (để BH.rt đã có)

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // =========================================================
    // SPEED STATE
    // =========================================================

    BH.MIN_SPEED = 1;
    BH.MAX_SPEED = 10;
    BH.speed = 1;

    // =========================================================
    // DATE.NOW — virtual clock
    // =========================================================

    let virtualDate = null;
    let previousDate = null;

    Date.now = function () {
        const realNow = BH.rt.now();

        if (virtualDate === null) {
            virtualDate = realNow;
            previousDate = realNow;
            return Math.floor(virtualDate);
        }

        const delta = realNow - previousDate;
        virtualDate += delta * BH.speed;
        previousDate = realNow;

        return Math.floor(virtualDate);
    };

    // =========================================================
    // PERFORMANCE.NOW — virtual clock
    // =========================================================

    let virtualPerf = null;
    let previousPerf = null;

    window.performance.now = function () {
        const realNow = BH.rt.perf();

        if (virtualPerf === null) {
            virtualPerf = realNow;
            previousPerf = realNow;
            return virtualPerf;
        }

        const delta = realNow - previousPerf;
        virtualPerf += delta * BH.speed;
        previousPerf = realNow;

        return virtualPerf;
    };

    // =========================================================
    // SETTIMEOUT / SETINTERVAL — chia delay cho speed
    // =========================================================

    window.setTimeout = function (handler, timeout) {
        const args = Array.prototype.slice.call(arguments, 2);
        if (!timeout) timeout = 0;
        return BH.rt.setTimeout.apply(null, [handler, timeout / BH.speed].concat(args));
    };

    window.clearTimeout = function (id) {
        return BH.rt.clearTimeout(id);
    };

    window.setInterval = function (handler, timeout) {
        const args = Array.prototype.slice.call(arguments, 2);
        if (!timeout) timeout = 0;
        return BH.rt.setInterval.apply(null, [handler, timeout / BH.speed].concat(args));
    };

    window.clearInterval = function (id) {
        return BH.rt.clearInterval(id);
    };

    // =========================================================
    // REQUEST ANIMATION FRAME — gọi callback nhiều lần/frame
    // =========================================================

    const rafCallbacks = [];
    const rafTicks = [];

    let rafDisabled = false;

    window.requestAnimationFrame = function (callback) {
        if (rafDisabled) {
            return 1;
        }

        return BH.rt.raf(function () {
            let index = rafCallbacks.indexOf(callback);

            if (index === -1) {
                rafCallbacks.push(callback);
                rafTicks.push(0);
                callback(window.performance.now());
                return;
            }

            if (BH.speed <= 1) {
                callback(window.performance.now());
                return;
            }

            let tickFrame = rafTicks[index];
            tickFrame += BH.speed;

            if (tickFrame >= 1) {
                const startTime = BH.rt.perf();

                while (tickFrame >= 1) {
                    try {
                        callback(window.performance.now());
                    } catch (error) {
                        console.error('[BH RAF]', error);
                    }

                    rafDisabled = true;
                    tickFrame -= 1;

                    if (BH.rt.perf() - startTime > 15) {
                        tickFrame = 0;
                        break;
                    }
                }

                rafDisabled = false;
            } else {
                callback(window.performance.now());
            }

            rafTicks[index] = tickFrame;
        });
    };

    // =========================================================
    // SPEED CONTROL
    // =========================================================

    BH.getSpeed = function () {
        return BH.speed;
    };

    BH.setSpeed = function (newSpeed) {
        newSpeed = Math.max(BH.MIN_SPEED, Math.min(BH.MAX_SPEED, newSpeed));

        if (newSpeed === BH.speed) return;

        BH.speed = newSpeed;

        console.log('[BH] Speed: ' + BH.speed + 'x');

        if (BH.render) BH.render();
    };

})(window);