export function isLowPowerDevice() {
    return Boolean(
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
}

export const sceneFxProfiles = {
    hall: {
        low: {
            starCount: 420,
            ringLayers: 1,
            orbCount: 4,
            pillarGemCount: 2,
            baseOpacity: 0.58,
            glowScale: 1.24,
        },
        normal: {
            starCount: 980,
            ringLayers: 2,
            orbCount: 6,
            pillarGemCount: 4,
            baseOpacity: 0.78,
            glowScale: 1.46,
        },
    },
};
