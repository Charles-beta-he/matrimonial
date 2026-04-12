import * as crypto from 'node:crypto';
import { env } from '../lib/env';

interface TokenGrant {
  room: string;
  roomJoin: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

interface Claims {
  exp: number;
  iss: string;
  sub: string;
  nbf: number;
  video: TokenGrant;
  name?: string;
}

/** Base64URL encode a string */
function base64url(input: string | Buffer): string {
  return (typeof input === 'string' ? Buffer.from(input) : input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** Sign HS256 JWT for LiveKit (no external dep) */
function signLiveKitJWT(claims: Claims): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = base64url(JSON.stringify(header));
  const payloadPart = base64url(JSON.stringify(claims));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = crypto.createHmac('sha256', env.LIVEKIT_API_SECRET).update(signingInput).digest();
  return `${signingInput}.${base64url(signature)}`;
}

export const LiveKitAdapter = {
  /** Generate access token for a user to join a room */
  generateToken(params: {
    userId: string;
    userName: string;
    roomName: string;
    role?: 'publisher' | 'subscriber';
    ttl?: number; // seconds
  }): { token: string; wsUrl: string } {
    const now = Math.floor(Date.now() / 1000);
    const ttl = params.ttl ?? 2 * 60 * 60; // 2 hours

    const claims: Claims = {
      iss: env.LIVEKIT_API_KEY,
      sub: params.userId,
      nbf: now,
      exp: now + ttl,
      name: params.userName,
      video: {
        room: params.roomName,
        roomJoin: true,
        canPublish: params.role !== 'subscriber',
        canSubscribe: true,
        canPublishData: true,
      },
    };

    return {
      token: signLiveKitJWT(claims),
      wsUrl: env.LIVEKIT_WS_URL,
    };
  },

  /** Generate a room name for 1v1 call */
  generateOneOnOneRoomName(userA: string, userB: string): string {
    const [a, b] = [userA, userB].sort();
    return `1v1_${a}_${b}`;
  },

  /** Generate a matchmaker room name */
  generateMatchmakerRoomName(hostId: string): string {
    return `host_${hostId}_${Date.now().toString(36)}`;
  },
};
