import { useEffect, useState } from 'react';
import { AdminPage } from './pages/AdminPage';
import { resolveCurrentPath } from './lib/runtime';
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

  if (path === '/mapas') {
    return <MapPage />;
  }

  if (path === '/dev/admin') {
    return <AdminPage />;
  }

  return <LandingPage />;
};

export default App;

