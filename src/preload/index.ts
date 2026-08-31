// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  get: async (url: string) => `get info (url = ${JSON.stringify(url)})`,
  post: async (url: string, body: unknown) =>
    `post info (url = ${JSON.stringify(url)}, data = ${JSON.stringify(body)})`,
  put: async (url: string, body: unknown) =>
    `put info (url = ${JSON.stringify(url)}, data = ${JSON.stringify(body)})`,
  patch: async (url: string, body: unknown) =>
    `patch info (url = ${JSON.stringify(url)}, data = ${JSON.stringify(body)})`,
  delete: async (url: string) => `delete info (url = ${JSON.stringify(url)})`
});
