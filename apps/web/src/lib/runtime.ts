import { Capacitor } from '@capacitor/core';

const normalizePath = (rawPath: string): string => {
  if (!rawPath || rawPath === '/') return '/';
  return rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
};

const readNativeHashRoute = (): { pathname: string; search: string } | null => {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!hash.startsWith('/')) return null;

  const queryIndex = hash.indexOf('?');
  const pathname = queryIndex >= 0 ? hash.slice(0, queryIndex) : hash;
  const search = queryIndex >= 0 ? hash.slice(queryIndex) : '';

  return {
    pathname: normalizePath(pathname),
    search,
  };
};

export const isNativeApp = Capacitor.isNativePlatform();

export const resolveCurrentPath = (): string => {
  if (typeof window === 'undefined') return '/';

  const nativeRoute = isNativeApp ? readNativeHashRoute() : null;
  if (nativeRoute) return nativeRoute.pathname;

  return normalizePath(window.location.pathname);
};

export const resolveCurrentSearch = (): string => {
  if (typeof window === 'undefined') return '';

  const nativeRoute = isNativeApp ? readNativeHashRoute() : null;
  if (nativeRoute) return nativeRoute.search;

  return window.location.search;
};

export const readCurrentSearchParams = (): URLSearchParams => {
  const search = resolveCurrentSearch();
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
};

export const isExternalHref = (href: string): boolean => {
  return /^(https?:|mailto:|tel:)/i.test(href.trim());
};

export const buildRouteHref = (
  path: string,
  params?: URLSearchParams | string | null,
): string => {
  const pathname = normalizePath(path);
  const serialized =
    params instanceof URLSearchParams
      ? params.toString()
      : String(params ?? '').replace(/^\?/, '');
  const suffix = serialized ? `?${serialized}` : '';

  return isNativeApp ? `#${pathname}${suffix}` : `${pathname}${suffix}`;
};

export const buildAppHref = (href: string): string => {
  const trimmed = href.trim();

  if (!trimmed) return buildRouteHref('/mapas');
  if (isExternalHref(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return buildRouteHref(trimmed);

  return trimmed;
};

export const buildSectionHref = (
  sectionId: string,
  currentPath = resolveCurrentPath(),
): string => {
  if (isNativeApp) {
    return buildRouteHref(currentPath);
  }

  return `#${sectionId}`;
};

export const replaceCurrentRoute = (
  path: string,
  params?: URLSearchParams,
): void => {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', buildRouteHref(path, params));
};

export const scrollToSection = (sectionId: string): void => {
  if (typeof document === 'undefined') return;

  const target = document.getElementById(sectionId);
  if (!target) return;

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};
