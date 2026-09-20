// core/templates.js
// Định nghĩa các template hoạt động
//
// ĐỂ THÊM HOẠT ĐỘNG MỚI:
// 1. Thêm 1 entry vào BH.TEMPLATES
// 2. Define steps + flow
// 3. Không cần sửa file khác
//
// Step types hiện có: click, slot, optional
// Flow types hiện có: sequential, wb

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
            defaultInterval: 300,
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
            defaultInterval: 1000,
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
                    label: 'Yes/No (solo)',
                    hint: 'Popup xác nhận khi solo',
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
            defaultInterval: 1000,
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
                    label: 'Yes/No (solo)',
                    hint: 'Popup xác nhận khi solo',
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
        // WB (World Boss)
        // =========================================================

        wb: {
            id: 'wb',
            name: 'Auto WB',
            description: 'Auto đánh World Boss (solo + team)',
            defaultInterval: 2000,

            options: {
                partySize: {
                    label: 'Số người',
                    values: [1, 2, 3, 4, 5],
                    default: 1
                }
            },

            // Config cố định cho WB
            config: {
                // Màu slot không thuộc party (WB max < 5)
                disabledHex: '#384250',
                tol: 15
            },

            steps: [
                // 5 slot đếm người
                {
                    id: 'slot1',
                    label: 'Slot 1',
                    hint: 'Vị trí slot 1',
                    type: 'slot',
                    required: true
                },
                {
                    id: 'slot2',
                    label: 'Slot 2',
                    hint: 'Vị trí slot 2',
                    type: 'slot',
                    required: true
                },
                {
                    id: 'slot3',
                    label: 'Slot 3',
                    hint: 'Vị trí slot 3',
                    type: 'slot',
                    required: true
                },
                {
                    id: 'slot4',
                    label: 'Slot 4',
                    hint: 'Vị trí slot 4 (nếu WB có)',
                    type: 'slot',
                    required: false
                },
                {
                    id: 'slot5',
                    label: 'Slot 5',
                    hint: 'Vị trí slot 5 (nếu WB có)',
                    type: 'slot',
                    required: false
                },

                // Nút hành động
                {
                    id: 'start',
                    label: 'Start (chủ key)',
                    hint: 'Nút Start/Ready khi đủ người',
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
                    hint: 'Popup xác nhận nếu chưa full',
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
        // CUSTOM — user tự thêm rules
        // =========================================================

        custom: {
            id: 'custom',
            name: 'Custom Rules',
            description: 'Tự thêm rules — flex cho mọi tình huống',
            defaultInterval: 1000,
            steps: [
                // User tự thêm qua UI
            ],
            flow: {
                type: 'sequential',
                order: [],
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