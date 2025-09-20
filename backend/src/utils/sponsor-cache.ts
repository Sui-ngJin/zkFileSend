class SponsorCache<T> {
  private readonly items = new Map<string, T & { expiresAt: number }>();

  set(key: string, value: T, ttlMs: number) {
    this.items.set(key, { ...value, expiresAt: Date.now() + ttlMs });
  }

  get(key: string) {
    const entry = this.items.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.items.delete(key);
      return null;
    }
    return entry;
  }

  delete(key: string) {
    this.items.delete(key);
  }
}

export const transactionCache = new SponsorCache<{
  txBytes: Uint8Array;
  claimer: string;
  sender: string;
}>();
