import { INativeWindowConfiguration } from '../common/window.api';

export interface IMHWindow extends IBaseWindow {
  //

  readonly config: INativeWindowConfiguration | undefined;
}

export interface IBaseWindow {
  //

  readonly id: number;
  readonly win: Electron.BrowserWindow;
}

export interface IWindowCreationOptions {
  readonly entry: IWindowEntryOptions;
  readonly state: IWindowState;
}

export interface IWindowState {
  width?: number;
  height?: number;
}

export interface IWindowEntryOptions {
  readonly preload: string;
  readonly url: string;
}
