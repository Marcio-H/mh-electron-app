import { WindowsMainService } from '../../windows/electron-main/windows-main-service';
import { IWindowsMainService } from '../../windows/electron-main/windows.api';
import { InstantiationLifecycle } from '../common/instantiation.api';
import { createRegistration, registry } from '../common/instantiation.util';

export const ConfigurationRegistry = registry([
  createRegistration({
    serviceIdentifier: IWindowsMainService,
    useClass: WindowsMainService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);
