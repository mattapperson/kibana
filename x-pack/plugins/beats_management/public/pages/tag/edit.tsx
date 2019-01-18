/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { UNIQUENESS_ENFORCING_TYPES } from 'x-pack/plugins/beats_management/common/constants';
import { BeatTag, CMBeat, ConfigurationBlock } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { TagEdit } from '../../components/tag';
import { AppPageProps } from '../../frontend_types';
interface TagPageState {
  showFlyout: boolean;
  attachedBeats: CMBeat[] | null;
  tag: BeatTag;
  configuration_blocks: {
    error?: string | undefined;
    blocks: ConfigurationBlock[];
    page: number;
    total: number;
  };
}
class TagEditPageComponent extends React.PureComponent<
  AppPageProps & {
    intl: InjectedIntl;
  },
  TagPageState
> {
  constructor(props: AppPageProps & { intl: InjectedIntl }) {
    super(props);

    this.state = {
      showFlyout: false,
      attachedBeats: null,
      tag: {
        id: props.match.params.tagid,
        name: '',
        color: '#000',
        hasConfigurationBlocksTypes: [],
      },
      configuration_blocks: {
        blocks: [],
        page: 0,
        total: 0,
      },
    };

    this.loadTag();
    this.loadAttachedBeats();
  }
  public render() {
    const { intl } = this.props;

    return (
      <PrimaryLayout
        title={intl.formatMessage(
          {
            id: 'xpack.beatsManagement.tag.updateTagTitle',
            defaultMessage: 'Update Tag: {tagId}',
          },
          {
            tagId: this.state.tag.id,
          }
        )}
      >
        <div>
          <TagEdit
            tag={this.state.tag}
            configuration_blocks={this.state.configuration_blocks}
            onDetachBeat={async (beatIds: string[]) => {
              await this.props.containers.beats.removeTagsFromBeats(beatIds, this.state.tag.id);
              await this.loadAttachedBeats();
            }}
            onTagChange={(field: string, value: string | number) =>
              this.setState(oldState => ({
                tag: { ...oldState.tag, [field]: value },
              }))
            }
            attachedBeats={this.state.attachedBeats as CMBeat[]}
            onConfigListChange={(index: number) => {
              this.loadConfigBlocks(index);
            }}
            onConfigAddOrEdit={(block: ConfigurationBlock) => {
              this.props.libs.configBlocks
                .upsert([{ ...block, tag: this.state.tag.id }])
                .catch((e: any) => {
                  // tslint:disable-next-line
                  console.error('Error upseting config block', e);
                })
                .then(() => {
                  this.loadConfigBlocks(this.state.configuration_blocks.page);
                });
            }}
            onConfigRemoved={(id: string) => {
              this.props.libs.configBlocks
                .delete(id)
                .catch((e: any) => {
                  // tslint:disable-next-line
                  console.error(`Error removing block ${id}`, e);
                })
                .then(() => {
                  this.loadConfigBlocks(this.state.configuration_blocks.page);
                });
            }}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={
                  this.state.tag.id.search(/^[a-zA-Z0-9-]+$/) === -1 ||
                  this.state.tag.id === '' ||
                  this.getNumExclusiveConfigurationBlocks() > 1 // || this.state.tag.configuration_blocks.length === 0
                }
                onClick={this.saveTag}
              >
                <FormattedMessage
                  id="xpack.beatsManagement.tag.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => this.props.goTo('/overview/configuration_tags')}>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PrimaryLayout>
    );
  }
  private loadConfigBlocks = async (page: number = -1) => {
    const blocksResponse = await this.props.libs.configBlocks.getForTags([this.state.tag.id], page);

    if (blocksResponse.blocks.length > 0) {
      this.setState({
        configuration_blocks: blocksResponse,
      });
    }
  };

  private loadTag = async () => {
    const tags = await this.props.libs.tags.getTagsWithIds([this.props.match.params.tagid]);
    if (tags.length === 0) {
      // TODO do something to error https://github.com/elastic/kibana/issues/26023
    }
    this.setState({
      tag: tags[0],
    });
  };

  private loadAttachedBeats = async () => {
    const beats = await this.props.libs.beats.getBeatsWithTag(this.props.match.params.tagid);

    this.setState({
      attachedBeats: beats,
    });
  };
  private saveTag = async () => {
    await this.props.containers.tags.upsertTag(this.state.tag);
    this.props.goTo(`/overview/configuration_tags`);
  };
  private getNumExclusiveConfigurationBlocks = () =>
    this.state.configuration_blocks.blocks
      .map(({ type }) => UNIQUENESS_ENFORCING_TYPES.some(uniqueType => uniqueType === type))
      .reduce((acc, cur) => (cur ? acc + 1 : acc), 0);
}

export const TagEditPage = injectI18n(TagEditPageComponent);
