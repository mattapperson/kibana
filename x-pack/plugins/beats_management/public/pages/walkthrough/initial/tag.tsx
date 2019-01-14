/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import uuidv4 from 'uuid/v4';
import { BeatTag, ConfigurationBlock } from '../../../../common/domain_types';
import { TagEdit } from '../../../components/tag/tag_edit';
import { AppPageProps } from '../../../frontend_types';
interface PageState {
  tag: BeatTag;
  configuration_blocks: ConfigurationBlock[];
}

export class InitialTagPage extends Component<AppPageProps, PageState> {
  constructor(props: AppPageProps) {
    super(props);
    this.state = {
      tag: {
        id: props.urlState.createdTag ? props.urlState.createdTag : uuidv4(),
        name: '',
        color: '#DD0A73',
        hasConfigurationBlocksTypes: [],
      },
      configuration_blocks: [],
    };

    if (props.urlState.createdTag) {
      this.loadTag();
    }
  }

  public render() {
    return (
      <React.Fragment>
        <TagEdit
          tag={this.state.tag}
          configuration_blocks={this.state.configuration_blocks}
          onTagChange={(field: string, value: string | number) =>
            this.setState(oldState => ({
              tag: { ...oldState.tag, [field]: value },
            }))
          }
          onConfigAddOrEdit={(block: ConfigurationBlock) => {
            alert('need to add config block');
          }}
          onConfigRemoved={(id: string) => {
            alert('need to remove config block');
          }}
        />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={this.state.configuration_blocks.length === 0}
              onClick={this.saveTag}
            >
              <FormattedMessage
                id="xpack.beatsManagement.createTag.saveAndContinueButtonLabel"
                defaultMessage="Save & Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </React.Fragment>
    );
  }

  private loadTag = async () => {
    const tags = await this.props.libs.tags.getTagsWithIds([this.state.tag.id]);
    if (tags.length > 0) {
      this.setState({
        tag: tags[0],
      });
    }
  };

  private saveTag = async () => {
    const newTag = await this.props.libs.tags.upsertTag(this.state.tag as BeatTag);
    if (!newTag) {
      return alert(
        i18n.translate('xpack.beatsManagement.createTag.errorSavingTagTitle', {
          defaultMessage: 'error saving tag',
        })
      );
    }
    this.props.setUrlState({
      createdTag: newTag.id,
    });
    this.props.goTo(`/walkthrough/initial/finish`);
  };
}
