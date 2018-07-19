/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs,
} from '@elastic/eui';
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { PrimaryLayout } from '../../components/layouts/primary';
import { FrontendLibs } from '../../lib/lib';
import { ActivityPage } from './activity';
import { BeatsPage } from './beats';
import { TagsPage } from './tags';

interface MainPagesProps {
  history: any;
  libs: FrontendLibs;
}

interface MainPagesState {
  selectedTabId: string;
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
}

export class MainPages extends React.PureComponent<MainPagesProps, MainPagesState> {
  constructor(props: any) {
    super(props);

    this.state = {
      selectedTabId: '/',
    };
  }
  public toggleEnrollBeat = () => {
    if (this.state.enrollBeat) {
      return this.setState({
        enrollBeat: null,
      });
    }

    // TODO: create a real enromment token
    return this.setState({
      enrollBeat: { enrollmentToken: '5g3i4ug5uy34g' },
    });
  };

  public onSelectedTabChanged = (id: string) => {
    this.props.history.push(id);
  };

  public render() {
    const tabs = [
      {
        id: '/beats',
        name: 'Beats List',
        disabled: false,
      },
      {
        id: '/activity',
        name: 'Beats Activity',
        disabled: false,
      },
      {
        id: '/tags',
        name: 'Tags',
        disabled: false,
      },
    ];

    const renderedTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.props.history.location.pathname}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
    return (
      <PrimaryLayout
        title="Beats"
        actionSection={
          <Switch>
            <Route
              path="/beats/:action?/:enrollmentToken?"
              render={(props: any) => <BeatsPage.ActionArea libs={this.props.libs} {...props} />}
            />
          </Switch>
        }
      >
        <EuiTabs>{renderedTabs}</EuiTabs>

        <Switch>
          <Route
            path="/"
            exact={true}
            render={() => <Redirect from="/" exact={true} to="/beats" />}
          />
          <Route
            path="/beats/:action?/:enrollmentToken?"
            render={(props: any) => <BeatsPage libs={this.props.libs} {...props} />}
          />
          <Route
            path="/activity"
            exact={true}
            render={(props: any) => <ActivityPage libs={this.props.libs} {...props} />}
          />
          <Route
            path="/tags"
            exact={true}
            render={(props: any) => <TagsPage libs={this.props.libs} {...props} />}
          />
        </Switch>
      </PrimaryLayout>
    );
  }
}
