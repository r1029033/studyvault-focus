import { describe, expect, it, vi } from 'vitest';
import { requestWindowClose } from '../src/main/window-close.js';

describe('requestWindowClose', () => {
  it('closes immediately without an active session', async () => {
    const confirmClose = vi.fn();
    expect(await requestWindowClose({ currentSession: null, confirmClose, cancelSession: vi.fn() })).toBe(true);
    expect(confirmClose).not.toHaveBeenCalled();
  });
  it('stays open when the user declines', async () => {
    expect(await requestWindowClose({ currentSession: { id: '1', outcome: 'Running' }, confirmClose: async () => false, cancelSession: vi.fn() })).toBe(false);
  });
  it('persists cancellation before closing', async () => {
    const cancelSession = vi.fn().mockResolvedValue(undefined);
    expect(await requestWindowClose({ currentSession: { id: '1', outcome: 'Paused' }, confirmClose: async () => true, cancelSession })).toBe(true);
    expect(cancelSession).toHaveBeenCalledWith('1');
  });
});
