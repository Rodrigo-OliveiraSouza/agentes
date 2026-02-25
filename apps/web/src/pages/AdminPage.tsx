import { type FormEvent, useMemo, useState } from 'react';
import {
  HOME_THEME_OPTIONS,
  defaultHomeContent,
  loadHomeContent,
  resetHomeContent,
  saveHomeContent,
  type HomeCarouselItem,
  type HomeCarouselMediaType,
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

  const sortedNews = useMemo(
    () => [...draft.news].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [draft.news],
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
    () =>
      sortedNews
        .filter((item) => editorThemeSet.has(item.theme))
        .filter((item) => {
          if (!normalizedQuickSearch) return true;
          const haystack = normalizeSearch([item.title, item.summary, item.reaction, item.link, item.imageUrl, item.date].join(' '));
          return haystack.includes(normalizedQuickSearch);
        }),
    [sortedNews, editorThemeSet, normalizedQuickSearch],
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

  const addNewsForEditorTheme = () => {
    setDraft((current) => ({
      ...current,
      news: [
        ...current.news,
        {
          id: makeId('news'),
          theme: editorTheme,
          title: 'Nova notícia',
          summary: 'Resumo da notícia',
          date: new Date().toISOString().slice(0, 10),
          imageUrl: '',
          link: '/mapas',
          reaction: 'Sem reação registrada.',
        },
      ],
    }));
  };

  const duplicateNewsItem = (item: HomeNewsItem) => {
    setDraft((current) => ({
      ...current,
      news: [
        ...current.news,
        {
          ...item,
          id: makeId('news'),
          title: `${item.title || 'Notícia'} (cópia)`,
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

  const discardUnsavedChanges = () => {
    const persisted = loadHomeContent();
    const snapshot = JSON.stringify(persisted);
    setDraft(persisted);
    setLastSavedSnapshot(snapshot);
    setStatus('Alterações não salvas descartadas.');
    window.setTimeout(() => setStatus(''), 2500);
  };

  const saveDraft = () => {
    const payload = {
      ...draft,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    saveHomeContent(payload);
    setDraft(payload);
    setLastSavedSnapshot(JSON.stringify(payload));
    setStatus('Conteúdo salvo com sucesso.');
    window.setTimeout(() => setStatus(''), 2500);
  };

  const restoreDefault = () => {
    resetHomeContent();
    const restored = loadHomeContent();
    setDraft(restored);
    setLastSavedSnapshot(JSON.stringify(restored));
    setStatus('Conteúdo restaurado para o padrão.');
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
          <h2>Notícias e reações - {editorThemeLabel}</h2>
          <button type="button" onClick={addNewsForEditorTheme}>
            Adicionar notícia desta aba
          </button>
        </div>
        <p className="admin-helper-text">
          Notícias listadas conforme a aba em edição. Edite título, resumo, reação e link sem precisar procurar entre
          todos os temas.
        </p>

        {filteredNews.length ? (
          <div className="admin-list">
            {filteredNews.map((item, index) => {
              const themeLabel = HOME_THEME_OPTIONS.find((option) => option.key === item.theme)?.label ?? item.theme;
              return (
                <details className="admin-item admin-fold-item" key={item.id} open={index < 3}>
                  <summary className="admin-fold-summary">
                    <div>
                      <h3>{item.title || 'Notícia sem título'}</h3>
                      <p>
                        {item.date} | Aba: {themeLabel}
                      </p>
                    </div>
                    <span>{index < 3 ? 'Aberto' : 'Fechado'}</span>
                  </summary>

                  <div className="admin-fold-body">
                    <div className="admin-item-head admin-item-actions">
                      <div>
                        <button type="button" onClick={() => duplicateNewsItem(item)}>
                          Duplicar
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            news: current.news.filter((entry) => entry.id !== item.id),
                          }))
                        }
                      >
                        Remover
                      </button>
                    </div>

                    <div className="admin-grid">
                      <label>
                        Título
                        <input value={item.title} onChange={(event) => updateNews(item.id, { title: event.target.value })} />
                      </label>
                      <label>
                        Data
                        <input type="date" value={item.date} onChange={(event) => updateNews(item.id, { date: event.target.value })} />
                      </label>
                      <label>
                        Tema da notícia
                        <select value={item.theme} onChange={(event) => updateNews(item.id, { theme: event.target.value as HomeThemeKey })}>
                          {HOME_THEME_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-span-2">
                        Resumo
                        <textarea value={item.summary} onChange={(event) => updateNews(item.id, { summary: event.target.value })} />
                      </label>
                      <label className="admin-span-2">
                        Reação
                        <textarea value={item.reaction} onChange={(event) => updateNews(item.id, { reaction: event.target.value })} />
                      </label>
                      <label className="admin-span-2">
                        Link
                        <input value={item.link} onChange={(event) => updateNews(item.id, { link: event.target.value })} />
                      </label>
                      <div className="admin-inline-actions admin-span-2">
                        <button type="button" onClick={() => updateNews(item.id, { imageUrl: '' })}>
                          Limpar imagem atual
                        </button>
                      </div>
                      <label className="admin-span-2">
                        URL da imagem
                        <input
                          value={item.imageUrl}
                          onChange={(event) => updateNews(item.id, { imageUrl: event.target.value })}
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
                            updateNews(item.id, { imageUrl });
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="admin-empty-state">
            Nenhuma notícia encontrada para esta aba. Use o botão acima para criar uma nova.
          </p>
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
          Este admin salva dados no `localStorage` do navegador atual. Para publicar alterações globais para todos os
          usuários, o próximo passo é conectar este painel a um endpoint da API (Worker + Neon/KV).
        </p>
        <button
          type="button"
          onClick={() => {
            saveHomeContent(defaultHomeContent);
            const persisted = loadHomeContent();
            setDraft(persisted);
            setLastSavedSnapshot(JSON.stringify(persisted));
            setStatus('Conteúdo padrão regravado no armazenamento local.');
            window.setTimeout(() => setStatus(''), 2500);
          }}
        >
          Regravar padrão no storage local
        </button>
      </section>
    </div>
  );
};
