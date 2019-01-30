/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReindexStatus, ReindexStep } from '../../../../../../common/types';

const mockClient = {
  post: jest.fn().mockResolvedValue({
    lastCompletedStep: ReindexStep.created,
    status: ReindexStatus.inProgress,
  }),
  get: jest.fn().mockResolvedValue({
    status: 200,
    data: {
      warnings: [],
      reindexOp: null,
    },
  }),
};
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue(mockClient),
}));

import { ReindexPollingService } from './polling_service';

describe('ReindexPollingService', () => {
  beforeEach(() => {
    mockClient.post.mockReset();
    mockClient.get.mockReset();
  });

  it('does not poll when reindexOp is null', async () => {
    mockClient.get.mockResolvedValueOnce({
      status: 200,
      data: {
        warnings: [],
        reindexOp: null,
      },
    });

    const service = new ReindexPollingService('myIndex');
    service.updateStatus();
    await new Promise(resolve => setTimeout(resolve, 1200)); // wait for poll interval

    expect(mockClient.get).toHaveBeenCalledTimes(1);
    service.stopPolling();
  });

  it('does not poll when first check is a 200 and status is failed', async () => {
    mockClient.get.mockResolvedValue({
      status: 200,
      data: {
        warnings: [],
        reindexOp: {
          lastCompletedStep: ReindexStep.created,
          status: ReindexStatus.failed,
          errorMessage: `Oh no!`,
        },
      },
    });

    const service = new ReindexPollingService('myIndex');
    service.updateStatus();
    await new Promise(resolve => setTimeout(resolve, 1200)); // wait for poll interval

    expect(mockClient.get).toHaveBeenCalledTimes(1);
    expect(service.status$.value.errorMessage).toEqual(`Oh no!`);
    service.stopPolling();
  });

  it('begins to poll when first check is a 200 and status is inProgress', async () => {
    mockClient.get.mockResolvedValue({
      status: 200,
      data: {
        warnings: [],
        reindexOp: {
          lastCompletedStep: ReindexStep.created,
          status: ReindexStatus.inProgress,
        },
      },
    });

    const service = new ReindexPollingService('myIndex');
    service.updateStatus();
    await new Promise(resolve => setTimeout(resolve, 1200)); // wait for poll interval

    expect(mockClient.get).toHaveBeenCalledTimes(2);
    service.stopPolling();
  });

  describe('startReindex', () => {
    it('posts to endpoint', async () => {
      const service = new ReindexPollingService('myIndex');
      await service.startReindex();

      expect(mockClient.post).toHaveBeenCalledWith('/api/upgrade_assistant/reindex/myIndex');
    });
  });
});
