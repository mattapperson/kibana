/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unique, flatten } from 'lodash';
import { PolicyAdapter } from './adapters/policy/default';
import { BackendFrameworkLib } from './framework';
import {
  Policy,
  AgentPolicy,
  Datasource,
  Status,
  StoredPolicy,
} from './adapters/policy/adapter_types';
import { FrameworkAuthenticatedUser, FrameworkUser } from './adapters/framework/adapter_types';
import { DEFAULT_POLICY_ID } from '../../common/constants';
import { OutputsLib } from './outputs';
import { DatasourcesLib } from './datasources';

export class PolicyLib {
  constructor(
    private readonly adapter: PolicyAdapter,
    private readonly libs: {
      framework: BackendFrameworkLib;
      outputs: OutputsLib;
      datasources: DatasourcesLib;
    }
  ) {}

  private storedDatasourceToAgentStreams(datasources: Datasource[] = []): AgentPolicy['streams'] {
    return flatten(
      datasources.map((ds: Datasource) => {
        return ds.streams.map(stream => ({
          ...stream.config,
          id: stream.id,
          type: stream.input.type as any,
          output: { use_output: stream.output_id },
          ...(stream.config || {}),
        }));
      })
    );
  }

  private outputIDsFromDatasources(datasources: Datasource[] = []): string[] {
    return unique(
      flatten(
        datasources.map((ds: Datasource) => {
          return ds.streams.map(stream => stream.output_id);
        })
      )
    ) as string[];
  }

  public async create(
    withUser: FrameworkAuthenticatedUser,
    name: string,
    description?: string,
    label?: string
  ) {
    const info = this.libs.framework.info;
    if (info === null) {
      throw new Error('Could not get version information about Kibana from xpack');
    }

    const newPolicy: StoredPolicy = {
      name,
      description: description || '',
      status: Status.Active,
      datasources: [],
      label: label || name,
      updated_on: new Date().toISOString(),
      updated_by: withUser.username,
    };

    return await this.adapter.create(withUser, newPolicy);
  }

  // public async getFullActive(sharedId: string): Promise<PolicyFile> {
  //   const activePolicies = await this.adapter.listVersions(sharedId);

  //   const mostRecentDate = new Date(
  //     Math.max.apply(
  //       null,
  //       activePolicies.map(policy => {
  //         return new Date(policy.updated_on).getTime();
  //       })
  //     )
  //   );

  //   return activePolicies.filter(policy => {
  //     const d = new Date(policy.updated_on);
  //     return d.getTime() >= mostRecentDate.getTime();
  //   })[0];
  // }

  public async get(user: FrameworkUser, id: string): Promise<Policy | null> {
    const policy = await this.adapter.get(user, id);
    if (!policy) {
      return null;
    }
    return {
      id,
      ...policy,
      datasources: await this.libs.datasources.getByIDs(user, policy.datasources || []),
    } as Policy;
  }

  public async getWithAgentFormating(user: FrameworkUser, id: string): Promise<AgentPolicy | null> {
    const policy = await this.get(user, id);
    if (!policy) {
      return null;
    }
    const agentPolicy = {
      outputs: {
        ...(await this.libs.outputs.getByIDs(
          user,
          this.outputIDsFromDatasources(policy.datasources)
        )).reduce(
          (outputs, { config, ...output }) => {
            outputs[output.id] = {
              ...output,
              type: output.type as any,
              ...config,
            };
            return outputs;
          },
          {} as AgentPolicy['outputs']
        ),
      },
      streams: this.storedDatasourceToAgentStreams(policy.datasources),
    };

    return agentPolicy;
  }

  public async list(
    user: FrameworkUser,
    options: {
      kuery?: string;
      page?: number;
      perPage?: number;
    } = {
      page: 1,
      perPage: 25,
    }
  ): Promise<{ items: Policy[]; total: number; page: number; perPage: number }> {
    const response = await this.adapter.list(user, options);

    const dataSourcesIds = unique(flatten(response.items.map(policy => policy.datasources || [])));

    const datasources: Datasource[] = await this.libs.datasources.getByIDs(user, dataSourcesIds);

    return {
      ...response,
      items: response.items.map(policy => {
        return {
          ...policy,
          datasources: (policy.datasources || []).map(id => {
            return datasources.find(ds => ds.id === id);
          }),
        } as Policy;
      }),
    };
  }

  // public async changeLog(
  //   id: string,
  //   page: number = 1,
  //   perPage: number = 25
  // ): Promise<PolicyFile[]> {
  //   const policys = await this.adapter.listVersions(sharedID, activeOnly, page, perPage);
  //   return policys;
  // }

  public async update(
    user: FrameworkUser,
    id: string,
    policy: Partial<StoredPolicy>
  ): Promise<StoredPolicy> {
    const invalidKeys = Object.keys(policy).filter(key =>
      ['updated_on', 'updated_by'].includes(key)
    );

    if (invalidKeys.length !== 0) {
      throw new Error(
        `Update was called with policy paramaters that are not allowed: ${invalidKeys}`
      );
    }
    const oldPolicy = await this.adapter.get(user, id);

    if (!oldPolicy) {
      throw new Error('Policy not found');
    }

    if (oldPolicy.status === Status.Inactive && policy.status !== Status.Active) {
      throw new Error(`Policy ${id} can not be updated becuase it is ${oldPolicy.status}`);
    }

    return await this._update(user, id, { ...oldPolicy, ...policy });
  }

  // public async delete(sharedId: string): Promise<{ success: boolean }> {
  //   if (sharedId === DEFAULT_POLICY_ID) {
  //     throw new Error('Not allowed (impossible to delete default policy)');
  //   }
  //   // TODO Low priority - page through vs one large query as this will break if there are more then 10k past versions
  //   const versions = await this.listVersions(sharedId, false, 1, 10000);

  //   // TODO bulk delete
  //   for (const version of versions) {
  //     await this.adapter.deleteVersion(version.id);
  //   }

  //   return {
  //     success: true,
  //   };
  // }

  // public async changeAgentVersion(policyId: string, version: string) {
  //   const { id, agent_version: agentVersion, ...oldPolicy } = await this.adapter.get(policyId);
  //   const newPolicy = await this.adapter.create({ ...oldPolicy, agent_version: agentVersion });

  //   // TODO: ensure new version is greater then old
  //   // TODO: Ensure new version is a valid version number for agent
  //   // TODO: ensure new version works with current ES version
  //   // TODO: trigger and merge in policy changes from intigrations

  //   await this.adapter.update(newPolicy.id, {
  //     id: newPolicy.id,
  //     ...oldPolicy,
  //     agent_version: version,
  //   });
  //   // TODO fire events for fleet that update was made
  // }

  // public async finishUpdateFrom(policyId: string) {
  //   const oldPolicy = await this.adapter.get(policyId);
  //   await this.adapter.update(policyId, {
  //     ...oldPolicy,
  //     status: 'inactive',
  //   });
  // }

  public async ensureDefaultPolicy() {
    try {
      await this.adapter.get(this.libs.framework.internalUser, DEFAULT_POLICY_ID);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
      const info = this.libs.framework.info;
      if (info === null) {
        throw new Error('Could not get version information about Kibana from xpack');
      }
      const newDefaultPolicy: StoredPolicy = {
        name: 'Default policy',
        description: 'Default policy created by Kibana',
        status: Status.Active,
        datasources: [],
        updated_on: new Date().toISOString(),
        updated_by: 'Fleet (system action)',
      };
      await this.adapter.create(this.libs.framework.internalUser, newDefaultPolicy, {
        id: DEFAULT_POLICY_ID,
      });
    }
  }

  private async _update(user: FrameworkUser, id: string = 'new', policy: StoredPolicy) {
    await this.adapter.update(user, id, {
      ...policy,
      updated_on: new Date().toString(),
      updated_by: (user as FrameworkAuthenticatedUser).username || 'Fleet (system action)',
    });
    // TODO fire events for fleet that update was made

    // TODO create audit/history log
    // const newPolicy = await this.adapter.create(policyData);

    return policy;
  }
}
