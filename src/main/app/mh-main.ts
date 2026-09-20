import { app } from 'electron';
import {
  IInstantiationService,
  IServicesAccessor
} from '../../platform/instantiation/common/instantiation.api';
import { MHApplication } from './mh-app';
import { InstantiationService } from '../../platform/instantiation/common/instantiation-service';
import { ConfigurationRegistry } from '../../platform/instantiation/electron-main/configuration-registry';
import { getErrorMessage } from '../../base/common/error';

class MHMain {
  main(): void {
    try {
      this.startup();
    } catch (err: unknown) {
      console.error(getErrorMessage(err));
      app.exit(1);
    }
  }

  private async startup(): Promise<void> {
    const [instantiationService] = this.createServices();

    try {
      // eslint-disable-next-line no-useless-catch
      try {
        await this.initServices();
      } catch (error) {
        throw error;
      }

      await instantiationService.invokeFunction(async (_accessor) => {
        const _mainProcessServer =
          await this.claimInstance(instantiationService);

        return instantiationService.createInstance(MHApplication).startup();
      });
    } catch (error: unknown) {
      instantiationService.invokeFunction(this.quit, error);
    }
  }

  private createServices(): [IInstantiationService] {
    const instantiationService = new InstantiationService(
      new ConfigurationRegistry()
    );

    return [instantiationService];
  }

  private async initServices(..._args: unknown[]): Promise<void> {
    //
  }

  private async claimInstance(
    _instantiationService: IInstantiationService
  ): Promise<unknown> {
    return undefined; //
  }

  private quit(_accessor: IServicesAccessor, _reason: unknown): void {
    //
  }
}

const mh = new MHMain();

mh.main();
