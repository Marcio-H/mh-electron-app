## What `platform` is

`platform` is the service layer of the main process. It is where the app learns what a window is, what a session is, the Electron lifecycle and the environment configuration. Each service wraps a piece of Electron or Node behind an interface, so that the rest of the code depends on the interface and not on the `electron` module.

## How it is organized

One folder per service. Inside it, the interface, the implementation and whatever the implementation needs:

```
platform/
  environment/
    environment.ts          IEnvironmentService: webUrl, wsUrls, preloadPath, isDebug
    environmentService.ts   the only place that reads APP_CONFIG and the webpack constants
  lifecycle/
    lifecycle.ts            ILifecycleService: onWillShutdown, quit
    lifecycleService.ts     before-quit, will-quit, window-all-closed, activate
  session/
    session.ts              ISessionService
    sessionService.ts       persistent partition and CSP header
  windows/
    windows.ts              IWindowsService: openMainWindow
    windowsService.ts
    mainWindow.ts           BrowserWindow + WebContentsView, extends Disposable
```

The interface sits next to the implementation when only the main process uses it or when it mentions Electron types, such as `BrowserWindow` or `Session`.

## What goes here

- Services used by more than one feature: window, session, lifecycle, environment, IPC server.
- Electron adapters: classes that wrap `app`, `BrowserWindow`, `WebContentsView`, `session`, `ipcMain` and `Menu`.
- Reading `APP_CONFIG` and the webpack constants, concentrated in `environment`.

## What does not go here

- Business rules of a feature. They stay in the feature and receive the services through the constructor.
- Startup decisions: what to open, in which order, when. That belongs to the entry point.
- Anything the preload or the renderer need to import.

## Allowed imports

| Source                      | Allowed               | Notes                                                                                                                      |
| --------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `electron`                  | Yes                   | `app`, `BrowserWindow`, `WebContentsView`, `session`, `ipcMain`, `Menu`, `dialog`, `screen`                                |
| Node builtins               | Yes                   | `fs`, `path`, `os`, `crypto`, `child_process`                                                                              |
| `src/base/common`           | Yes                   | Utilities, `Disposable`, IPC contract, shared types                                                                        |
| Globals injected by webpack | Only in `environment` | `APP_CONFIG`, `MAIN_WINDOW_WEBPACK_ENTRY`, `MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY`. Everything else asks `IEnvironmentService` |
| npm packages                | Yes                   | Any package that runs in Node                                                                                              |

## Forbidden imports

| Source                                            | Reason                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/preload/**` and `src/renderer/**`            | They are other processes. Anything that needs to be shared goes to `src/common` |
| `ipcRenderer`, `contextBridge`                    | They do not exist in the main process                                           |
| `window`, `document`, `navigator`, `localStorage` | They do not exist in the main process                                           |
| The entry point and the features                  | `platform` does not know who uses it. The dependency always points inward       |
| Tests and mocks                                   | `*.spec.ts`, `__tests__`, `__mocks__`                                           |

## Rules

- Every service has an interface and is received through the constructor. Nothing here instantiates another service on its own.
- Nothing here calls `app.on('ready')`. The entry point starts the app; `platform` only provides the services.

## How the rule is enforced

By ESLint, in `.eslintrc.json`.

TODO: implement rule
