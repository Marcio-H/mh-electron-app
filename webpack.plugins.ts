import path from 'path';

import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

import { DefinePlugin } from 'webpack';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

export const plugins = [
  new DefinePlugin({
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    'APP_CONFIG': JSON.stringify(require(path.resolve(__dirname, `./config/${process.env.APP_ENV || 'debug'}.json`)))
  }),
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
];
