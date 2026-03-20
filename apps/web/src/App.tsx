import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useState } from 'react';
import { AdminPage } from './pages/AdminPage';
import { buildRouteHref, isNativeApp, resolveCurrentPath } from './lib/runtime';
import { LandingPage } from './pages/LandingPage';
import { MapPage } from './pages/MapPage';

const App = () => {
  const [path, setPath] = useState(resolveCurrentPath);

  useEffect(() => {
    const onPopState = () => {
      setPath(resolveCurrentPath());
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;

    const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const currentPath = resolveCurrentPath();

      if (currentPath !== '/') {
        if (canGoBack) {
          window.history.back();
          return;
        }

        window.location.hash = buildRouteHref('/');
        return;
      }

      CapacitorApp.exitApp();
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  if (path === '/mapas') {
    return <MapPage />;
  }

  if (path === '/dev/admin') {
    return <AdminPage />;
  }

  return <LandingPage />;
};

export default App;

