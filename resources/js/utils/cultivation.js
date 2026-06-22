const REALM_NAME_MAP = {
    L: '练气期',
    Z: '筑基期',
    J: '金丹期',
    Y: '元婴期',
    H: '化神期',
    X: '炼虚期',
    T: '合体期',
    D: '大乘期',
    U: '渡劫期',
};

const LAYER_MAP = {
    1: '一层',
    2: '二层',
    3: '三层',
    4: '四层',
    5: '五层',
    6: '六层',
    7: '七层',
    8: '八层',
    9: '九层',
};

export function getRealmPrefix(realm) {
    const value = String(realm || '').trim().toUpperCase();
    return value ? value.slice(0, 1) : '';
}

export function getRealmLayer(realm) {
    const value = String(realm || '').trim().toUpperCase();
    const matched = value.match(/(\d+)$/);
    if (!matched) return 1;
    const layer = Number(matched[1] || 1);
    return Math.max(1, Math.min(9, layer));
}

const REALM_GROUP_MAP = {
    L: '练气',
    Z: '筑基',
    J: '金丹',
    Y: '元婴',
    H: '化神',
    X: '炼虚',
    T: '合体',
    D: '大乘',
    U: '渡劫',
};

const REALM_GROUPS = ['练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];

const CHINESE_LAYER_TOKEN_MAP = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

export function getCultivationRealmLabel(realm, stage = null) {
    const prefix = getRealmPrefix(realm);
    const layer = Number.isFinite(Number(stage))
        ? Math.max(1, Math.min(9, Number(stage)))
        : getRealmLayer(realm);
    const group = REALM_GROUP_MAP[prefix] || '练气';
    const layerName = LAYER_MAP[layer] || `${layer}层`;
    return `${group}${layerName}`;
}

export function getCultivationRealmIndex(realmLabel) {
    const text = String(realmLabel || '').trim();
    const matched = text.match(/^(练气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫)([一二三四五六七八九]|[1-9])层$/u);
    if (!matched) return -1;

    const groupIndex = REALM_GROUPS.indexOf(matched[1]);
    if (groupIndex < 0) return -1;

    const layerToken = String(matched[2] || '');
    const layer = CHINESE_LAYER_TOKEN_MAP[layerToken] || Number(layerToken);
    if (!Number.isFinite(layer) || layer < 1 || layer > 9) return -1;

    return (groupIndex * 9) + layer - 1;
}

export function resolveProfileRealm(profile) {
    if (!profile) return '';

    const stored = String(profile.current_realm || '').trim();
    const derived = getCultivationRealmLabel(profile.realm, profile.realm_stage);
    const storedIndex = getCultivationRealmIndex(stored);
    const derivedIndex = getCultivationRealmIndex(derived);

    if (storedIndex >= 0 && derivedIndex >= 0) {
        return storedIndex >= derivedIndex ? stored : derived;
    }

    return stored || derived || '';
}

export function mergeRealmPatch(existingProfile, patch) {
    if (!patch || typeof patch !== 'object') return {};

    const next = { ...patch };
    const currentRealm = resolveProfileRealm(existingProfile);
    const incomingRealm = String(next.current_realm || '').trim();

    if ('current_realm' in next) {
        if (!incomingRealm) {
            delete next.current_realm;
        } else {
            const currentIndex = getCultivationRealmIndex(currentRealm);
            const incomingIndex = getCultivationRealmIndex(incomingRealm);
            if (currentIndex >= 0 && incomingIndex >= 0 && incomingIndex < currentIndex) {
                delete next.current_realm;
            }
        }
    }

    if ('realm_stage' in next && currentRealm) {
        const currentIndex = getCultivationRealmIndex(currentRealm);
        const incomingStage = Number(next.realm_stage);
        const incomingRealm = getCultivationRealmLabel(next.realm ?? existingProfile?.realm, incomingStage);
        const incomingIndex = getCultivationRealmIndex(incomingRealm);
        if (currentIndex >= 0 && incomingIndex >= 0 && incomingIndex < currentIndex) {
            delete next.realm_stage;
            if ('realm' in next) delete next.realm;
        }
    }

    return next;
}

export function normalizeUserProfile(profile) {
    if (!profile) return profile;

    const normalized = { ...profile };
    normalized.current_realm = resolveProfileRealm(normalized);
    normalized.cultivation_energy = Number(normalized.cultivation_energy || 0);
    normalized.vocabulary = Number(normalized.vocabulary || 0);
    normalized.grammar = Number(normalized.grammar || 0);
    normalized.reading = Number(normalized.reading || 0);
    normalized.listening = Number(normalized.listening || 0);
    normalized.writing = Number(normalized.writing || 0);
    normalized.speaking = Number(normalized.speaking || 0);

    return normalized;
}

export function getRealmDisplayName(realm, stage = null) {
    const prefix = getRealmPrefix(realm);
    const layer = Number.isFinite(Number(stage)) ? Math.max(1, Math.min(9, Number(stage))) : getRealmLayer(realm);
    const realmName = REALM_NAME_MAP[prefix] || String(realm || '');
    const layerName = LAYER_MAP[layer] || `${layer}层`;
    return `${realmName} · ${layerName}`;
}
