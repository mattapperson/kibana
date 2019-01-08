/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_NAMES } from '../common/constants/index_names';
import { CMServerLibs } from './lib/types';
import { createGetBeatConfigurationRoute } from './rest_api/beats/configuration';
import { createBeatEnrollmentRoute } from './rest_api/beats/enroll';
import { createGetBeatRoute } from './rest_api/beats/get';
import { createListAgentsRoute } from './rest_api/beats/list';
import { createTagAssignmentsRoute } from './rest_api/beats/tag_assignment';
import { createTagRemovalsRoute } from './rest_api/beats/tag_removal';
import { createBeatUpdateRoute } from './rest_api/beats/update';
import { createDeleteConfidurationsRoute } from './rest_api/configurations/delete';
import { createGetConfigurationBlocksRoute } from './rest_api/configurations/get';
import { upsertConfigurationRoute } from './rest_api/configurations/upsert';
import { createDeleteTagsWithIdsRoute } from './rest_api/tags/delete';
import { createGetTagsWithIdsRoute } from './rest_api/tags/get';
import { createListTagsRoute } from './rest_api/tags/list';
import { createSetTagRoute } from './rest_api/tags/set';
import { createTokensRoute } from './rest_api/tokens/create';
import { beatsIndexTemplate } from './utils/index_templates';

export const initManagementServer = async (libs: CMServerLibs) => {
  if (libs.database) {
    await libs.database.putTemplate(libs.framework.internalUser, {
      name: INDEX_NAMES.BEATS,
      body: beatsIndexTemplate,
    });
  }

  libs.framework.registerRoute(createGetBeatRoute(libs));
  libs.framework.registerRoute(createGetTagsWithIdsRoute(libs));
  libs.framework.registerRoute(createListTagsRoute(libs));
  libs.framework.registerRoute(createDeleteTagsWithIdsRoute(libs));
  libs.framework.registerRoute(createGetBeatConfigurationRoute(libs));
  libs.framework.registerRoute(createTagAssignmentsRoute(libs));
  libs.framework.registerRoute(createListAgentsRoute(libs));
  libs.framework.registerRoute(createTagRemovalsRoute(libs));
  libs.framework.registerRoute(createBeatEnrollmentRoute(libs));
  libs.framework.registerRoute(createSetTagRoute(libs));
  libs.framework.registerRoute(createTokensRoute(libs));
  libs.framework.registerRoute(createBeatUpdateRoute(libs));
  libs.framework.registerRoute(createDeleteConfidurationsRoute(libs));
  libs.framework.registerRoute(createGetConfigurationBlocksRoute(libs));
  libs.framework.registerRoute(upsertConfigurationRoute(libs));
};
