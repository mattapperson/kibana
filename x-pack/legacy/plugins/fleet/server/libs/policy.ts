/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, unique } from 'lodash';
import { Datasource, Policy } from '../../../ingest/server/libs/adapters/policy/adapter_types';
import { PoliciesRepository, AgentPolicy } from '../repositories/policies/types';
import { FrameworkUser } from '../adapters/framework/adapter_types';

export class PolicyLib {
  constructor(private readonly policyAdapter: PoliciesRepository) {}

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

  public async getFullPolicy(user: FrameworkUser, id: string): Promise<AgentPolicy | null> {
    const policy = await this.policyAdapter.get(user, id);
    if (!policy) {
      return null;
    }
    const agentPolicy = {
      outputs: {
        ...(
          await this.policyAdapter.getPolicyOutputByIDs(
            user,
            this.outputIDsFromDatasources(policy.datasources)
          )
        ).reduce((outputs, { config, ...output }) => {
          outputs[output.id] = {
            ...output,
            type: output.type as any,
            ...config,
          };
          return outputs;
        }, {} as AgentPolicy['outputs']),
      },
      streams: this.storedDatasourceToAgentStreams(policy.datasources),
    };

    return agentPolicy;
  }

  public policyUpdated(
    policyId: string,
    type: 'added' | 'updated' | 'removed',
    payload: Policy | null
  ): Promise<{ success: boolean }> {
    return new Promise(resolve => {
      resolve({ success: true });
    });
  }
}
