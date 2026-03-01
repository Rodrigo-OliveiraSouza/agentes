import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  HOME_THEME_OPTIONS,
  compareHomeNewsItems,
  defaultHomeContent,
  loadHomeContent,
  saveHomeContent,
  syncHomeContentFromApi,
  type HomeCarouselItem,
  type HomeCarouselMediaType,
  type HomeContent,
  type HomeMediaItem,
  type HomeMediaItemType,
  type HomeNewsItem,
  type HomeThemeKey,
} from '../lib/homeContent';
import { buildYouTubeThumbnailUrl, buildYouTubeWatchUrl, extractYouTubeVideoId } from '../lib/youtube';

const ADMIN_SESSION_KEY = 'luiza-barros-admin-session-v1';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 90;
const ADMIN_FALLBACK_ACCESS_CODE = 'luiza-barros-2026';

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
const normalizeSearch = (value: string): string => value.trim().toLowerCase();
const todayDate = (): string => new Date().toISOString().slice(0, 10);
const truncateText = (value: string, maxLength: number): string => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};
const formatNewsDateLabel = (value: string): string => {
  if (!value.trim()) return 'Sem data';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};
const formatPortalNewsDateLabel = (value: string): string => {
  if (!value.trim()) return 'Data nao informada';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
};
const getThemeLabel = (theme: HomeThemeKey): string => {
  return HOME_THEME_OPTIONS.find((option) => option.key === theme)?.label ?? theme;
};

type AdminNewsTemplate = 'padrao' | 'destaque' | 'reacao';

const getNewsPlacementMeta = (index: number): { label: string; tone: 'primary' | 'secondary' | 'feed' } => {
  if (index === 0) {
    return {
      label: 'Destaque principal',
      tone: 'primary',
    };
  }

  if (index === 1) {
    return {
      label: 'Destaque lateral',
      tone: 'secondary',
    };
  }

  return {
    label: `Grade ${index - 1}`,
    tone: 'feed',
  };
};

const createNewsItem = (theme: HomeThemeKey, template: AdminNewsTemplate): HomeNewsItem => {
  const base: HomeNewsItem = {
    id: makeId('news'),
    theme,
    title: 'Nova noticia',
    summary: 'Resumo da noticia',
    date: todayDate(),
    imageUrl: '',
    link: '/mapas',
    reaction: 'Sem reacao registrada.',
    priority: 0,
  };

  if (template === 'destaque') {
    return {
      ...base,
      title: 'Novo destaque',
      summary: 'Explique o fato principal, o territorio e o impacto em ate duas linhas.',
      reaction: 'Registre a reacao institucional ou comunitaria ao destaque.',
    };
  }

  if (template === 'reacao') {
    return {
      ...base,
      title: 'Nova noticia com reacao',
      summary: 'Descreva o acontecimento, onde ocorreu e os proximos passos.',
      reaction: 'Descreva como a comunidade, equipe tecnica ou gestao reagiu.',
    };
  }

  return base;
};

const getNewsPreviewImage = (item: HomeNewsItem, position: number, carousel: HomeCarouselItem[]): string => {
  if (item.imageUrl.trim()) return item.imageUrl.trim();
  if (!carousel.length) return '';
  return carousel[position % carousel.length]?.imageUrl ?? '';
};

const filterNewsItems = (
  items: HomeNewsItem[],
  themeSet: Set<HomeThemeKey>,
  normalizedQuickSearch: string,
): HomeNewsItem[] =>
  items
    .filter((item) => themeSet.has(item.theme))
    .filter((item) => {
      if (!normalizedQuickSearch) return true;
      const haystack = normalizeSearch([item.title, item.summary, item.reaction, item.link, item.imageUrl, item.date].join(' '));
      return haystack.includes(normalizedQuickSearch);
    });

const getNextNewsPriority = (items: HomeNewsItem[], theme: HomeThemeKey): number =>
  items.reduce((maxPriority, item) => (item.theme === theme ? Math.max(maxPriority, item.priority) : maxPriority), 0) + 1;

const parseSavedHomeContent = (snapshot: string): HomeContent => {
  try {
    return JSON.parse(snapshot) as HomeContent;
  } catch {
    return defaultHomeContent;
  }
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getExpectedAccessCode = (): string => {
  const configured = import.meta.env.VITE_ADMIN_ACCESS_CODE?.trim();
  if (configured && configured.length >= 4) {
    return configured;
  }
  return ADMIN_FALLBACK_ACCESS_CODE;
};

const hasValidAdminSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw) as { expiresAt?: number };
    if (typeof payload.expiresAt !== 'number' || payload.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return false;
  }
};

const persistAdminSession = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    }),
  );
};

const clearAdminSession = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

const normalizeYoutubeSlide = (item: HomeCarouselItem, rawUrl: string): HomeCarouselItem => {
  const trimmed = rawUrl.trim();
  const videoId = extractYouTubeVideoId(trimmed);
  if (!videoId) {
    return {
      ...item,
      youtubeUrl: trimmed,
      link: trimmed || item.link,
    };
  }

  const watchUrl = buildYouTubeWatchUrl(videoId);
  return {
    ...item,
    youtubeUrl: watchUrl,
    link: watchUrl,
    imageUrl: buildYouTubeThumbnailUrl(videoId),
  };
};

const normalizeMediaVideoItem = (item: HomeMediaItem, rawUrl: string): HomeMediaItem => {
  const trimmed = rawUrl.trim();
  const videoId = extractYouTubeVideoId(trimmed);
  if (!videoId) {
    return {
      ...item,
      youtubeUrl: trimmed,
      link: trimmed || item.link,
    };
  }

  const watchUrl = buildYouTubeWatchUrl(videoId);
  return {
    ...item,
    youtubeUrl: watchUrl,
    link: watchUrl,
    imageUrl: buildYouTubeThumbnailUrl(videoId),
  };
};

type AdminMediaFilter = 'all' | HomeMediaItemType;

export const AdminPage = () => {
  const expectedAccessCode = useMemo(getExpectedAccessCode, []);
  const isFallbackCode = expectedAccessCode === ADMIN_FALLBACK_ACCESS_CODE;
  const [isUnlocked, setIsUnlocked] = useState(hasValidAdminSession);
  const [accessCode, setAccessCode] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [draft, setDraft] = useState(loadHomeContent);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(loadHomeContent()));
  const [status, setStatus] = useState('');
  const [editorTheme, setEditorTheme] = useState<HomeThemeKey>('politica');
  const [includeGeneralTheme, setIncludeGeneralTheme] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<AdminMediaFilter>('video');
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked) return;
    let alive = true;

    const hydrateFromApi = async () => {
      const remote = await syncHomeContentFromApi();
      if (!alive || !remote) return;
      const snapshot = JSON.stringify(remote);
      setDraft(remote);
      setLastSavedSnapshot(snapshot);
    };

    hydrateFromApi();
    return () => {
      alive = false;
    };
  }, [isUnlocked]);

  const publishedContent = useMemo(() => parseSavedHomeContent(lastSavedSnapshot), [lastSavedSnapshot]);
  const sortedNews = useMemo(
    () =>
      draft.news
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const byPlacement = compareHomeNewsItems(a.item, b.item);
          return byPlacement !== 0 ? byPlacement : a.index - b.index;
        })
        .map(({ item }) => item),
    [draft.news],
  );
  const publishedSortedNews = useMemo(
    () =>
      publishedContent.news
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const byPlacement = compareHomeNewsItems(a.item, b.item);
          return byPlacement !== 0 ? byPlacement : a.index - b.index;
        })
        .map(({ item }) => item),
    [publishedContent.news],
  );
  const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const hasUnsavedChanges = draftSnapshot !== lastSavedSnapshot;
  const normalizedQuickSearch = useMemo(() => normalizeSearch(quickSearch), [quickSearch]);
  const editorThemeLabel = useMemo(
    () => HOME_THEME_OPTIONS.find((option) => option.key === editorTheme)?.label ?? editorTheme,
    [editorTheme],
  );
  const editorThemeSet = useMemo(() => {
    const items = new Set<HomeThemeKey>([editorTheme]);
    if (includeGeneralTheme && editorTheme !== 'geral') {
      items.add('geral');
    }
    return items;
  }, [editorTheme, includeGeneralTheme]);
  const filteredNews = useMemo(
    () => filterNewsItems(sortedNews, editorThemeSet, normalizedQuickSearch),
    [sortedNews, editorThemeSet, normalizedQuickSearch],
  );
  const publishedFilteredNews = useMemo(
    () => filterNewsItems(publishedSortedNews, editorThemeSet, normalizedQuickSearch),
    [publishedSortedNews, editorThemeSet, normalizedQuickSearch],
  );
  const filteredMediaItems = useMemo(() => {
    const itemsByTheme = draft.mediaItems.filter((item) => editorThemeSet.has(item.theme));
    const itemsByType = mediaFilter === 'all' ? itemsByTheme : itemsByTheme.filter((item) => item.type === mediaFilter);
    return itemsByType.filter((item) => {
      if (!normalizedQuickSearch) return true;
      const haystack = normalizeSearch([item.title, item.description, item.link, item.youtubeUrl].join(' '));
      return haystack.includes(normalizedQuickSearch);
    });
  }, [draft.mediaItems, editorThemeSet, mediaFilter, normalizedQuickSearch]);
  const editorThemeStats = useMemo(() => {
    return {
      news: draft.news.filter((item) => item.theme === editorTheme).length,
      videos: draft.mediaItems.filter((item) => item.theme === editorTheme && item.type === 'video').length,
    };
  }, [draft.news, draft.mediaItems, editorTheme]);
  const draftNewsById = useMemo(() => new Map(draft.news.map((item) => [item.id, item])), [draft.news]);
  const publishedNewsById = useMemo(
    () => new Map(publishedContent.news.map((item) => [item.id, item])),
    [publishedContent.news],
  );
  const filteredNewsPositionById = useMemo(
    () => new Map(filteredNews.map((item, index) => [item.id, index])),
    [filteredNews],
  );
  const publishedNewsPositionById = useMemo(
    () => new Map(publishedFilteredNews.map((item, index) => [item.id, index])),
    [publishedFilteredNews],
  );
  const draftOnlyNews = useMemo(
    () => filteredNews.filter((item) => !publishedNewsById.has(item.id)),
    [filteredNews, publishedNewsById],
  );
  const selectedNews = useMemo(
    () => filteredNews.find((item) => item.id === selectedNewsId) ?? filteredNews[0] ?? null,
    [filteredNews, selectedNewsId],
  );
  const selectedNewsPosition = useMemo(
    () => (selectedNews ? filteredNews.findIndex((item) => item.id === selectedNews.id) : -1),
    [filteredNews, selectedNews],
  );
  const selectedNewsPlacement = useMemo(
    () => (selectedNewsPosition >= 0 ? getNewsPlacementMeta(selectedNewsPosition) : null),
    [selectedNewsPosition],
  );
  const selectedPublishedNews = useMemo(
    () => (selectedNews ? publishedNewsById.get(selectedNews.id) ?? null : null),
    [publishedNewsById, selectedNews],
  );
  const selectedNewsSaveState = useMemo(() => {
    if (!selectedNews) return null;
    if (!selectedPublishedNews) {
      return {
        label: 'Nova antes de publicar',
        tone: 'new',
      } as const;
    }
    if (JSON.stringify(selectedNews) !== JSON.stringify(selectedPublishedNews)) {
      return {
        label: 'Alterada no rascunho',
        tone: 'changed',
      } as const;
    }
    return {
      label: 'Igual ao publicado',
      tone: 'live',
    } as const;
  }, [selectedNews, selectedPublishedNews]);
  const filteredNewsStats = useMemo(
    () => ({
      total: filteredNews.length,
      withImage: filteredNews.filter((item) => item.imageUrl.trim()).length,
      missingLink: filteredNews.filter((item) => !item.link.trim()).length,
      missingReaction: filteredNews.filter((item) => !item.reaction.trim() || item.reaction === 'Sem reacao registrada.').length,
    }),
    [filteredNews],
  );
  const newsScopeLabel = includeGeneralTheme && editorTheme !== 'geral' ? `${editorThemeLabel} + Geral` : editorThemeLabel;
  const previewPrimaryNews = filteredNews[0] ?? null;
  const previewSecondaryNews = filteredNews[1] ?? null;
  const previewGridNews = useMemo(() => filteredNews.slice(2, 8), [filteredNews]);
  const previewMoreCount = Math.max(filteredNews.length - previewGridNews.length - 2, 0);
  const previewPrimaryImage = useMemo(
    () => (previewPrimaryNews ? getNewsPreviewImage(previewPrimaryNews, 0, draft.carousel) : ''),
    [draft.carousel, previewPrimaryNews],
  );
  const previewSecondaryImage = useMemo(
    () => (previewSecondaryNews ? getNewsPreviewImage(previewSecondaryNews, 1, draft.carousel) : ''),
    [draft.carousel, previewSecondaryNews],
  );

  useEffect(() => {
    if (!filteredNews.length) {
      if (selectedNewsId !== null) {
        setSelectedNewsId(null);
      }
      return;
    }

    if (!selectedNewsId || !filteredNews.some((item) => item.id === selectedNewsId)) {
      setSelectedNewsId(filteredNews[0].id);
    }
  }, [filteredNews, selectedNewsId]);

  const unlockAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (accessCode.trim() !== expectedAccessCode) {
      setAccessMessage('Código inválido. Tente novamente.');
      return;
    }

    persistAdminSession();
    setIsUnlocked(true);
    setAccessCode('');
    setAccessMessage('');
  };

  const lockAdmin = () => {
    clearAdminSession();
    setIsUnlocked(false);
    setStatus('');
    setAccessCode('');
    setAccessMessage('Sessão encerrada.');
  };

  if (!isUnlocked) {
    return (
      <div className="admin-gate-shell">
        <section className="admin-gate-card">
          <p className="admin-kicker">Painel protegido</p>
          <h1>Acesso restrito</h1>
          <p>Informe o código para editar conteúdo da página inicial.</p>
          <form className="admin-gate-form" onSubmit={unlockAdmin}>
            <label htmlFor="admin-access-code">
              Código de acesso
              <input
                id="admin-access-code"
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Digite o código"
                autoComplete="off"
              />
            </label>
            <button type="submit">Entrar no painel</button>
          </form>
          {accessMessage ? <p className="admin-gate-message">{accessMessage}</p> : null}
          {isFallbackCode ? (
            <p className="admin-gate-warning">
              Código padrão em uso. Defina `VITE_ADMIN_ACCESS_CODE` no ambiente para aumentar a segurança.
            </p>
          ) : null}
          <a href="/">Voltar para página inicial</a>
        </section>
      </div>
    );
  }

  const updateCarousel = (id: string, patch: Partial<HomeCarouselItem>) => {
    setDraft((current) => ({
      ...current,
      carousel: current.carousel.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const updateNews = (id: string, patch: Partial<HomeNewsItem>) => {
    setDraft((current) => ({
      ...current,
      news: current.news.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const updateMediaItem = (id: string, patch: Partial<HomeMediaItem>) => {
    setDraft((current) => ({
      ...current,
      mediaItems: current.mediaItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const moveCarouselItem = (id: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.carousel.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.carousel.length) return current;

      const carousel = [...current.carousel];
      const [item] = carousel.splice(index, 1);
      carousel.splice(target, 0, item);
      return {
        ...current,
        carousel,
      };
    });
  };

  const updateCarouselMediaType = (id: string, mediaType: HomeCarouselMediaType) => {
    setDraft((current) => ({
      ...current,
      carousel: current.carousel.map((item) => {
        if (item.id !== id) return item;
        if (mediaType === 'youtube') {
          return normalizeYoutubeSlide({ ...item, mediaType }, item.youtubeUrl || item.link);
        }
        return { ...item, mediaType };
      }),
    }));
  };

  const moveMediaItem = (id: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.mediaItems.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.mediaItems.length) return current;

      const mediaItems = [...current.mediaItems];
      const [item] = mediaItems.splice(index, 1);
      mediaItems.splice(target, 0, item);
      return {
        ...current,
        mediaItems,
      };
    });
  };

  const updateMediaItemType = (id: string, type: HomeMediaItemType) => {
    setDraft((current) => ({
      ...current,
      mediaItems: current.mediaItems.map((item) => {
        if (item.id !== id) return item;
        if (type === 'video') {
          return normalizeMediaVideoItem({ ...item, type }, item.youtubeUrl || item.link);
        }
        if (type === 'text') {
          return { ...item, type, youtubeUrl: '' };
        }
        return { ...item, type, youtubeUrl: '' };
      }),
    }));
  };

  const addVideoForEditorTheme = () => {
    setMediaFilter('video');
    setDraft((current) => ({
      ...current,
      mediaItems: [
        ...current.mediaItems,
        {
          id: makeId('material'),
          type: 'video',
          theme: editorTheme,
          title: 'Novo vídeo',
          description: 'Resumo do vídeo para esta aba.',
          imageUrl: '',
          youtubeUrl: '',
          link: '',
        },
      ],
    }));
  };

  const addMaterialForEditorTheme = () => {
    setDraft((current) => ({
      ...current,
      mediaItems: [
        ...current.mediaItems,
        {
          id: makeId('material'),
          type: 'photo',
          theme: editorTheme,
          title: 'Novo material',
          description: 'Descrição do material',
          imageUrl: '',
          youtubeUrl: '',
          link: '',
        },
      ],
    }));
  };

  const duplicateMediaItem = (item: HomeMediaItem) => {
    setDraft((current) => ({
      ...current,
      mediaItems: [
        ...current.mediaItems,
        {
          ...item,
          id: makeId('material'),
          title: `${item.title || 'Material'} (cópia)`,
        },
      ],
    }));
  };

  const selectOrRestoreNewsItem = (item: HomeNewsItem) => {
    setDraft((current) => {
      if (current.news.some((entry) => entry.id === item.id)) {
        return current;
      }
      return {
        ...current,
        news: [...current.news, { ...item }],
      };
    });
    setSelectedNewsId(item.id);
  };

  const moveNewsToHighlight = (item: HomeNewsItem) => {
    setDraft((current) => {
      const existingItem = current.news.find((entry) => entry.id === item.id) ?? item;
      const nextPriority = getNextNewsPriority(current.news, existingItem.theme);
      const news = current.news.some((entry) => entry.id === item.id) ? current.news : [...current.news, { ...item }];

      return {
        ...current,
        news: news.map((entry) => (entry.id === item.id ? { ...entry, priority: nextPriority } : entry)),
      };
    });
    setSelectedNewsId(item.id);
  };

  const addNewsItem = (template: AdminNewsTemplate = 'padrao') => {
    const nextNewsItem = createNewsItem(editorTheme, template);
    setDraft((current) => ({
      ...current,
      news: [
        ...current.news,
        template === 'destaque'
          ? {
              ...nextNewsItem,
              priority: getNextNewsPriority(current.news, nextNewsItem.theme),
            }
          : nextNewsItem,
      ],
    }));
    setSelectedNewsId(nextNewsItem.id);
  };

  const duplicateAndSelectNewsItem = (item: HomeNewsItem) => {
    const duplicate = {
      ...item,
      id: makeId('news'),
      title: `${item.title || 'Noticia'} (copia)`,
      priority: 0,
    };

    setDraft((current) => ({
      ...current,
      news: [...current.news, duplicate],
    }));
    setSelectedNewsId(duplicate.id);
  };

  const removeNewsItem = (id: string) => {
    const item = draft.news.find((entry) => entry.id === id);
    if (item && typeof window !== 'undefined') {
      const itemTitle = item.title.trim() || 'esta noticia';
      if (!window.confirm(`Remover "${itemTitle}"?`)) {
        return;
      }
    }

    setDraft((current) => ({
      ...current,
      news: current.news.filter((entry) => entry.id !== id),
    }));

    if (selectedNewsId === id) {
      setSelectedNewsId(null);
    }
  };

  const applyNewsStructure = (item: HomeNewsItem) => {
    updateNews(item.id, {
      title: item.title.trim() || `Atualizacao - ${getThemeLabel(item.theme)}`,
      summary: item.summary.trim() || 'Explique o fato principal, o territorio afetado e o impacto em duas linhas.',
      reaction: item.reaction.trim() || 'Registre a reacao da comunidade, equipe tecnica ou gestao.',
      link: item.link.trim() || '/mapas',
      date: item.date.trim() || todayDate(),
    });
  };

  const discardUnsavedChanges = () => {
    const persisted = loadHomeContent();
    const snapshot = JSON.stringify(persisted);
    setDraft(persisted);
    setLastSavedSnapshot(snapshot);
    setStatus('Alterações não salvas descartadas.');
    window.setTimeout(() => setStatus(''), 2500);
  };

  const saveDraft = async () => {
    const payload = {
      ...draft,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const result = await saveHomeContent(payload);
    setDraft(result.normalized);
    if (result.remoteSaved) {
      setLastSavedSnapshot(JSON.stringify(result.normalized));
      setStatus('Conteudo salvo no banco e no cache local.');
    } else {
      setStatus(`Falha ao salvar no banco. ${result.errorMessage ?? 'Conteudo mantido apenas no cache local.'}`);
    }
    window.setTimeout(() => setStatus(''), 2500);
  };

  const restoreDefault = async () => {
    const result = await saveHomeContent(defaultHomeContent);
    setDraft(result.normalized);
    if (result.remoteSaved) {
      setLastSavedSnapshot(JSON.stringify(result.normalized));
      setStatus('Conteudo restaurado para o padrao no banco e no cache local.');
    } else {
      setStatus(
        `Conteudo restaurado apenas no cache local. ${result.errorMessage ?? 'A persistencia remota falhou.'}`,
      );
    }
    window.setTimeout(() => setStatus(''), 2500);
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Painel interno</p>
          <h1>Gestão de divulgação - Esinapir</h1>
          <p>Rota reservada: `/dev/admin` (não exibida no menu público).</p>
        </div>
        <div className="admin-header-actions">
          <p className={`admin-dirty-chip${hasUnsavedChanges ? ' is-dirty' : ''}`}>
            {hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo'}
          </p>
          <button type="button" onClick={saveDraft} disabled={!hasUnsavedChanges}>
            Salvar conteúdo
          </button>
          <button type="button" onClick={discardUnsavedChanges} disabled={!hasUnsavedChanges}>
            Descartar não salvo
          </button>
          <button type="button" onClick={restoreDefault}>
            Restaurar padrão
          </button>
          <button type="button" onClick={lockAdmin}>
            Encerrar sessão
          </button>
          <a href="/mapas" target="_blank" rel="noreferrer">
            Ver mapas
          </a>
          <a href="/">Voltar para página inicial</a>
        </div>
      </header>

      {status ? <p className="admin-status">{status}</p> : null}

      <section className="admin-card">
        <h2>Navegação do painel</h2>
        <div className="admin-section-nav">
          <a href="#admin-dados">Dados gerais</a>
          <a href="#admin-edicao-aba">Edição por aba</a>
          <a href="#admin-carrossel">Carrossel</a>
          <a href="#admin-midias">Vídeos e materiais</a>
          <a href="#admin-noticias">Notícias</a>
          <a href="#admin-seguranca">Segurança</a>
        </div>
      </section>

      <section id="admin-dados" className="admin-card">
        <h2>Dados gerais</h2>
        <div className="admin-grid">
          <label>
            Nome do projeto
            <input
              value={draft.projectName}
              onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))}
            />
          </label>
          <label>
            Frase institucional
            <input
              value={draft.institutionTagline}
              onChange={(event) => setDraft((current) => ({ ...current, institutionTagline: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <section id="admin-edicao-aba" className="admin-card">
        <h2>Edição rápida por aba</h2>
        <p className="admin-helper-text">
          Selecione a aba temática para filtrar notícias e vídeos. Os botões de adicionar já criam conteúdo na aba
          escolhida.
        </p>
        <div className="admin-theme-tabs" role="tablist" aria-label="Aba temática em edição">
          {HOME_THEME_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={option.key === editorTheme ? 'active' : ''}
              onClick={() => setEditorTheme(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="admin-theme-toolbar">
          <label className="admin-theme-toggle">
            <input
              type="checkbox"
              checked={includeGeneralTheme}
              disabled={editorTheme === 'geral'}
              onChange={(event) => setIncludeGeneralTheme(event.target.checked)}
            />
            Incluir também conteúdos da aba Geral
          </label>
          <p className="admin-theme-stats">
            Na aba <strong>{editorThemeLabel}</strong>: {editorThemeStats.news} notícias e {editorThemeStats.videos}{' '}
            vídeos.
          </p>
        </div>
        <div className="admin-search-row">
          <label htmlFor="admin-quick-search">
            Busca rápida na aba
            <input
              id="admin-quick-search"
              type="text"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Filtrar por título, resumo, reação, descrição ou link"
            />
          </label>
          <button type="button" onClick={() => setQuickSearch('')} disabled={!quickSearch.trim()}>
            Limpar busca
          </button>
        </div>
      </section>

      <section id="admin-carrossel" className="admin-card">
        <div className="admin-section-head">
          <h2>Carrossel da página inicial</h2>
          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                carousel: [
                  ...current.carousel,
                  {
                    id: makeId('slide'),
                    mediaType: 'image',
                    imageUrl: '',
                    youtubeUrl: '',
                    title: 'Novo destaque',
                    summary: 'Resumo do destaque',
                    link: '/mapas',
                  },
                ],
              }))
            }
          >
            Adicionar slide
          </button>
        </div>
        <p className="admin-helper-text">
          Imagens fixas no repositório: `apps/web/src/assets/carousel`. Aqui você também pode usar upload local ou
          link de vídeo do YouTube (sem hospedar vídeo no site).
        </p>

        <div className="admin-list">
          {draft.carousel.map((item, index) => {
            const videoId = extractYouTubeVideoId(item.youtubeUrl || item.link);
            const youtubeWatchUrl = videoId ? buildYouTubeWatchUrl(videoId) : '';

            return (
              <details className="admin-item admin-fold-item" key={item.id} open={index < 2}>
                <summary className="admin-fold-summary">
                  <div>
                    <h3>{item.title || 'Slide sem título'}</h3>
                    <p>
                      Slide {index + 1} - {item.mediaType === 'youtube' ? 'Vídeo no YouTube' : 'Imagem'}
                    </p>
                  </div>
                  <span>{index < 2 ? 'Aberto' : 'Fechado'}</span>
                </summary>

                <div className="admin-fold-body">
                  <div className="admin-item-head admin-item-actions">
                    <div>
                      <button type="button" onClick={() => moveCarouselItem(item.id, -1)} disabled={index === 0}>
                        Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCarouselItem(item.id, 1)}
                        disabled={index === draft.carousel.length - 1}
                      >
                        Descer
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          carousel: current.carousel.filter((entry) => entry.id !== item.id),
                        }))
                      }
                    >
                      Remover
                    </button>
                  </div>

                  <div className="admin-grid">
                    <label>
                      Título
                      <input value={item.title} onChange={(event) => updateCarousel(item.id, { title: event.target.value })} />
                    </label>
                    <label>
                      Tipo de mídia
                      <select
                        value={item.mediaType}
                        onChange={(event) => updateCarouselMediaType(item.id, event.target.value as HomeCarouselMediaType)}
                      >
                        <option value="image">Imagem</option>
                        <option value="youtube">Vídeo no YouTube</option>
                      </select>
                    </label>
                    <label className="admin-span-2">
                      Resumo
                      <textarea value={item.summary} onChange={(event) => updateCarousel(item.id, { summary: event.target.value })} />
                    </label>

                    {item.mediaType === 'youtube' ? (
                      <>
                        <label className="admin-span-2">
                          Link do YouTube
                          <input
                            value={item.youtubeUrl}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                carousel: current.carousel.map((entry) =>
                                  entry.id === item.id ? normalizeYoutubeSlide(entry, event.target.value) : entry,
                                ),
                              }))
                            }
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </label>
                        <p className={`admin-media-hint admin-span-2${videoId ? ' is-valid' : ''}`}>
                          {videoId
                            ? 'Vídeo reconhecido: a capa do YouTube será usada no carrossel.'
                            : 'Cole um link válido do YouTube para gerar capa e link automaticamente.'}
                        </p>
                        {youtubeWatchUrl ? (
                          <a className="admin-external-link admin-span-2" href={youtubeWatchUrl} target="_blank" rel="noreferrer">
                            Abrir vídeo no YouTube
                          </a>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <label>
                          Link de destino
                          <input value={item.link} onChange={(event) => updateCarousel(item.id, { link: event.target.value })} />
                        </label>
                        <div className="admin-inline-actions">
                          <button type="button" onClick={() => updateCarousel(item.id, { imageUrl: '' })}>
                            Limpar imagem atual
                          </button>
                        </div>
                        <label className="admin-span-2">
                          URL da imagem
                          <input
                            value={item.imageUrl}
                            onChange={(event) => updateCarousel(item.id, { imageUrl: event.target.value })}
                            placeholder="https://..."
                          />
                        </label>
                        <label className="admin-span-2">
                          Upload local (base64)
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const imageUrl = await readFileAsDataUrl(file);
                              updateCarousel(item.id, { imageUrl });
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section id="admin-midias" className="admin-card">
        <div className="admin-section-head">
          <h2>Vídeos e materiais - {editorThemeLabel}</h2>
          <div className="admin-section-actions">
            <button type="button" onClick={addVideoForEditorTheme}>
              Adicionar vídeo desta aba
            </button>
            <button type="button" onClick={addMaterialForEditorTheme}>
              Adicionar material desta aba
            </button>
          </div>
        </div>
        <p className="admin-helper-text">
          Lista filtrada pela aba em edição. Você pode alternar entre vídeo, foto, folder e texto para editar o que
          aparece em cada aba da página inicial.
        </p>
        <div className="admin-toolbar-row">
          <label htmlFor="admin-media-filter">Tipo listado</label>
          <select
            id="admin-media-filter"
            value={mediaFilter}
            onChange={(event) => setMediaFilter(event.target.value as AdminMediaFilter)}
          >
            <option value="video">Somente vídeos</option>
            <option value="photo">Somente fotos</option>
            <option value="folder">Somente folders</option>
            <option value="text">Somente textos</option>
            <option value="all">Todos os tipos</option>
          </select>
        </div>

        {filteredMediaItems.length ? (
          <div className="admin-list">
            {filteredMediaItems.map((item, index) => {
              const globalIndex = draft.mediaItems.findIndex((entry) => entry.id === item.id);
              const videoId = extractYouTubeVideoId(item.youtubeUrl || item.link);
              const youtubeWatchUrl = videoId ? buildYouTubeWatchUrl(videoId) : '';
              const typeLabel =
                item.type === 'photo'
                  ? 'Foto'
                  : item.type === 'video'
                    ? 'Vídeo'
                    : item.type === 'folder'
                      ? 'Folder'
                      : 'Texto';
              const themeLabel = HOME_THEME_OPTIONS.find((option) => option.key === item.theme)?.label ?? item.theme;

              return (
                <details className="admin-item admin-fold-item" key={item.id} open={index < 3}>
                  <summary className="admin-fold-summary">
                    <div>
                      <h3>{item.title || 'Material sem título'}</h3>
                      <p>
                        Item {index + 1} - {typeLabel} | Aba: {themeLabel}
                      </p>
                    </div>
                    <span>{index < 3 ? 'Aberto' : 'Fechado'}</span>
                  </summary>

                  <div className="admin-fold-body">
                    <div className="admin-item-head admin-item-actions">
                      <div>
                        <button type="button" onClick={() => moveMediaItem(item.id, -1)} disabled={globalIndex <= 0}>
                          Subir
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMediaItem(item.id, 1)}
                          disabled={globalIndex < 0 || globalIndex === draft.mediaItems.length - 1}
                        >
                          Descer
                        </button>
                      </div>
                      <div>
                        <button type="button" onClick={() => duplicateMediaItem(item)}>
                          Duplicar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              mediaItems: current.mediaItems.filter((entry) => entry.id !== item.id),
                            }))
                          }
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="admin-grid">
                      <label>
                        Título
                        <input value={item.title} onChange={(event) => updateMediaItem(item.id, { title: event.target.value })} />
                      </label>
                      <label>
                        Tipo de material
                        <select value={item.type} onChange={(event) => updateMediaItemType(item.id, event.target.value as HomeMediaItemType)}>
                          <option value="photo">Foto</option>
                          <option value="video">Vídeo (YouTube)</option>
                          <option value="folder">Folder</option>
                          <option value="text">Texto</option>
                        </select>
                      </label>
                      <label>
                        Tema do destaque
                        <select value={item.theme} onChange={(event) => updateMediaItem(item.id, { theme: event.target.value as HomeThemeKey })}>
                          {HOME_THEME_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-span-2">
                        Texto / descrição
                        <textarea value={item.description} onChange={(event) => updateMediaItem(item.id, { description: event.target.value })} />
                      </label>

                      {item.type === 'video' ? (
                        <>
                          <label className="admin-span-2">
                            Link do YouTube
                            <input
                              value={item.youtubeUrl}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  mediaItems: current.mediaItems.map((entry) =>
                                    entry.id === item.id ? normalizeMediaVideoItem(entry, event.target.value) : entry,
                                  ),
                                }))
                              }
                              placeholder="https://www.youtube.com/watch?v=..."
                            />
                          </label>
                          <p className={`admin-media-hint admin-span-2${videoId ? ' is-valid' : ''}`}>
                            {videoId
                              ? 'Vídeo reconhecido: capa e link para YouTube atualizados automaticamente.'
                              : 'Cole um link válido do YouTube para ativar este material.'}
                          </p>
                          {youtubeWatchUrl ? (
                            <a className="admin-external-link admin-span-2" href={youtubeWatchUrl} target="_blank" rel="noreferrer">
                              Abrir vídeo no YouTube
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <label className="admin-span-2">
                            Link de destino
                            <input
                              value={item.link}
                              onChange={(event) => updateMediaItem(item.id, { link: event.target.value })}
                              placeholder={item.type === 'folder' ? 'https://drive.google.com/...' : 'https://...'}
                            />
                          </label>
                          {item.type !== 'text' ? (
                            <>
                              <div className="admin-inline-actions admin-span-2">
                                <button type="button" onClick={() => updateMediaItem(item.id, { imageUrl: '' })}>
                                  Limpar imagem atual
                                </button>
                              </div>
                              <label className="admin-span-2">
                                URL da imagem
                                <input
                                  value={item.imageUrl}
                                  onChange={(event) => updateMediaItem(item.id, { imageUrl: event.target.value })}
                                  placeholder="https://..."
                                />
                              </label>
                              <label className="admin-span-2">
                                Upload local (base64)
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    const imageUrl = await readFileAsDataUrl(file);
                                    updateMediaItem(item.id, { imageUrl });
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="admin-empty-state">
            Nenhum item encontrado para os filtros atuais. Altere a aba/tipo ou adicione novo conteúdo.
          </p>
        )}
      </section>

      <section id="admin-noticias" className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>Noticias e reacoes - {editorThemeLabel}</h2>
            <p className="admin-news-caption">Editor rapido com lista, preview e acoes de construcao.</p>
          </div>
          <div className="admin-section-actions">
            <button type="button" onClick={() => addNewsItem('padrao')}>
              Nova noticia
            </button>
            <button type="button" className="admin-button-soft" onClick={() => addNewsItem('destaque')}>
              Modelo destaque
            </button>
            <button type="button" className="admin-button-soft" onClick={() => addNewsItem('reacao')}>
              Modelo reacao
            </button>
          </div>
        </div>
        <p className="admin-helper-text">
          Aqui voce acompanha o que ja esta publicado, cria rascunhos novos e confere a aparencia final da secao antes
          de salvar no site.
        </p>
        <div className="admin-news-stat-row">
          <p className="admin-news-stat-chip">
            <strong>{filteredNewsStats.total}</strong> noticias no rascunho em <span>{newsScopeLabel}</span>
          </p>
          <p className="admin-news-stat-chip">
            <strong>{publishedFilteredNews.length}</strong> publicadas agora
          </p>
          <p className="admin-news-stat-chip">
            <strong>{draftOnlyNews.length}</strong> novas antes de publicar
          </p>
          <p className="admin-news-stat-chip">
            <strong>{filteredNewsStats.withImage}</strong> com imagem
          </p>
          <p className="admin-news-stat-chip">
            <strong>{filteredNewsStats.missingReaction}</strong> sem reacao pronta
          </p>
          <p className="admin-news-stat-chip">
            <strong>{filteredNewsStats.missingLink}</strong> sem link
          </p>
        </div>

        {filteredNews.length || publishedFilteredNews.length ? (
          <div className="admin-news-workbench">
            <aside className="admin-news-sidebar">
              <section className="admin-news-sidebar-section">
                <div className="admin-news-sidebar-head">
                  <div>
                    <p className="admin-news-side-kicker">Publicadas agora</p>
                    <h3>{publishedFilteredNews.length ? `${publishedFilteredNews.length} no ar` : newsScopeLabel}</h3>
                    <p>Use esta lista para abrir a materia ja publicada, excluir ou levar para destaque.</p>
                  </div>
                  <button
                    type="button"
                    className="admin-button-soft"
                    onClick={() => selectOrRestoreNewsItem(publishedFilteredNews[0])}
                    disabled={!publishedFilteredNews.length}
                  >
                    Editar primeira
                  </button>
                </div>

                {publishedFilteredNews.length ? (
                  <div className="admin-news-list">
                    {publishedFilteredNews.map((item) => {
                      const draftVersion = draftNewsById.get(item.id);
                      const position = publishedNewsPositionById.get(item.id) ?? 0;
                      const displayItem = draftVersion ?? item;
                      const placement = getNewsPlacementMeta(position);
                      const themeLabel = getThemeLabel(displayItem.theme);
                      const cardImage = getNewsPreviewImage(displayItem, position, draft.carousel);
                      const isSelected = selectedNews?.id === item.id;
                      const previewText =
                        truncateText(displayItem.summary || displayItem.reaction || 'Sem resumo cadastrado.', 120) ||
                        'Sem resumo cadastrado.';
                      const statusMeta = !draftVersion
                        ? {
                            label: 'Marcada para sair',
                            tone: 'removed',
                          }
                        : JSON.stringify(draftVersion) !== JSON.stringify(item)
                          ? {
                              label: 'Edicao pendente',
                              tone: 'changed',
                            }
                          : {
                              label: 'Publicada',
                              tone: 'live',
                            };

                      return (
                        <article className={`admin-news-card${isSelected ? ' is-selected' : ''}`} key={item.id}>
                          <button
                            type="button"
                            className="admin-news-card-main"
                            onClick={() => selectOrRestoreNewsItem(displayItem)}
                            aria-pressed={isSelected}
                          >
                            <div className="admin-news-card-thumb">
                              {cardImage ? (
                                <img src={cardImage} alt={displayItem.title || 'Noticia'} />
                              ) : (
                                <div className="admin-news-card-placeholder">Sem imagem</div>
                              )}
                            </div>
                            <div className="admin-news-card-body">
                              <div className="admin-news-card-meta">
                                <span className={`admin-news-slot admin-news-slot-${placement.tone}`}>{placement.label}</span>
                                <span className="admin-news-theme-pill">{themeLabel}</span>
                                <span className={`admin-news-state admin-news-state-${statusMeta.tone}`}>{statusMeta.label}</span>
                              </div>
                              <h3>{displayItem.title || 'Noticia sem titulo'}</h3>
                              <p className="admin-news-card-date">{formatNewsDateLabel(displayItem.date)}</p>
                              <p className="admin-news-card-summary">{previewText}</p>
                            </div>
                          </button>

                          <div className="admin-news-card-actions">
                            <button type="button" className="admin-button-soft" onClick={() => selectOrRestoreNewsItem(displayItem)}>
                              Editar
                            </button>
                            <button type="button" className="admin-button-soft" onClick={() => moveNewsToHighlight(displayItem)}>
                              Mover para destaque
                            </button>
                            {draftVersion ? (
                              <button type="button" className="admin-button-danger" onClick={() => removeNewsItem(item.id)}>
                                Excluir
                              </button>
                            ) : (
                              <button type="button" className="admin-button-soft" onClick={() => selectOrRestoreNewsItem(item)}>
                                Restaurar
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-empty-state">Nenhuma noticia publicada nesta aba ou busca.</p>
                )}
              </section>

              <section className="admin-news-sidebar-section">
                <div className="admin-news-sidebar-head">
                  <div>
                    <p className="admin-news-side-kicker">Novas no rascunho</p>
                    <h3>{draftOnlyNews.length ? `${draftOnlyNews.length} para revisar` : 'Sem novidades'}</h3>
                    <p>Itens criados agora ou ainda nao publicados aparecem aqui.</p>
                  </div>
                  <button
                    type="button"
                    className="admin-button-soft"
                    onClick={() => setSelectedNewsId(draftOnlyNews[0]?.id ?? null)}
                    disabled={!draftOnlyNews.length}
                  >
                    Abrir nova
                  </button>
                </div>

                {draftOnlyNews.length ? (
                  <div className="admin-news-list admin-news-draft-list">
                    {draftOnlyNews.map((item) => {
                      const position = filteredNewsPositionById.get(item.id) ?? 0;
                      const placement = getNewsPlacementMeta(position);
                      const themeLabel = getThemeLabel(item.theme);
                      const cardImage = getNewsPreviewImage(item, position, draft.carousel);
                      const isSelected = selectedNews?.id === item.id;
                      const previewText =
                        truncateText(item.summary || item.reaction || 'Sem resumo cadastrado.', 120) || 'Sem resumo cadastrado.';

                      return (
                        <article className={`admin-news-card${isSelected ? ' is-selected' : ''}`} key={item.id}>
                          <button
                            type="button"
                            className="admin-news-card-main"
                            onClick={() => setSelectedNewsId(item.id)}
                            aria-pressed={isSelected}
                          >
                            <div className="admin-news-card-thumb">
                              {cardImage ? (
                                <img src={cardImage} alt={item.title || 'Noticia'} />
                              ) : (
                                <div className="admin-news-card-placeholder">Sem imagem</div>
                              )}
                            </div>
                            <div className="admin-news-card-body">
                              <div className="admin-news-card-meta">
                                <span className={`admin-news-slot admin-news-slot-${placement.tone}`}>{placement.label}</span>
                                <span className="admin-news-theme-pill">{themeLabel}</span>
                                <span className="admin-news-state admin-news-state-new">Nova</span>
                              </div>
                              <h3>{item.title || 'Noticia sem titulo'}</h3>
                              <p className="admin-news-card-date">{formatNewsDateLabel(item.date)}</p>
                              <p className="admin-news-card-summary">{previewText}</p>
                            </div>
                          </button>

                          <div className="admin-news-card-actions">
                            <button type="button" className="admin-button-soft" onClick={() => setSelectedNewsId(item.id)}>
                              Editar
                            </button>
                            <button type="button" className="admin-button-soft" onClick={() => moveNewsToHighlight(item)}>
                              Mover para destaque
                            </button>
                            <button type="button" className="admin-button-danger" onClick={() => removeNewsItem(item.id)}>
                              Excluir
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-empty-state">Nenhuma noticia nova foi criada neste rascunho.</p>
                )}
              </section>
            </aside>

            <div className="admin-news-editor">
              {selectedNews ? (
                <>
                  <div className="admin-news-editor-head">
                    <div>
                      <p className="admin-news-side-kicker">{selectedNewsPlacement?.label ?? 'Edicao'}</p>
                      <h3>{selectedNews.title || 'Noticia sem titulo'}</h3>
                      <p>
                        Item {selectedNewsPosition + 1} de {filteredNews.length} em {newsScopeLabel}.
                      </p>
                      {selectedNewsSaveState ? (
                        <p className={`admin-news-editor-status admin-news-state admin-news-state-${selectedNewsSaveState.tone}`}>
                          {selectedNewsSaveState.label}
                        </p>
                      ) : null}
                    </div>
                    <div className="admin-section-actions">
                      <button type="button" className="admin-button-soft" onClick={() => duplicateAndSelectNewsItem(selectedNews)}>
                        Duplicar selecionada
                      </button>
                      <button type="button" className="admin-button-soft" onClick={() => moveNewsToHighlight(selectedNews)}>
                        Mover para destaque
                      </button>
                      <button type="button" className="admin-button-danger" onClick={() => removeNewsItem(selectedNews.id)}>
                        Remover selecionada
                      </button>
                    </div>
                  </div>

                  <section className="admin-news-publication-preview">
                    <div className="admin-news-preview-bar">
                      <div>
                        <p className="admin-news-side-kicker">Previa antes de publicar</p>
                        <h3>Resultado da secao de noticias ao salvar</h3>
                        <p>O quadro abaixo usa o mesmo modelo do destaque principal, lateral e grade da home.</p>
                      </div>
                      <p className="admin-news-preview-note">
                        {hasUnsavedChanges
                          ? 'Mostrando o rascunho atual. Nada disso vai para o site antes de salvar.'
                          : 'O preview esta igual ao que ja foi publicado.'}
                      </p>
                    </div>

                    <div className="admin-news-preview-shell portal-shell portal-editorial">
                      <section className="portal-highlight-section">
                        <div className="portal-highlight-inner">
                          <article className="portal-news-primary">
                            {previewPrimaryNews ? (
                              <button
                                type="button"
                                className={`portal-news-primary-link admin-preview-card-button${
                                  selectedNews.id === previewPrimaryNews.id ? ' is-selected' : ''
                                }`}
                                onClick={() => setSelectedNewsId(previewPrimaryNews.id)}
                              >
                                {previewPrimaryImage ? <img src={previewPrimaryImage} alt={previewPrimaryNews.title} /> : null}
                                <div className="portal-news-primary-body">
                                  <p className="portal-news-primary-theme">{getThemeLabel(previewPrimaryNews.theme)}</p>
                                  <p className="portal-news-date">{formatPortalNewsDateLabel(previewPrimaryNews.date)}</p>
                                  <h3>{previewPrimaryNews.title}</h3>
                                  {previewPrimaryNews.summary.trim() ? <p>{previewPrimaryNews.summary}</p> : null}
                                </div>
                              </button>
                            ) : (
                              <p className="portal-empty-text">Nenhuma noticia no rascunho para esta aba.</p>
                            )}
                          </article>

                          <div className="portal-highlight-side">
                            <div className="admin-preview-placeholder">
                              <p className="admin-news-side-kicker">Leitura rapida</p>
                              <p>Selecione qualquer card da previa para editar esse item sem sair do contexto de publicacao.</p>
                            </div>

                            {previewSecondaryNews ? (
                              <article className="portal-news-secondary">
                                <button
                                  type="button"
                                  className={`admin-preview-card-button admin-preview-secondary-button${
                                    selectedNews.id === previewSecondaryNews.id ? ' is-selected' : ''
                                  }`}
                                  onClick={() => setSelectedNewsId(previewSecondaryNews.id)}
                                >
                                  {previewSecondaryImage ? <img src={previewSecondaryImage} alt={previewSecondaryNews.title} /> : null}
                                  <h3>{previewSecondaryNews.title}</h3>
                                  <p className="portal-news-date">{formatPortalNewsDateLabel(previewSecondaryNews.date)}</p>
                                  {previewSecondaryNews.summary.trim() ? <p>{previewSecondaryNews.summary}</p> : null}
                                  <span className="admin-preview-link-text">
                                    {previewSecondaryNews.link.trim() ? 'Abrir noticia completa apos publicar' : 'Defina um link para esta noticia'}
                                  </span>
                                </button>
                              </article>
                            ) : (
                              <div className="admin-preview-empty-card">Sem destaque lateral no rascunho.</div>
                            )}
                          </div>
                        </div>
                      </section>

                      <section className="portal-news-section">
                        <div className="portal-news-inner">
                          <div className="portal-news-headline">
                            <h2>Noticias - {newsScopeLabel}</h2>
                            <p>
                              {previewMoreCount > 0
                                ? `${previewGridNews.length} noticias visiveis agora e mais ${previewMoreCount} apos usar "Ver mais".`
                                : 'Todas as noticias visiveis do rascunho aparecem nesta previa.'}
                            </p>
                          </div>

                          {previewGridNews.length ? (
                            <div className="portal-news-feed-grid">
                              {previewGridNews.map((item, index) => {
                                const position = index + 2;
                                const cardImage = getNewsPreviewImage(item, position, draft.carousel);
                                return (
                                  <article key={item.id} className="portal-news-feed-card">
                                    <button
                                      type="button"
                                      className={`admin-preview-card-button admin-preview-feed-button${
                                        selectedNews.id === item.id ? ' is-selected' : ''
                                      }`}
                                      onClick={() => setSelectedNewsId(item.id)}
                                    >
                                      {cardImage ? <img src={cardImage} alt={item.title} /> : null}
                                      <div>
                                        <p className="portal-news-date">{formatPortalNewsDateLabel(item.date)}</p>
                                        <h3>{item.title}</h3>
                                        {item.summary.trim() ? <p>{item.summary}</p> : null}
                                      </div>
                                    </button>
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="portal-empty-text">As proximas noticias da grade aparecerao aqui.</p>
                          )}
                        </div>
                      </section>
                    </div>
                  </section>

                  <div className="admin-news-quick-actions">
                    <button type="button" className="admin-button-soft" onClick={() => moveNewsToHighlight(selectedNews)}>
                      Mover para destaque
                    </button>
                    <button type="button" className="admin-button-soft" onClick={() => applyNewsStructure(selectedNews)}>
                      Aplicar estrutura base
                    </button>
                    <button type="button" className="admin-button-soft" onClick={() => updateNews(selectedNews.id, { date: todayDate() })}>
                      Usar data de hoje
                    </button>
                    <button type="button" className="admin-button-soft" onClick={() => updateNews(selectedNews.id, { imageUrl: '' })}>
                      Limpar imagem
                    </button>
                    <button type="button" className="admin-button-soft" onClick={() => updateNews(selectedNews.id, { link: '' })}>
                      Limpar link
                    </button>
                  </div>

                  <div className="admin-grid admin-news-editor-grid">
                    <label>
                      Titulo
                      <input value={selectedNews.title} onChange={(event) => updateNews(selectedNews.id, { title: event.target.value })} />
                    </label>
                    <label>
                      Data
                      <input
                        type="date"
                        value={selectedNews.date}
                        onChange={(event) => updateNews(selectedNews.id, { date: event.target.value })}
                      />
                    </label>
                    <label>
                      Tema da noticia
                      <select
                        value={selectedNews.theme}
                        onChange={(event) => updateNews(selectedNews.id, { theme: event.target.value as HomeThemeKey })}
                      >
                        {HOME_THEME_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Link
                      <input value={selectedNews.link} onChange={(event) => updateNews(selectedNews.id, { link: event.target.value })} />
                    </label>
                    <label className="admin-span-2">
                      Resumo
                      <textarea
                        value={selectedNews.summary}
                        onChange={(event) => updateNews(selectedNews.id, { summary: event.target.value })}
                      />
                    </label>
                    <label className="admin-span-2">
                      Reacao
                      <textarea
                        value={selectedNews.reaction}
                        onChange={(event) => updateNews(selectedNews.id, { reaction: event.target.value })}
                      />
                    </label>
                    <label className="admin-span-2">
                      URL da imagem
                      <input
                        value={selectedNews.imageUrl}
                        onChange={(event) => updateNews(selectedNews.id, { imageUrl: event.target.value })}
                        placeholder="https://..."
                      />
                    </label>
                    <label className="admin-span-2">
                      Upload local (base64)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const imageUrl = await readFileAsDataUrl(file);
                          updateNews(selectedNews.id, { imageUrl });
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <div className="admin-news-empty-shell">
                  <p className="admin-empty-state">
                    Selecione uma noticia publicada ou crie uma nova para ver a previa antes de salvar.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="admin-news-empty-shell">
            <p className="admin-empty-state">
              Nenhuma noticia encontrada para esta aba. Crie uma noticia nova ou use um modelo rapido para iniciar.
            </p>
            <div className="admin-section-actions">
              <button type="button" onClick={() => addNewsItem('padrao')}>
                Nova noticia
              </button>
              <button type="button" className="admin-button-soft" onClick={() => addNewsItem('destaque')}>
                Modelo destaque
              </button>
              <button type="button" className="admin-button-soft" onClick={() => addNewsItem('reacao')}>
                Modelo reacao
              </button>
            </div>
          </div>
        )}
      </section>

      <section id="admin-seguranca" className="admin-card">
        <h2>Segurança atual</h2>
        <p>
          O painel usa código de acesso em sessão local (90 minutos). Esta barreira reduz acesso acidental, mas a
          proteção definitiva exige autenticação no backend.
        </p>
        {isFallbackCode ? (
          <p className="admin-security-alert">
            Alerta: código padrão ativo. Configure `VITE_ADMIN_ACCESS_CODE` no ambiente de build/deploy.
          </p>
        ) : null}
      </section>

      <section id="admin-mvp" className="admin-card">
        <h2>Limite do MVP</h2>
        <p>
          Este admin salva no cache local e tenta persistir no banco via endpoint `/api/home-content`.
          Quando o banco estiver indisponivel, o conteudo continua local e o painel mostra aviso de falha no save remoto.
        </p>
        <button
          type="button"
          onClick={async () => {
            const result = await saveHomeContent(defaultHomeContent);
            const persisted = loadHomeContent();
            setDraft(persisted);
            if (result.remoteSaved) {
              setLastSavedSnapshot(JSON.stringify(persisted));
              setStatus('Conteudo padrao regravado no banco e no armazenamento local.');
            } else {
              setStatus(
                `Padrao regravado apenas no armazenamento local. ${result.errorMessage ?? 'A persistencia remota falhou.'}`,
              );
            }
            window.setTimeout(() => setStatus(''), 2500);
          }}
        >
          Regravar padrão
        </button>
      </section>
    </div>
  );
};
