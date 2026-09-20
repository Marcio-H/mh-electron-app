import { IServicesAccessor } from '../../instantiation/common/instantiation.api';
import { WindowMinimumSize } from '../common/window.api';
import { IWindowState } from './window.api';

export function defaultBrowserWindowOptions(
  _accessor: IServicesAccessor,
  windowState: IWindowState,
  webPreferences?: Electron.WebPreferences
): Electron.BrowserWindowConstructorOptions {
  return {
    minWidth: WindowMinimumSize.WIDTH,
    minHeight: WindowMinimumSize.HEIGHT,
    width: windowState.width,
    height: windowState.height,
    webPreferences: {
      ...webPreferences,
      spellcheck: false,
      // Enable experimental css highlight api https://chromestatus.com/feature/5436441440026624
      // Refs https://github.com/microsoft/vscode/issues/140098
      enableBlinkFeatures: 'HighlightAPI',
      sandbox: true
    }
  };
}
