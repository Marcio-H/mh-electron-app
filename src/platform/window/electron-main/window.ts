import { INativeWindowConfiguration } from '../common/window.api';
import {
  IBaseWindow,
  IMHWindow,
  IWindowCreationOptions,
  IWindowEntryOptions,
  IWindowState
} from './window.api';
import { IInstantiationService } from '../../instantiation/common/instantiation.api';
import { defaultBrowserWindowOptions } from './window.util';

export abstract class BaseWindow implements IBaseWindow {
  abstract id: number;
  abstract win: Electron.BrowserWindow;
}

export class MHWindow extends BaseWindow implements IMHWindow {
  //

  private entry: IWindowEntryOptions;

  private state: IWindowState;

  private _win: Electron.BrowserWindow;

  private _config: INativeWindowConfiguration | undefined;

  constructor(
    config: IWindowCreationOptions,
    @IInstantiationService instantiationService: IInstantiationService
  ) {
    super();
    this.entry = config.entry;
    this.state = config.state;

    const webPreferences: Electron.WebPreferences = {
      preload: this.entry.preload
    };
    const options = instantiationService.invokeFunction(
      defaultBrowserWindowOptions,
      this.state,
      webPreferences
    );

    this._win = new Electron.BrowserWindow(options);
  }

  get id(): number {
    return this._win.id;
  }

  get config(): INativeWindowConfiguration | undefined {
    return this._config;
  }

  get win(): Electron.BrowserWindow {
    return this._win;
  }

  load(configuration: INativeWindowConfiguration): void {
    this._config = configuration;
    this._win.loadURL(this.entry.url);
  }
}
