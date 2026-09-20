import { WindowsMainService } from '../../windows/electron-main/windows-main-service';
import { IWindowsMainService } from '../../windows/electron-main/windows.api';
import { InstantiationService } from '../common/instantiation-service';
import { IInstantiationService } from '../common/instantiation.api';
import { createRegistration, registry } from '../common/instantiation.util';

export const ConfigurationRegistry = registry([
  createRegistration({
    serviceIdentifier: IInstantiationService,
    useClass: InstantiationService
  }),
  createRegistration({
    serviceIdentifier: IWindowsMainService,
    useClass: WindowsMainService
  })
])(class {});
