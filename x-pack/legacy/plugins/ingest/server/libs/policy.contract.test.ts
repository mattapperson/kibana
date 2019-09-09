/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import { compose } from './compose/memorized';
import { ServerLibs } from './types';
import * as elasticsearch from 'elasticsearch';
import { FrameworkAuthenticatedUser } from './adapters/framework/adapter_types';
import { INDEX_NAMES } from '../../common/constants/index_names';

describe('Policies Lib', () => {
  let servers: any;
  let libs: ServerLibs;
  let es: elasticsearch.Client;
  const TestUser: FrameworkAuthenticatedUser = {
    kind: 'authenticated',
    username: 'mattapperson',
    roles: ['fleet_admin'],
    full_name: null,
    email: null,
    enabled: true,
  };

  beforeAll(async () => {
    await callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../test_utils/jest/contract_tests/servers'
      );

      servers = await createKibanaServer({
        security: { enabled: true },
      });
      const esPolicy = JSON.parse(process.env.__JEST__ESServer || '');
      es = new elasticsearch.Client({
        hosts: esPolicy.hosts,
        httpAuth: esPolicy.username ? `${esPolicy.username}:${esPolicy.password}` : undefined,
      });
    });

    libs = compose(servers);
    await libs.framework.waitForStack();
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown();
    }
  });

  beforeEach(async () => {
    if (es) {
      es.deleteByQuery({
        index: INDEX_NAMES.INGEST,
        body: {
          conflicts: 'proceed',
          query: { match_all: {} },
        },
      });
    }
  });

  describe('create', () => {
    it('should create a new policy', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      expect(typeof newPolicy.id).toBe('string');
      expect(typeof newPolicy.shared_id).toBe('string');
      expect(typeof newPolicy.version).toBe('number');

      const gottenPolicy = await libs.policy.get(newPolicy.id);
      expect(gottenPolicy.name).toBe('test');
    });
  });

  describe('list', () => {
    it('should list all active policies', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      const newPolicy2 = await libs.policy.create(TestUser, 'test2', 'test description');
      const newPolicy3 = await libs.policy.create(TestUser, 'test3', 'test description');

      expect(typeof newPolicy.id).toBe('string');
      expect(typeof newPolicy.shared_id).toBe('string');
      expect(typeof newPolicy.version).toBe('number');

      const gottenPolicies = await libs.policy.list();
      expect(gottenPolicies.length).toBe(3);
      expect(gottenPolicies.find(c => c.id === newPolicy.id) !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.id === newPolicy2.id) !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.id === newPolicy3.id) !== undefined).toBe(true);
    });

    it('should not list inactive policies', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      const updated = await libs.policy.update(newPolicy.id, {
        name: 'foo',
      });
      const newPolicy2 = await libs.policy.create(TestUser, 'test2', 'test description');
      const newPolicy3 = await libs.policy.create(TestUser, 'test3', 'test description');

      expect(typeof newPolicy.id).toBe('string');
      expect(typeof newPolicy.shared_id).toBe('string');
      expect(typeof newPolicy.version).toBe('number');

      const gottenPolicies = await libs.policy.list();
      expect(gottenPolicies.length).toBe(3);
      expect(gottenPolicies.find(c => c.id === updated.id) !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.id === newPolicy2.id) !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.id === newPolicy3.id) !== undefined).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a policy and invalidate the origional', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      const updated = await libs.policy.update(newPolicy.id, {
        name: 'foo',
      });
      expect(updated.id).not.toBe(newPolicy.id);
      expect(updated.version).toBe(newPolicy.version + 1);
      expect(updated.shared_id).toBe(newPolicy.shared_id);

      const gottenPolicy = await libs.policy.get(updated.id);
      expect(gottenPolicy.name).toBe('foo');

      const origPolicy = await libs.policy.get(newPolicy.id);
      expect(origPolicy.status).toBe('locked');
    });
  });

  describe.skip('finish update', () => {});

  describe('list versions', () => {
    it('Should list past locked versions of a policy', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      await libs.policy.update(newPolicy.id, {
        name: 'foo',
      });

      const gottenPolicies = await libs.policy.listVersions(newPolicy.shared_id, false);
      expect(gottenPolicies.length).toBe(2);
      expect(gottenPolicies.filter(c => c.status === 'active').length).toBe(1);
      expect(gottenPolicies.filter(c => c.status === 'locked').length).toBe(1);
    });
  });

  describe('delete', () => {
    it('Should delete the version by the versions ID', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      await libs.policy.update(newPolicy.id, {
        name: 'foo',
      });

      try {
        await libs.policy.deleteVersion(newPolicy.id);
      } catch (e) {
        expect(e).toBe(undefined);
      }
      const gottenPolicies = await libs.policy.listVersions(newPolicy.shared_id, false);
      expect(gottenPolicies.length).toBe(1);
    });

    it('Should delete the all versions when deleting the shared ID', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      await libs.policy.update(newPolicy.id, {
        name: 'foo',
      });

      try {
        await libs.policy.delete(newPolicy.shared_id);
      } catch (e) {
        expect(e).toBe(undefined);
      }

      const gottenPolicies = await libs.policy.list();
      expect(gottenPolicies.length).toBe(0);
    });
  });

  describe.skip('createNewPolicyFrom', () => {
    it('Should duplicate policy but with a new shared_id', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      await libs.policy.createNewPolicyFrom(newPolicy.id, 'foo', 'description');

      const gottenPolicies = await libs.policy.list();
      expect(gottenPolicies.length).toBe(2);
      expect(gottenPolicies.find(c => c.name === 'foo') !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.name === 'foo')!.shared_id).not.toBe(
        gottenPolicies.find(c => c.name === 'test')!.shared_id
      );

      // TODO test data sources/inputs are copied
    });
  });
  describe.skip('rollForward', () => {});

  describe('requestAddDataSource', () => {
    it('Should add data sources and inputs to the policy', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      try {
        await libs.policy.requestAddDataSource(newPolicy.id, {
          ref_source: undefined,
          ref: undefined,
          output: '43hi34hi5y3i53o4',
          queue: {},
          inputs: [{}, {}],
        });
      } catch (e) {
        expect(e).toBe(undefined);
      }

      const fullPolicy = await libs.policy.get(newPolicy.id);
      expect(fullPolicy.name).toBe('test');
      expect(fullPolicy.data_sources.length).toBe(1);
      expect(fullPolicy.data_sources[0].uuid.length > 0).toBe(true);
      expect(fullPolicy.data_sources[0].inputs.length).toBe(2);
      expect(typeof fullPolicy.data_sources[0].inputs[0]).toBe('string');
    });
  });
  describe('requestDeleteDataSource', () => {
    it('Should delete data sources', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      try {
        await libs.policy.requestAddDataSource(newPolicy.id, {
          ref_source: undefined,
          ref: undefined,
          output: '43hi34hi5y3i53o4',
          queue: {},
          inputs: [{}, {}],
        });
      } catch (e) {
        expect(e).toBe(undefined);
      }

      const fullPolicy = await libs.policy.get(newPolicy.id);
      expect(fullPolicy.data_sources.length).toBe(1);
      expect(fullPolicy.data_sources[0].uuid.length > 0).toBe(true);

      await libs.policy.requestDeleteDataSource(newPolicy.id, fullPolicy.data_sources[0].uuid);
      const fullPolicy2 = await libs.policy.get(newPolicy.id);
      expect(fullPolicy2.data_sources.length).toBe(0);
    });
  });
  describe('getFull', () => {
    it('Should return a policy with all inputs, not just refs to the inputs', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      try {
        await libs.policy.requestAddDataSource(newPolicy.id, {
          ref_source: undefined,
          ref: undefined,
          output: '43hi34hi5y3i53o4',
          queue: {},
          inputs: [{ foo: 'bar' }],
        });
      } catch (e) {
        expect(e).toBe(undefined);
      }

      const fullPolicy = await libs.policy.getFull(newPolicy.id);
      expect(fullPolicy.name).toBe('test');
      expect(fullPolicy.data_sources.length).toBe(1);
      expect(fullPolicy.data_sources[0].uuid.length > 0).toBe(true);
      expect(fullPolicy.data_sources[0].inputs.length).toBe(1);
      expect(typeof fullPolicy.data_sources[0].inputs[0]).not.toBe('string');
      expect(typeof fullPolicy.data_sources[0].inputs[0].other).toBe('string');
      expect(fullPolicy.data_sources[0].inputs[0].other).toBe('bar');
    });
  });

  describe.skip('listDataSources', () => {});

  describe.skip('update / change hooks', () => {});
});
