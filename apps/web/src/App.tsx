import { useEffect, useState } from 'react';
import { AdminPage } from './pages/AdminPage';
import { LandingPage } from './pages/LandingPage';
import { MapPage } from './pages/MapPage';

const normalizePath = (rawPath: string): string => {
  if (!rawPath || rawPath === '/') return '/';
  return rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
};

const resolveCurrentPath = (): string => {
  if (typeof window === 'undefined') return '/';
  return normalizePath(window.location.pathname);
};

const App = () => {
  const [path, setPath] = useState(resolveCurrentPath);

  useEffect(() => {
    const onPopState = () => {
      setPath(resolveCurrentPath());
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
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

