export async function runWithPending(target, task, options = {}) {
    const {
        busyClass = 'is-pending',
        disable = true,
        minPendingMs = 220,
    } = options;

    if (!target || typeof task !== 'function') {
        return task?.();
    }

    const startedAt = Date.now();
    const originalDisabled = target.disabled;

    target.classList.add(busyClass);
    if (disable) target.disabled = true;

    try {
        return await task();
    } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < minPendingMs) {
            await new Promise((resolve) => setTimeout(resolve, minPendingMs - elapsed));
        }
        if (disable) target.disabled = originalDisabled;
        target.classList.remove(busyClass);
    }
}

export function setNodeBusyState(node, busy, options = {}) {
    if (!node) return;
    const { busyClass = 'is-busy', disable = true } = options;
    if (busy) {
        node.classList.add(busyClass);
    } else {
        node.classList.remove(busyClass);
    }
    if (disable && 'disabled' in node) {
        node.disabled = Boolean(busy);
    }
}
