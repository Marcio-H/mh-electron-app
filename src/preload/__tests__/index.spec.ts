import { beforeAll, describe, expect, test, vi } from 'vitest';
import { contextBridge } from 'electron';

vi.mock('electron');

const exposedApi = () =>
  vi.mocked(contextBridge.exposeInMainWorld).mock.lastCall?.[1];

describe('electron API', () => {
  beforeAll(async () => {
    await import('../index');
  });

  test('exposes the api as window.electron', () => {
    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(contextBridge.exposeInMainWorld).toHaveBeenLastCalledWith(
      'electron',
      expect.anything()
    );
  });

  describe('GET method', () => {
    test('takes only url as input', () => {
      const { get } = exposedApi();

      expect(get).toHaveLength(1);
    });
  });

  describe('POST method', () => {
    test('takes only url, and body as input', () => {
      const { post } = exposedApi();

      expect(post).toHaveLength(2);
    });
  });

  describe('PUT method', () => {
    test('takes only url, and body as input', () => {
      const { put } = exposedApi();

      expect(put).toHaveLength(2);
    });
  });

  describe('PATCH method', () => {
    test('takes only url, and body as input', () => {
      const { patch } = exposedApi();

      expect(patch).toHaveLength(2);
    });
  });

  describe('DELETE method', () => {
    test('takes only url as input', () => {
      const { delete: del } = exposedApi();

      expect(del).toHaveLength(1);
    });
  });
});
