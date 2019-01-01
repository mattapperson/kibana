/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { ConfigurationBlock } from '../../../../common/domain_types';
import { DatabaseAdapter } from '../database/adapter_types';
import { FrameworkUser } from '../framework/adapter_types';
import { ConfigurationBlockAdapter } from './adapter_types';

export class ElasticsearchConfigurationBlockAdapter implements ConfigurationBlockAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getByIds(user: FrameworkUser, ids: string[]): Promise<ConfigurationBlock[]> {
    if (ids.length === 0) {
      return [];
    }

    const params = {
      ignore: [404],
      _source: true,
      size: 10000,
      index: INDEX_NAMES.BEATS,
      type: '_doc',
      body: {
        ids,
      },
    };

    const response = await this.database.search(user, params);
    const configs = get<any>(response, 'hits.hits', []);

    return configs.map((tag: any) => ({ ...tag._source.tag, config: JSON.parse(tag._source.tag) }));
  }

  public async getForTags(user: FrameworkUser, tagIds: string[]): Promise<ConfigurationBlock[]> {
    if (tagIds.length === 0) {
      return [];
    }

    const params = {
      ignore: [404],
      size: 10000,
      index: INDEX_NAMES.BEATS,
      type: '_doc',
      body: {
        query: {
          terms: { 'configuration_block.tag': tagIds },
        },
      },
    };

    const response = await this.database.search(user, params);
    const configs = get<any>(response, 'hits.hits', []);

    return configs.map((tag: any) => ({
      ...tag._source.tag,
      config: JSON.parse(tag._source.tag.config || '{}'),
    }));
  }

  public async delete(user: FrameworkUser, ids: string[]): Promise<void> {
    await this.database.bulk(user, {
      body: ids.map(id => ({ delete: { _id: `configuration_block:${id}` } })),
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
  }

  public async create(user: FrameworkUser, configs: ConfigurationBlock[]): Promise<string[]> {
    const body = flatten(
      configs.map(config => [{ index: {} }, { ...config, config: JSON.stringify(config.config) }])
    );

    const result = await this.database.bulk(user, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });

    if (result.errors) {
      throw new Error(result.items[0].result);
    }
    // console.log(result.items);
    return result.items.map(item => item._id);
  }
}
