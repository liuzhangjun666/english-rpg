const GUEST_KEY_STORAGE = 'levelup_guest_key';

/** 读取或生成本地游客标识，用于恢复同一设备的游客账号。 */
export function getOrCreateGuestKey(): string {
  try {
    const existing = String(localStorage.getItem(GUEST_KEY_STORAGE) || '').trim();
    if (existing.length >= 8) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY_STORAGE, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

export function persistGuestKey(guestKey: string) {
  const normalized = String(guestKey || '').trim();
  if (!normalized) return;
  try {
    localStorage.setItem(GUEST_KEY_STORAGE, normalized);
  } catch {
    // ignore
  }
}

/** 正式注册/登录成功后清除游客标识，避免与正式账号混用。 */
export function clearGuestKey() {
  try {
    localStorage.removeItem(GUEST_KEY_STORAGE);
  } catch {
    // ignore
  }
}
