// core/templates.js
// Định nghĩa các template hoạt động

(function (global) {
    'use strict';

    const BH = global.__BH__ = global.__BH__ || {};

    BH.TEMPLATES = {

        // =========================================================
        // RERUN
        // =========================================================

        rerun: {
            id: 'rerun',
            name: 'Auto Rerun',
            description: 'Click nút Rerun khi hiện',
            defaultClickDelay: 500,
            steps: [
                {
                    id: 'rerun',
                    label: 'Nút Rerun',
                    hint: 'Nút xanh lá sau khi trận xong',
                    type: 'click',
                    required: true
                }
            ],
            flow: {
                type: 'sequential',
                order: ['rerun'],
                loop: true
            }
        },

        // =========================================================
        // PVP
        // =========================================================

        pvp: {
            id: 'pvp',
            name: 'Auto PvP',
            description: 'Auto đánh PvP',
            defaultClickDelay: 500,
            steps: [
                {
                    id: 'start',
                    label: 'Start',
                    hint: 'Nút bắt đầu tìm trận',
                    type: 'click',
                    required: true
                },
                {
                    id: 'selectOpponent',
                    label: 'Chọn đối thủ',
                    hint: 'Nút chọn đối thủ',
                    type: 'click',
                    required: true
                },
                {
                    id: 'confirmTeam',
                    label: 'Xác nhận team',
                    hint: 'Nút xác nhận team mang ra đánh',
                    type: 'click',
                    required: true
                },
                {
                    id: 'yesNo',
                    label: 'Yes/No (confirm)',
                    hint: 'Popup xác nhận khi chưa full team (option)',
                    type: 'optional',
                    required: false
                },
                {
                    id: 'returnHome',
                    label: 'Về thành',
                    hint: 'Nút về thành sau trận',
                    type: 'click',
                    required: true
                }
            ],
            flow: {
                type: 'sequential',
                order: ['start', 'selectOpponent', 'confirmTeam', 'yesNo', 'returnHome'],
                loop: true
            }
        },

        // =========================================================
        // TG
        // =========================================================

        tg: {
            id: 'tg',
            name: 'Auto TG',
            description: 'Auto đánh TG',
            defaultClickDelay: 500,
            steps: [
                {
                    id: 'start',
                    label: 'Start',
                    hint: 'Nút bắt đầu',
                    type: 'click',
                    required: true
                },
                {
                    id: 'confirmTeam',
                    label: 'Xác thực team',
                    hint: 'Nút xác thực team',
                    type: 'click',
                    required: true
                },
                {
                    id: 'yesNo',
                    label: 'Yes/No (confirm)',
                    hint: 'Popup xác nhận khi chưa full team (option)',
                    type: 'optional',
                    required: false
                },
                {
                    id: 'returnHome',
                    label: 'Về thành',
                    hint: 'Nút về thành sau trận',
                    type: 'click',
                    required: true
                }
            ],
            flow: {
                type: 'sequential',
                order: ['start', 'confirmTeam', 'yesNo', 'returnHome'],
                loop: true
            }
        },

        // =========================================================
        // WB
        // =========================================================

        wb: {
            id: 'wb',
            name: 'Auto WB',
            description: 'Auto đánh World Boss (solo + team)',
            defaultClickDelay: 500,

            options: {
                partySize: {
                    label: 'Số người',
                    values: [1, 2, 3, 4, 5],
                    default: 1
                }
            },

            config: {
                disabledHex: '#384250',
                tol: 15
            },

            steps: [
                {
                    id: 'slot1',
                    label: 'Slot 1',
                    hint: 'Nút invite ở vị trí 1',
                    type: 'slot',
                    required: true
                },
                {
                    id: 'slot2',
                    label: 'Slot 2',
                    hint: 'Nút invite ở vị trí 2',
                    type: 'slot',
                    required: true
                },
                {
                    id: 'slot3',
                    label: 'Slot 3',
                    hint: 'Nút invite ở vị trí 3',
                    type: 'slot',
                    required: true
                },
                {
                    id: 'slot4',
                    label: 'Slot 4',
                    hint: 'Nút invite ở vị trí 4 (nếu WB có)',
                    type: 'slot',
                    required: false
                },
                {
                    id: 'slot5',
                    label: 'Slot 5',
                    hint: 'Nút invite ở vị trí 5 (nếu WB có)',
                    type: 'slot',
                    required: false
                },
                {
                    id: 'start',
                    label: 'Start (chủ key)',
                    hint: 'Nút start khi đủ người khi là chủ key',
                    type: 'click',
                    required: true
                },
                {
                    id: 'ready',
                    label: 'Ready (thành viên)',
                    hint: 'Nút Ready nếu mình là thành viên',
                    type: 'optional',
                    required: false
                },
                {
                    id: 'yes',
                    label: 'Yes (confirm)',
                    hint: 'Popup xác nhận khi chưa full team (option)',
                    type: 'optional',
                    required: false
                },
                {
                    id: 'regroupWin',
                    label: 'Regroup (thắng)',
                    hint: 'Nút regroup khi thắng',
                    type: 'click',
                    required: true
                },
                {
                    id: 'regroupLose',
                    label: 'Regroup (thua)',
                    hint: 'Nút regroup khi thua',
                    type: 'click',
                    required: true
                }
            ],

            flow: {
                type: 'wb',
                order: ['start', 'ready', 'yes', 'regroupWin', 'regroupLose'],
                loop: true,
                slotCheck: true
            }
        },

        // =========================================================
        // INVA
        // =========================================================

        inva: {
            id: 'inva',
            name: 'Auto Inva',
            description: 'Auto đánh Inva — bật auto, chạy X giây, ESC',
            defaultClickDelay: 500,

            options: {
                duration: {
                    label: 'Thời gian chạy',
                    values: [5, 10, 20, 30, 60],
                    default: 10
                }
            },

            steps: [
                {
                    id: 'start',
                    label: 'Start',
                    hint: 'Nút bắt đầu',
                    type: 'click',
                    required: true
                },
                {
                    id: 'confirmTeam',
                    label: 'Xác nhận team',
                    hint: 'Nút xác nhận team',
                    type: 'click',
                    required: true
                },
                {
                    id: 'yesNo',
                    label: 'Yes (confirm)',
                    hint: 'Popup xác nhận khi chưa full (option)',
                    type: 'optional',
                    required: false
                },
                {
                    id: 'autoInGame',
                    label: 'Auto trong trận',
                    hint: 'Setup 2 màu: TẮT (lần 1) và BẬT (lần 2)',
                    type: 'toggle',
                    required: true,
                    hexOff: null,
                    hexOn: null
                },
                {
                    id: 'yesLeave',
                    label: 'Yes rời trận',
                    hint: 'Xác nhận rời trận sau ESC',
                    type: 'click',
                    required: true
                },
                {
                    id: 'returnHome',
                    label: 'Về thành',
                    hint: 'Nút về thành sau trận',
                    type: 'click',
                    required: true
                }
            ],

            flow: {
                type: 'inva',
                order: ['start', 'confirmTeam', 'yesNo', 'autoInGame', 'yesLeave', 'returnHome'],
                loop: true
            }
        },

        // =========================================================
        // CUSTOM
        // =========================================================

        custom: {
            id: 'custom',
            name: 'Rules',
            description: 'Tự thêm rules — flex cho mọi tình huống',
            defaultClickDelay: 500,
            steps: [
                {
                    id: 'rule1',
                    label: 'Rule 1',
                    hint: 'Kéo marker vào nút cần click',
                    type: 'click',
                    required: false
                }
            ],
            flow: {
                type: 'sequential',
                order: ['rule1'],
                loop: true
            }
        }

    };

    // =========================================================
    // HELPERS
    // =========================================================

    BH.getTemplate = function (id) {
        return BH.TEMPLATES[id] || null;
    };

    BH.getAllTemplates = function () {
        return Object.keys(BH.TEMPLATES).map(function (id) {
            return BH.TEMPLATES[id];
        });
    };

})(window);