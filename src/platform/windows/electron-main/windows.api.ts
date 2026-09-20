import { NativeParsedArgs } from '../../environment/common/argv';
import { IOpenEmptyWindowOptions } from '../../window/common/window.api';
import { IMHWindow } from '../../window/electron-main/window.api';
import { createServiceIdentifierDecorator } from '../../instantiation/common/instantiation.util';

export const IWindowsMainService =
  createServiceIdentifierDecorator<IWindowsMainService>(
    Symbol('IWindowsMainService')
  );

export interface IWindowsMainService {
  //

  open(openConfig: IOpenConfiguration): Promise<IMHWindow[]>;
  openEmptyWindow(
    openConfig: IOpenEmptyConfiguration,
    options?: IOpenEmptyWindowOptions
  ): Promise<IMHWindow>;
}

export interface IBaseOpenConfiguration {
  readonly contextWindowId?: number;
}

export interface IOpenConfiguration extends IBaseOpenConfiguration {
  readonly cli: NativeParsedArgs;
  readonly initialStartup?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IOpenEmptyConfiguration extends IBaseOpenConfiguration {}
