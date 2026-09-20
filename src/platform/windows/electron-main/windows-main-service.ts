import { IInstantiationService } from '../../instantiation/common/instantiation.api';
import { IOpenEmptyWindowOptions } from '../../window/common/window.api';
import { IMHWindow } from '../../window/electron-main/window.api';
import {
  IOpenConfiguration,
  IOpenEmptyConfiguration,
  IWindowsMainService
} from './windows.api';

export class WindowsMainService implements IWindowsMainService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IInstantiationService private readonly insta: IInstantiationService
  ) {}

  open(_openConfig: IOpenConfiguration): Promise<IMHWindow[]> {
    throw new Error('Method not implemented.');
  }

  openEmptyWindow(
    _openConfig: IOpenEmptyConfiguration,
    _options?: IOpenEmptyWindowOptions
  ): Promise<IMHWindow> {
    throw new Error('Method not implemented.');
  }
}
