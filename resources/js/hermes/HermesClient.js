// LevelUp 英语修仙 - Hermes 对话客户端（模板+SSE）
export class HermesClient {
    constructor(game) {
        this.game = game;
    }

    /** 根据场景获取 Hermes 台词 */
    getMessage(scene, params = {}) {
        const templates = this.templates();
        const key = this.resolveKey(scene, params);
        return templates[key] || templates.default;
    }

    resolveKey(scene, params) {
        switch (scene) {
            case 'welcome':
                return `welcome_${params.level || 'L1'}`;
            case 'praise':
                return params.accuracy >= 90 ? 'praise_high'
                    : params.accuracy >= 70 ? 'praise_mid' : 'praise_low';
            case 'encourage':
                return 'encourage';
            case 'exam_result':
                return `exam_${params.grade || 'B'}`;
            case 'login':
                return 'login_greeting';
            default:
                return 'default';
        }
    }

    templates() {
        return {
            // 初见引导
            welcome_L1: '善，汝已踏入宗门。今日灵草丰茂，且随老夫采药识灵。',
            welcome_L2: '不错，修为渐长。今日可挑战更深灵脉。',
            welcome_L3: '已有小成。灵脉深处或有奇遇，不妨一探。',

            // 答对鼓励
            praise_high: '妙哉！此关已通，修为大进。继续修炼，筑基可期。',
            praise_mid: '尚可。略有瑕疵，但无伤大雅。',
            praise_low: '根基尚稳，继续努力。',

            // 答错提示
            encourage: '无妨。修炼之路本有坎坷。不妨回顾错处，再战一局。',

            // 渡劫判词
            exam_S: '天道昭昭，汝竟以S级一举渡劫！此等天赋，百年难遇。',
            exam_A: '善。一劫已渡，灵台清明。修为更进一步。',
            exam_B: '可。根基尚稳，但犹有不足，当再磨炼。',
            exam_C: '此劫未渡，非汝之过，乃时机未至。重练弱项，再来挑战。',
            exam_D: '根基不牢，地动山摇。从头修炼，夯实基础。',

            // 登录
            login_greeting: '道友别来无恙？灵脉已通，随时可以修炼。',

            // 默认
            default: '修炼之道，贵在坚持。',
        };
    }
}
