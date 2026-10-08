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
    expect(screen.getByRole('img', { name: 'StudyVault Focus icon' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Break' }));
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });
  it('offers the three garment-linked focus durations', async () => {
    render(<App />);
    const duration = await screen.findByLabelText('Duration (minutes)');
    expect(duration).toHaveDisplayValue('25 minutes — red beanie');
    expect([...duration.options].map((option) => option.textContent)).toEqual([
      '25 minutes — red beanie',
      '35 minutes — orange scarf',
      '45 minutes — blue floral cardigan',
    ]);

    await userEvent.selectOptions(duration, '2100');
    expect(screen.getByText('35:00')).toBeInTheDocument();
    expect(screen.getByText('Ready to knit an orange scarf.')).toBeInTheDocument();
    expect(document.querySelector('.buddy-knit-in-progress').src).toContain('orange-scarf');
  });
  it('animates two knitting paws during a running focus session', async () => {
    window.studyVault.sessions.current.mockResolvedValue({
      ok: true,
      data: { id: 's1', type: 'Focus', outcome: 'Running', planned_seconds: 1500, remaining_seconds: 1499 },
    });
    render(<App />);
    expect(await screen.findByText('Knitting a red beanie…')).toBeInTheDocument();
    expect(document.querySelector('.buddy-avatar.knitting')).toBeInTheDocument();
    expect(document.querySelectorAll('.knitting-paw')).toHaveLength(2);
  });
  it('shows the finished garment when the focus countdown reaches zero', async () => {
    window.studyVault.sessions.current.mockResolvedValue({
      ok: true,
      data: { id: 's1', type: 'Focus', outcome: 'Running', planned_seconds: 2100, remaining_seconds: 0 },
    });
    render(<App />);
    expect(await screen.findByText('Finished! Your orange scarf is ready.')).toBeInTheDocument();
    expect(document.querySelector('.finished-knit').src).toContain('orange-scarf');
  });
  it('starts a linked focus session', async () => {
    render(<App />); await screen.findByText('Write report');
    await userEvent.selectOptions(screen.getByLabelText('Active task'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    expect(window.studyVault.sessions.start).toHaveBeenCalled();
  });
});
