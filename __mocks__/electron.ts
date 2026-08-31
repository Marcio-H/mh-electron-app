import { vi } from 'vitest';

export const contextBridge = { exposeInMainWorld: vi.fn() };

export const app = { on: vi.fn(), quit: vi.fn() };

export const session = {
  fromPartition: vi.fn(() => ({ webRequest: { onHeadersReceived: vi.fn() } }))
};

export const Menu = { buildFromTemplate: vi.fn(() => ({ popup: vi.fn() })) };

export const BrowserWindow = Object.assign(
  vi.fn(function (options?: { height: number, width: number, webPreferences: { preload: string }}) {
    return {
      loadURL: vi.fn(),
      on: vi.fn(),
      getContentBounds: vi.fn(() => ({ x: 0, y: 0, width: options?.width || 800, height: options?.height || 600 })),
      contentView: { addChildView: vi.fn() }
    };
  }),
  { getAllWindows: vi.fn(() => []) }
);

export const WebContentsView = vi.fn(function () {
  return {
    setBounds: vi.fn(),
    webContents: { on: vi.fn(), loadURL: vi.fn() }
  };
});
