import { createBrowserRouter, createHashRouter } from 'react-router-dom'
import { shouldUseHashRouter } from '../utils/routerMode'
import { appRoutes } from './routes'

/** Browser router for dev/web; hash router for packaged Electron (`file://`). */
export function createAppRouter() {
  if (shouldUseHashRouter()) {
    return createHashRouter(appRoutes)
  }
  return createBrowserRouter(appRoutes)
}
