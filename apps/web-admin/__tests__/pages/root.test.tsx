import { describe, it, expect, vi } from 'vitest';

const mockRedirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { mockRedirect(path); },
}));

describe('HomePage (root redirect)', () => {
  it('redirects to /dashboard', async () => {
    const { default: HomePage } = await import('../../app/page');
    HomePage();
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });
});
