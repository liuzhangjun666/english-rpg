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

export function getRealmDisplayName(realm, stage = null) {
    const prefix = getRealmPrefix(realm);
    const layer = Number.isFinite(Number(stage)) ? Math.max(1, Math.min(9, Number(stage))) : getRealmLayer(realm);
    const realmName = REALM_NAME_MAP[prefix] || String(realm || '');
    const layerName = LAYER_MAP[layer] || `${layer}层`;
    return `${realmName} · ${layerName}`;
}
