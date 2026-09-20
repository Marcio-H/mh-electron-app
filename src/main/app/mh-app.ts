import { app } from 'electron';
import { IWindowsMainService } from '../../platform/windows/electron-main/windows.api';

export class MHApplication {
  constructor(
    @IWindowsMainService
    private readonly windowsMainService: IWindowsMainService
  ) {
    this.registerListeners();
  }

  async startup(): Promise<void> {
    // Open Windows
    await this.windowsMainService.open();
  }

  private registerListeners(): void {
    app.on('activate', async (_, hasVisibleWindows) => {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (!hasVisibleWindows) {
        await this.windowsMainService?.openEmptyWindow({});
      }
    });
  }
}
