const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const normalizePotentialId = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return YOUTUBE_ID_PATTERN.test(trimmed) ? trimmed : null;
};

const normalizeUrlInput = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const extractYouTubeVideoId = (raw: string): string | null => {
  const direct = normalizePotentialId(raw);
  if (direct) return direct;

  try {
    const url = new URL(normalizeUrlInput(raw));
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const firstPath = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return normalizePotentialId(firstPath);
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        return normalizePotentialId(url.searchParams.get('v') ?? '');
      }

      if (url.pathname.startsWith('/shorts/')) {
        const value = url.pathname.split('/').filter(Boolean)[1] ?? '';
        return normalizePotentialId(value);
      }

      if (url.pathname.startsWith('/embed/')) {
        const value = url.pathname.split('/').filter(Boolean)[1] ?? '';
        return normalizePotentialId(value);
      }

      if (url.pathname.startsWith('/live/')) {
        const value = url.pathname.split('/').filter(Boolean)[1] ?? '';
        return normalizePotentialId(value);
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const buildYouTubeWatchUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`;

export const buildYouTubeThumbnailUrl = (videoId: string): string => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
