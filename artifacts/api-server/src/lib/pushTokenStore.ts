export interface TokenRecord {
  token: string;
  lat: number;
  lng: number;
  radiusKm: number;
  city: string;
  weeklyDigest: boolean;
  registeredAt: Date;
  lastDigestAt: Date | null;
}

const store = new Map<string, TokenRecord>();

export function upsertToken(
  userId: string,
  record: Omit<TokenRecord, "registeredAt" | "lastDigestAt">,
): void {
  const existing = store.get(userId);
  store.set(userId, {
    ...record,
    registeredAt: new Date(),
    lastDigestAt: existing?.lastDigestAt ?? null,
  });
}

export function getToken(userId: string): TokenRecord | undefined {
  return store.get(userId);
}

export function removeToken(userId: string): void {
  store.delete(userId);
}

export function getAllTokens(): ReadonlyMap<string, TokenRecord> {
  return store;
}

export function markDigestSent(userId: string): void {
  const record = store.get(userId);
  if (record) {
    record.lastDigestAt = new Date();
  }
}
