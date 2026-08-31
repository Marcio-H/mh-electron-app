import { beforeAll, describe, expect, test, vi } from 'vitest';
import { app, session, WebContentsView } from 'electron';

vi.mock('electron');

vi.stubGlobal('APP_CONFIG', {
  WEB_URL: 'http://web.test/',
  WEB_CONFIGURATION: { WS_CONFIGURATION: [{ URL: 'ws://ws.test' }] }
});
vi.stubGlobal('MAIN_WINDOW_WEBPACK_ENTRY', 'http://main-window.test/');
vi.stubGlobal('MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY', 'preload.js');

const appListener = (event: string) =>
  vi.mocked(app.on).mock.calls.find(([name]) => name === event)?.[1];

describe('main process', () => {
  beforeAll(async () => {
    await import('../index');
  });

  test('listens to the app lifecycle events', () => {
    expect(appListener('ready')).toBeDefined();
    expect(appListener('window-all-closed')).toBeDefined();
    expect(appListener('activate')).toBeDefined();
  });

  describe('when the app is ready', () => {
    beforeAll(() => {
      appListener('ready')?.();
    });

    test('loads the web app url', () => {
      const appWebView = vi.mocked(WebContentsView).mock.results[0].value;

      expect(appWebView.webContents.loadURL).toHaveBeenCalledWith(
        'http://web.test/'
      );
    });

    test('applies the csp with the configured ws urls to the web session responses', () => {
      const appWebSession = vi.mocked(session.fromPartition).mock.results[0]
        .value;
      const [listener] = vi.mocked(appWebSession.webRequest.onHeadersReceived)
        .mock.calls[0];
      const callback = vi.fn();

      listener({ responseHeaders: { 'x-frame-options': ['DENY'] } }, callback);

      expect(callback).toHaveBeenCalledWith({
        responseHeaders: {
          'x-frame-options': ['DENY'],
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://ws.test;"
          ]
        }
      });
    });

    test('resizes the web view to fill the window', () => {
      const appWebView = vi.mocked(WebContentsView).mock.results[0].value;

      expect(appWebView.setBounds).toHaveBeenCalledWith({
        x: 0,
        y: 0,
        width: 800,
        height: 600
      });
    });
  });

  describe('when all windows are closed', () => {
    test('quits the app when not on darwin', () => {
      const platform = process.platform;

      Object.defineProperty(process, 'platform', { value: 'win32' });
      appListener('window-all-closed')?.();
      Object.defineProperty(process, 'platform', { value: platform });

      expect(app.quit).toHaveBeenCalledTimes(1);
    });
  });
});
