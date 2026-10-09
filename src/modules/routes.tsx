/**
 * @file routes.tsx
 * @description Turns the module registry into router route objects.
 *
 * Every module route is wrapped in a ModuleGate, so a module the church has not
 * subscribed to is unreachable even by typing the URL — hiding it from the
 * sidebar alone would be a presentation trick, not a boundary.
 *
 * Routes stay registered rather than being removed when a module is off, so the
 * person who followed a stale link gets an explanation instead of a 404.
 */
import type { RouteObject } from 'react-router-dom';
import { MODULES } from './registry';
import { ModuleGate } from './ModuleGate';
import type { AppModule, ModuleRoute } from './types';

/** Longest paths first so `members/add` is matched before `members/:id`. */
function byStaticSpecificity(a: ModuleRoute, b: ModuleRoute): number {
  const params = (p: string) => (p.match(/:/g) ?? []).length;
  return params(a.path) - params(b.path) || b.path.length - a.path.length;
}

export function buildModuleRoutes(): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const module of MODULES) {
    for (const route of [...module.routes].sort(byStaticSpecificity)) {
      routes.push(toRouteObject(module, route));
    }
  }

  // Across modules too: a static segment should never lose to another module's
  // parameterised one.
  return routes.sort((a, b) => {
    const params = (p = '') => (p.match(/:/g) ?? []).length;
    return params(a.path) - params(b.path) || (b.path?.length ?? 0) - (a.path?.length ?? 0);
  });
}

function toRouteObject(module: AppModule, route: ModuleRoute): RouteObject {
  return {
    path: route.path,
    lazy: async () => {
      const loaded = await route.load();
      const Screen = loaded[route.component] as React.ComponentType;

      if (!Screen) {
        throw new Error(
          `Module "${module.id}" declares route "${route.path}" exporting "${route.component}", which that file does not export.`,
        );
      }

      return {
        Component: () => (
          <ModuleGate moduleId={module.id} permission={route.permission}>
            <Screen />
          </ModuleGate>
        ),
      };
    },
  };
}
