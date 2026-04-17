import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/env', () => ({
  env: {
    LIVEKIT_API_KEY: 'testkey',
    LIVEKIT_API_SECRET: 'testsecret',
    LIVEKIT_WS_URL: 'ws://localhost:7880',
  },
  isConfigured: () => true,
}));

describe('LiveKitAdapter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('generateToken returns a JWT token and wsUrl', async () => {
    const { LiveKitAdapter } = await import('./livekit.adapter');
    const result = LiveKitAdapter.generateToken({
      userId: 'user_1',
      userName: 'Alice',
      roomName: 'room_abc',
    });
    expect(result.token).toBeTruthy();
    expect(result.token.split('.')).toHaveLength(3);
    expect(result.wsUrl).toBe('ws://localhost:7880');
  });

  it('generateToken encodes correct claims in JWT payload', async () => {
    const { LiveKitAdapter } = await import('./livekit.adapter');
    const result = LiveKitAdapter.generateToken({
      userId: 'user_2',
      userName: 'Bob',
      roomName: 'room_xyz',
      role: 'subscriber',
    });
    const [, payloadB64] = result.token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    expect(payload.sub).toBe('user_2');
    expect(payload.iss).toBe('testkey');
    expect(payload.video.room).toBe('room_xyz');
    expect(payload.video.canPublish).toBe(false);
    expect(payload.video.canSubscribe).toBe(true);
  });

  it('generateOneOnOneRoomName sorts users alphabetically', async () => {
    const { LiveKitAdapter } = await import('./livekit.adapter');
    const name1 = LiveKitAdapter.generateOneOnOneRoomName('user_b', 'user_a');
    const name2 = LiveKitAdapter.generateOneOnOneRoomName('user_a', 'user_b');
    expect(name1).toBe(name2);
    expect(name1).toMatch(/^1v1_user_a_user_b$/);
  });

  it('generateMatchmakerRoomName includes hostId', async () => {
    const { LiveKitAdapter } = await import('./livekit.adapter');
    const name = LiveKitAdapter.generateMatchmakerRoomName('host_99');
    expect(name).toMatch(/^host_host_99_/);
  });
});
