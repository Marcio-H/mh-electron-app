## What `common` is

Code in `common` runs in every process of the app: the Electron main process, the preload, the local renderer shell and the Vitest tests, which run in plain Node without Electron. Because of that, it can only use what the language guarantees in every one of those places.

Mental test before saving a file here: **would this file run inside a Web Worker?** There is no `window`, `document`, `require`, `process` or `electron` there. If the answer is yes, the file is `common`. If not, it belongs to the folder of the process that needs it: `electron-main`, `electron-browser` or `browser`.

## What goes here

- Service interfaces, such as `IEnvironmentService` and `IWindowsService`.
- The IPC contract: channel names and request and response types.
- Types, enums and constants shared between processes.
- Pure functions: formatting, validation, parsing, comparison.
- Data structures and utilities, such as `Disposable`.
- Error classes.

## What does not go here

- Anything that creates a window, view, menu or session.
- Reading from disk, environment variables or the network.
- DOM manipulation.

## Allowed imports

| Source | Allowed | Notes |
|---|---|---|
| Standard JavaScript globals | Yes | `Array`, `Map`, `Set`, `Promise`, `JSON`, `Date`, `Math`, `RegExp`, `Uint8Array`, `TextEncoder`, `URL`, `setTimeout`, `queueMicrotask`, `structuredClone` |
| Isomorphic npm packages | Yes, with care | Only packages with no Node or DOM dependency. Check that the package does not import `fs`, `path` or `node:*` |

## Forbidden imports

| Source | Examples |
|---|---|
| `electron` module | `app`, `BrowserWindow`, `WebContentsView`, `ipcMain`, `ipcRenderer`, `contextBridge`, `session`, `Menu` |
| Node builtins | `fs`, `path`, `os`, `child_process`, `node:crypto`, `Buffer`, `process`, `require`, `__dirname`, `module` |
| Browser globals | `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `HTMLElement`, `MutationObserver` |
| Globals injected by webpack | `APP_CONFIG`, `MAIN_WINDOW_WEBPACK_ENTRY`, `MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY` |
| Tests and mocks | `*.spec.ts`, `__tests__`, `__mocks__` |

The webpack globals only exist in the bundles where `DefinePlugin` injects them. In `common` they would be `undefined` in tests and in any other bundle.

## When you need to know which process you are in

First option, almost always the right one: don't know. Receive the information from a service injected through the constructor.

## How the rule is enforced

By ESLint, in `.eslintrc.json`. Two parts:

TODO: implement rule
