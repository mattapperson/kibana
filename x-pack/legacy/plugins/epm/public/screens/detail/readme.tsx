/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { EuiLoadingContent, EuiText } from '@elastic/eui';
import ReactMarkdown from 'react-markdown';
import { getFileByPath } from '../../data';
import { markdownRenderers } from './markdown_renderers';
import { useLinks } from '../../hooks';
import { ContentCollapse } from './content_collapse';

export function Readme({
  readmePath,
  packageName,
  version,
}: {
  readmePath: string;
  packageName: string;
  version: string;
}) {
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const { toRelativeImage } = useLinks();
  const handleImageUri = React.useCallback(
    (uri: string) => {
      const isRelative =
        uri.indexOf('http://') === 0 || uri.indexOf('https://') === 0 ? false : true;
      const fullUri = isRelative ? toRelativeImage({ packageName, version, path: uri }) : uri;
      return fullUri;
    },
    [toRelativeImage, packageName, version]
  );

  useEffect(() => {
    getFileByPath(readmePath).then(res => {
      setMarkdown(res);
    });
  }, [readmePath]);

  return (
    <Fragment>
      {markdown !== undefined ? (
        <ContentCollapse>
          <ReactMarkdown
            transformImageUri={handleImageUri}
            renderers={markdownRenderers}
            source={markdown}
          />
        </ContentCollapse>
      ) : (
        <EuiText>
          {/* simulates a long page of text loading */}
          <p>
            <EuiLoadingContent lines={5} />
          </p>
          <p>
            <EuiLoadingContent lines={6} />
          </p>
          <p>
            <EuiLoadingContent lines={4} />
          </p>
        </EuiText>
      )}
    </Fragment>
  );
}
