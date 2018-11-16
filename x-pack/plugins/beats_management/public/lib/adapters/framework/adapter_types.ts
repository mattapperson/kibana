/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { LICENSES } from './../../../../common/constants/security';

export interface FrameworkAdapter {
  // Instance vars
  info: FrameworkInfo;
  currentUser: FrameworkUser;
  // Methods
  init(): Promise<void>;
  renderUIAtPath(path: string, component: React.ReactElement<any>): void;
  registerManagementSection(settings: {
    id?: string;
    name: string;
    iconName: string;
    order?: number;
  }): void;
  registerManagementUI(settings: {
    id?: string;
    name: string;
    basePath: string;
    visable?: boolean;
    order?: number;
  }): void;
  setUISettings(key: string, value: any): void;
}

export const RuntimeFrameworkInfo = t.type({
  basePath: t.string,
  license: t.type({
    type: t.union(LICENSES.map(s => t.literal(s))),
    expired: t.boolean,
    expiry_date_in_millis: t.number,
  }),
  security: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
  settings: t.type({
    encryptionKey: t.string,
    enrollmentTokensTtlInSeconds: t.number,
    defaultUserRoles: t.array(t.string),
  }),
});

export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

export const RuntimeManagementAPI = t.type({
  hasItem: t.Function,
  register: t.Function,
  getSection: t.Function,
});

interface ManagementSection {
  register(
    sectionId: string,
    options: {
      visible: boolean;
      display: string;
      order: number;
      url: string;
    }
  ): void;
}
export interface ManagementAPI extends t.TypeOf<typeof RuntimeManagementAPI> {
  getSection(sectionId: string): ManagementSection;
  hasItem(sectionId: string): boolean;
  register(sectionId: string, options: { display: string; icon: string; order: number }): void;
}

export interface FrameworkUser {
  email: string | null;
  enabled: boolean;
  full_name: string | null;
  metadata: { _reserved: true };
  roles: string[];
  scope: string[];
  username: string;
}
