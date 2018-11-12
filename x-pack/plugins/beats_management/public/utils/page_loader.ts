/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';

interface PathTree {
  [path: string]: string[];
}
interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  routes?: RouteConfig[];
}

export class RouteTreeBuilder {
  constructor(
    private readonly requireWithContext: any,
    private readonly pageComponentPattern: RegExp = /Page$/
  ) {}
  public routeTreeFromPaths(paths: string[]): RouteConfig[] {
    const pathTree = this.buildTree('./', paths);
    return Object.keys(pathTree).reduce((routes: any[], filePath) => {
      if (pathTree[filePath].includes('index.tsx')) {
        routes.push(this.buildRouteWithChildren(filePath, pathTree[filePath]));
      } else {
        routes.concat(pathTree[filePath].map(file => routes.push(this.buildRoute(filePath, file))));
      }

      return routes;
    }, []);
  }

  private buildRouteWithChildren(dir: string, files: string[]) {
    const childFiles = files.filter(f => f !== 'index.tsx');
    const parentConfig = this.buildRoute(dir, 'index.tsx');
    parentConfig.routes = childFiles.map(cf => this.buildRoute(dir, cf));
    return parentConfig;
  }

  private buildRoute(dir: string, file: string): RouteConfig {
    const filePath = `${dir}${file.replace('.tsx', '').replace('index', '')}`;
    const page = this.requireWithContext(`.${dir}${file}`);

    // Make sure the expored variable name matches a pattern. By default it will choose the first
    // exported variable that matches *Page
    const componentExportName = Object.keys(page).find(varName =>
      this.pageComponentPattern.test(varName)
    );

    if (componentExportName) {
      return {
        path: filePath,
        component: page[componentExportName],
      };
    } else {
      throw new Error(
        `${dir}${file} in the pages folder does not include an exported \`*Page\` component`
      );
    }
  }

  // Build tree recursively
  private buildTree(basePath: string, paths: string[]): PathTree {
    return paths.reduce(
      (dir: any, p) => {
        const path = {
          dir:
            p
              .replace(basePath, '/') // make path absolute
              .split('/')
              .slice(0, -1) // remove file from path
              .join('/')
              .replace(/^\/\//, '') + '/', // should end in a slash but not be only //
          file: last(p.split('/')),
        };
        // take each, remove the file name

        if (dir[path.dir]) {
          dir[path.dir].push(path.file);
        } else {
          dir[path.dir] = [path.file];
        }
        return dir;
      },

      {}
    );
  }
}
