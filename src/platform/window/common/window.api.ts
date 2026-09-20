import { ISandboxConfiguration } from '../../../base/parts/sandbox/common/sandbox.interface';
import { NativeParsedArgs } from '../../environment/common/argv';

export const WindowMinimumSize = {
  WIDTH: 400,
  WIDTH_WITH_VERTICAL_PANEL: 600,
  HEIGHT: 270
};

export interface INativeWindowConfiguration
  extends NativeParsedArgs, ISandboxConfiguration {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IBaseOpenWindowsOptions {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IOpenEmptyWindowOptions extends IBaseOpenWindowsOptions {}
