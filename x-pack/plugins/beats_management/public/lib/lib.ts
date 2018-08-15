/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import { AxiosRequestConfig } from 'axios';
import React from 'react';
import { ConfigurationBlockTypes } from '../../common/constants/configuration_blocks';
import { BeatTag } from '../../common/domain_types';
import { CMTokensAdapter } from './adapters/tokens/adapter_types';
import { BeatsLib } from './domains/beats';
import { TagsLib } from './domains/tags';

export interface FrontendDomainLibs {
  beats: BeatsLib;
  tags: TagsLib;
  tokens: CMTokensAdapter;
}

export interface FrontendLibs extends FrontendDomainLibs {
  framework: FrameworkAdapter;
}

export enum FilebeatModuleName {
  system = 'system',
  apache2 = 'apache2',
  nginx = 'nginx',
  mongodb = 'mongodb',
  elasticsearch = 'elasticsearch',
}

export enum MetricbeatModuleName {
  system = 'system',
  apache2 = 'apache2',
  nginx = 'nginx',
  mongodb = 'mongodb',
  elasticsearch = 'elasticsearch',
}

export enum OutputType {
  elasticsearch = 'elasticsearch',
  logstash = 'logstash',
  kafka = 'kafka',
  console = 'console',
}

export type ClientConfigContent =
  | string[]
  | FilebeatModuleName
  | {
      moduleName: MetricbeatModuleName;
      hosts: string[];
      period: string;
    }
  | {
      outputType: OutputType;
      hosts: string[];
      username: string;
      password: string;
    };

export interface ClientSideBeatTag extends BeatTag {
  configurations: ClientSideConfigurationBlock[];
}

export interface YamlConfigSchema {
  id: string;
  ui: {
    label: string;
    type: 'input' | 'multi-input' | 'select' | 'code';
    helpText?: string;
  };
  options?: Array<{ value: string; text: string }>;
  validations?: 'isHost' | 'isString' | 'isPeriod' | 'isPath' | 'isPaths' | 'isYaml';
  error: string;
  defaultValue?: string;
  required?: boolean;
  parseValidResult?: (value: any) => any;
}

export type ClientSideConfigurationBlock =
  | {
      type: ConfigurationBlockTypes.FilebeatInputs;
      config: string[];
    }
  | {
      type: ConfigurationBlockTypes.FilebeatModules;
      config: FilebeatModuleName;
    }
  | {
      type: ConfigurationBlockTypes.MetricbeatModules;
      config: {
        moduleName: MetricbeatModuleName;
        hosts: string[];
        period: string;
      };
    }
  | {
      type: ConfigurationBlockTypes.Output;
      config: {
        outputType: OutputType;
        hosts: string[];
        username: string;
        password: string;
      };
    }
  | {
      type: ConfigurationBlockTypes.Processors;
      config: ClientConfigContent;
    };

export interface FrameworkAdapter {
  // Insstance vars
  appState?: object;
  kbnVersion?: string;
  registerManagementSection(pluginId: string, displayName: string, basePath: string): void;

  // Methods
  setUISettings(key: string, value: any): void;
  render(component: React.ReactElement<any>): void;
}

export interface FramworkAdapterConstructable {
  new (uiModule: IModule): FrameworkAdapter;
}

// TODO: replace AxiosRequestConfig with something more defined
export type RequestConfig = AxiosRequestConfig;

export interface ApiAdapter {
  kbnVersion: string;

  get<T>(url: string, config?: RequestConfig | undefined): Promise<T>;
  post(url: string, data?: any, config?: AxiosRequestConfig | undefined): Promise<object>;
  delete(url: string, config?: RequestConfig | undefined): Promise<object>;
  put(url: string, data?: any, config?: RequestConfig | undefined): Promise<object>;
}

export interface UiKibanaAdapterScope extends IScope {
  breadcrumbs: any[];
  topNavMenu: any[];
}

export interface KibanaUIConfig {
  get(key: string): any;
  set(key: string, value: any): Promise<boolean>;
}

export interface KibanaAdapterServiceRefs {
  config: KibanaUIConfig;
  rootScope: IScope;
}

export type BufferedKibanaServiceCall<ServiceRefs> = (serviceRefs: ServiceRefs) => void;

export interface Chrome {
  setRootTemplate(template: string): void;
}
