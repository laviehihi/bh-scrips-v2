// core/real-time.js
// Wrapper thời gian thực — bot dùng cái này để KHÔNG bị ảnh hưởng speed hack

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    // Lưu bản gốc TRƯỚC KHI bị override
    const _now = Date.now;
    const _perf = window.performance.now.bind(window.performance);
    const _setTimeout = window.setTimeout.bind(window);
    const _clearTimeout = window.clearTimeout.bind(window);
    const _setInterval = window.setInterval.bind(window);
    const _clearInterval = window.clearInterval.bind(window);
    const _raf = window.requestAnimationFrame.bind(window);

    BH.rt = {
        now: function () {
            return _now();
        },

        perf: function () {
            return _perf();
        },

        setTimeout: function (fn, ms) {
            const args = Array.prototype.slice.call(arguments, 2);
            return _setTimeout.apply(null, [fn, ms].concat(args));
        },

        clearTimeout: function (id) {
            return _clearTimeout(id);
        },

        setInterval: function (fn, ms) {
            const args = Array.prototype.slice.call(arguments, 2);
            return _setInterval.apply(null, [fn, ms].concat(args));
        },

        clearInterval: function (id) {
            return _clearInterval(id);
        },

        raf: function (cb) {
            return _raf(cb);
        }
    };

    // Alias cho code cũ (nếu cần)
    BH.originalDateNow = _now;
    BH.originalPerformanceNow = _perf;
    BH.originalSetTimeout = _setTimeout;
    BH.originalClearTimeout = _clearTimeout;
    BH.originalSetInterval = _setInterval;
    BH.originalClearInterval = _clearInterval;
    BH.originalRAF = _raf;

})(window);