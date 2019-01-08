/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigurationBlock } from '../../../../common/domain_types';
import { FrontendConfigBlocksAdapter } from './adapter_types';

export class MemoryConfigBlocksAdapter implements FrontendConfigBlocksAdapter {
  constructor(private db: ConfigurationBlock[]) {}

  public async upsert(block: ConfigurationBlock) {
    this.db.push(block);
    return {
      success: true,
      blockID: Math.random()
        .toString(36)
        .substring(7),
    };
  }
  public async getForTag(
    tagId: string
  ): Promise<{
    error?: string;
    blocks: ConfigurationBlock[];
    page: number;
    total: number;
  }> {
    return {
      blocks: this.db.filter(block => block.tag === tagId),
      page: 0,
      total: this.db.filter(block => block.tag === tagId).length,
    };
  }
  public async delete(id: string): Promise<boolean> {
    this.db = this.db.reduce((newDB: ConfigurationBlock[], block) => {
      if (block.id !== id) {
        newDB.push(block);
      }
      return newDB;
    }, []);
    return !!this.db.find(block => block.id === id);
  }
}
