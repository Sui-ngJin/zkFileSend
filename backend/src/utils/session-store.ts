import { randomUUID } from 'crypto';
import type { CreateZkLoginZkpApiResponse } from '@mysten/enoki/dist/esm/EnokiClient/type';

export type StoredSession = {
  address: string;
  jwt: string;
  randomness: string;
  maxEpoch: number;
  ephemeralKeyPair: string;
  proof?: CreateZkLoginZkpApiResponse;
  expiresAt: number;
};

class SessionStore {
  private readonly sessions = new Map<string, StoredSession>();

  createSession(data: Omit<StoredSession, 'expiresAt'>, ttlMs: number) {
    const id = randomUUID();
    const expiresAt = Date.now() + ttlMs;
    this.sessions.set(id, { ...data, expiresAt });
    return { id, expiresAt };
  }

  getSession(id: string) {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }

  deleteSession(id: string) {
    this.sessions.delete(id);
  }
}

export const sessionStore = new SessionStore();
