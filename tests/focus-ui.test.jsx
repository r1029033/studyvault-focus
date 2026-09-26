import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/renderer/App.jsx';

beforeEach(() => {
  window.studyVault = {
    settings: { get: vi.fn().mockResolvedValue({ ok: true, data: { vaultPath: 'C:/Vault', failedEvents: 0 } }), chooseVault: vi.fn() },
    tasks: { listActive: vi.fn().mockResolvedValue({ ok: true, data: [{ id: '1', title: 'Write report' }] }) },
    sessions: { current: vi.fn().mockResolvedValue({ ok: true, data: null }), start: vi.fn().mockResolvedValue({ ok: true, data: { id: 's1', outcome: 'Running', planned_seconds: 1500, actual_seconds: 0 } }), pause: vi.fn(), resume: vi.fn(), complete: vi.fn(), cancel: vi.fn(), history: vi.fn().mockResolvedValue({ ok: true, data: [] }), completeLinkedTask: vi.fn() },
    events: { retryAll: vi.fn() },
  };
});

describe('StudyVault Focus interface', () => {
  it('shows default focus and break durations', async () => {
    render(<App />); expect(await screen.findByText('25:00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Break' }));
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });
  it('starts a linked focus session', async () => {
    render(<App />); await screen.findByText('Write report');
    await userEvent.selectOptions(screen.getByLabelText('Active task'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    expect(window.studyVault.sessions.start).toHaveBeenCalled();
  });
});
