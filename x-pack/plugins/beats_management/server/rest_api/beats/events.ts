/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { BeatEvent } from '../../../common/domain_types';
import { ReturnTypeCreate } from '../../../common/return_types';
import { CMServerLibs } from '../../lib/types';

export const beatEventsRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/{beatId}/events',
  config: {
    validate: {
      headers: Joi.object({
        'kbn-beats-access-token': Joi.string().required(),
      }).options({ allowUnknown: true }),
    },
    auth: false,
  },
  handler: async (request: any, h: any): Promise<ReturnTypeCreate<BeatEvent>> => {
    const beatId = request.params.beatId;
    const events = request.payload;
    const accessToken = request.headers['kbn-beats-access-token'];

    const beat = await libs.beats.getById(libs.framework.internalUser, beatId);
    if (beat === null) {
      return h.response({ message: `Beat "${beatId}" not found` }).code(400);
    }

    const isAccessTokenValid = beat.access_token === accessToken;
    if (!isAccessTokenValid) {
      return h.response({ message: 'Invalid access token' }).code(401);
    }

    const results = await libs.beatEvents.log(libs.framework.internalUser, beat.id, events);

    return {
      response: results,
    };
  },
});
