import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./dispatcher', () => ({ drainOutbox: vi.fn() }));
vi.mock('../queues/email-queue-singleton', () => ({ getEmailQueue: vi.fn() }));
vi.mock('../prisma', () => ({ prisma: {} }));

import { drainOutbox } from './dispatcher';
import { getEmailQueue } from '../queues/email-queue-singleton';
import { drainOutboxNow } from './drain-now';

const mockDrainOutbox = vi.mocked(drainOutbox);
const mockGetEmailQueue = vi.mocked(getEmailQueue);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('drainOutboxNow', () => {
  it('drains the outbox with a small batch size and drains up to 5 email jobs when the queue is configured', async () => {
    mockDrainOutbox.mockResolvedValue({ processed: 1, succeeded: 1, failed: 0, dead: 0 });
    const drainOne = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockGetEmailQueue.mockReturnValue({ drainOne } as never);

    await drainOutboxNow();

    expect(mockDrainOutbox).toHaveBeenCalledWith(
      expect.objectContaining({ emailQueue: expect.anything() }),
      5,
    );
    expect(drainOne).toHaveBeenCalledTimes(2); // stops once it returns false (queue empty)
  });

  it('skips draining the email queue when it is not configured, but still drains the outbox', async () => {
    mockDrainOutbox.mockResolvedValue({ processed: 0, succeeded: 0, failed: 0, dead: 0 });
    mockGetEmailQueue.mockReturnValue(null);

    await drainOutboxNow();

    expect(mockDrainOutbox).toHaveBeenCalledWith(
      expect.not.objectContaining({ emailQueue: expect.anything() }),
      5,
    );
  });

  it('never throws — swallows any failure so the caller (a signup/reset/invite request) is never broken', async () => {
    mockDrainOutbox.mockRejectedValue(new Error('boom'));
    mockGetEmailQueue.mockReturnValue(null);

    await expect(drainOutboxNow()).resolves.toBeUndefined();
  });
});
