import { useEffect, useMemo, useState } from 'react';
import { MapCanvas } from '../components/MapCanvas';
import { SiteFooter } from '../components/SiteFooter';
import { api } from '../lib/api';
import { homeContentUpdateEvent, loadHomeContent, type HomeContent, type HomeThemeKey } from '../lib/homeContent';
import { extractYouTubeVideoId } from '../lib/youtube';
import type { GeoJsonResponse, IndicatorDefinition, IndicatorPoint } from '../lib/types';

type ThemeKey = Exclude<HomeThemeKey, 'geral'>;

const THEME_MAPS: Array<{
  key: ThemeKey;
  label: string;
  description: string;
  indicators: string[];
}> = [
  {
    key: 'politica',
    label: 'Política Pública',
    description: 'Leitura territorial de desigualdade e desenvolvimento para apoiar decisão pública.',
    indicators: ['idh', 'gini_index', 'extreme_poverty_rate', 'income_per_capita'],
  },
  {
    key: 'economia',
    label: 'Economia',
    description: 'Indicadores de renda, atividade econômica e condição de trabalho no território.',
    indicators: ['gdp', 'income_per_capita', 'unemployment_rate', 'extreme_poverty_rate'],
  },
  {
    key: 'saude',
    label: 'Saúde',
    description: 'Cobertura e resultados de saúde para comparação entre UFs.',
    indicators: ['life_expectancy', 'infant_mortality_rate', 'prenatal_coverage', 'primary_care_coverage'],
  },
  {
    key: 'educacao',
    label: 'Educação',
    description: 'Indicadores de alfabetização, frequência escolar e conclusão educacional.',
    indicators: ['literacy_rate', 'school_attendance_rate', 'higher_education_rate', 'internet_access_rate'],
  },
  {
    key: 'seguranca',
    label: 'Segurança',
    description: 'Visão territorial de homicídios, roubos e riscos de mobilidade.',
    indicators: ['homicide_rate', 'robbery_rate', 'crime_rate', 'traffic_mortality_rate'],
  },
  {
    key: 'demografia',
    label: 'Demografia',
    description: 'Distribuição populacional, densidade e transição etária por UF.',
    indicators: ['population', 'demographic_density', 'aging_index', 'fertility_rate'],
  },
  {
    key: 'infraestrutura',
    label: 'Infraestrutura',
    description: 'Serviços urbanos essenciais para qualidade de vida e dignidade.',
    indicators: ['water_network_coverage', 'sewer_network_coverage', 'garbage_collection_coverage', 'electricity_access_rate'],
  },
];

const BrandMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="14.5" stroke="#C9A46C" strokeWidth="2" />
    <path d="M8 9L14 6V16L8 19V9Z" fill="#C9A46C" />
    <path d="M14 6L21 9V19L14 16V6Z" fill="#6E8B5B" />
    <path d="M8 23L14 26L21 19L14 16L8 23Z" fill="#F3E6D6" />
  </svg>
);

const toValidLink = (href: string): string => {
  if (!href.trim()) return '/mapas';
  return href;
};

const isExternalLink = (href: string): boolean => /^https?:\/\//i.test(href.trim());

const formatDateLabel = (isoDate: string): string => {
  if (!isoDate.trim()) return 'Data não informada';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('pt-BR');
};

export const LandingPage = () => {
  const [content, setContent] = useState<HomeContent>(() => loadHomeContent());
  const [activeSlide, setActiveSlide] = useState(0);
  const [catalog, setCatalog] = useState<IndicatorDefinition[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('educacao');
  const [activeThemeIndicator, setActiveThemeIndicator] = useState('');
  const [geojsonPayload, setGeojsonPayload] = useState<GeoJsonResponse | null>(null);
  const [points, setPoints] = useState<IndicatorPoint[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [newsQuery, setNewsQuery] = useState('');
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => {
      setContent(loadHomeContent());
    };

    window.addEventListener('storage', refresh);
    window.addEventListener(homeContentUpdateEvent, refresh as EventListener);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(homeContentUpdateEvent, refresh as EventListener);
    };
  }, []);

  useEffect(() => {
    if (content.carousel.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % content.carousel.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [content.carousel.length]);

  useEffect(() => {
    if (activeSlide < content.carousel.length) return;
    setActiveSlide(0);
  }, [activeSlide, content.carousel.length]);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('portal-mobile-menu-open', isMobileMenuOpen);
    return () => {
      document.body.classList.remove('portal-mobile-menu-open');
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let alive = true;
    const loadCatalog = async () => {
      try {
        const indicators = await api.indicators();
        if (!alive) return;
        setCatalog(indicators.filter((item) => item.supported));
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar indicadores.');
      }
    };
    loadCatalog();
    return () => {
      alive = false;
    };
  }, []);

  const indicatorsBySlug = useMemo(() => {
    return new Map(catalog.map((item) => [item.slug, item]));
  }, [catalog]);

  const activeThemeDefinition = useMemo(() => {
    return THEME_MAPS.find((item) => item.key === activeTheme) ?? THEME_MAPS[0];
  }, [activeTheme]);

  const themeIndicatorOptions = useMemo(() => {
    const preferred = activeThemeDefinition.indicators
      .map((slug) => indicatorsBySlug.get(slug))
      .filter((item): item is IndicatorDefinition => Boolean(item));
    if (preferred.length) return preferred;
    return catalog.slice(0, 4);
  }, [activeThemeDefinition, indicatorsBySlug, catalog]);

  useEffect(() => {
    if (!themeIndicatorOptions.length) return;
    if (themeIndicatorOptions.some((item) => item.slug === activeThemeIndicator)) return;
    setActiveThemeIndicator(themeIndicatorOptions[0].slug);
  }, [activeThemeIndicator, themeIndicatorOptions]);

  const selectedThemeIndicator = useMemo(
    () => themeIndicatorOptions.find((item) => item.slug === activeThemeIndicator) ?? null,
    [themeIndicatorOptions, activeThemeIndicator],
  );

  const selectedYear = selectedThemeIndicator?.defaultYear ?? 2022;

  const indicatorDescription = useMemo(() => {
    if (!selectedThemeIndicator) {
      return 'Descrição não disponível para o índice selecionado.';
    }

    const notes = selectedThemeIndicator.notes?.trim();
    if (notes) return notes;

    const source = selectedThemeIndicator.sourceLabel ?? selectedThemeIndicator.source;
    return `Este índice representa o comportamento de "${selectedThemeIndicator.label}" e permite comparar variações entre UFs no ano de ${selectedYear}. Fonte: ${source}.`;
  }, [selectedThemeIndicator, selectedYear]);

  useEffect(() => {
    if (!selectedThemeIndicator) return;
    let alive = true;
    setLoading(true);
    setError('');
    setSelectedCode(null);

    const loadThemeMap = async () => {
      try {
        const [geojson, data] = await Promise.all([
          api.geojson({ level: 'UF', simplified: true }),
          api.data({
            indicator: selectedThemeIndicator.slug,
            level: 'UF',
            year: selectedYear,
            limit: 100,
          }),
        ]);

        if (!alive) return;
        setGeojsonPayload(geojson);
        setPoints([...data.items].sort((a, b) => b.value - a.value));
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar mapa tematico.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadThemeMap();
    return () => {
      alive = false;
    };
  }, [selectedThemeIndicator, selectedYear]);

  const selectedPoint = useMemo(() => {
    if (!selectedCode) return null;
    return points.find((item) => item.code === selectedCode) ?? null;
  }, [points, selectedCode]);

  const newsByRecency = useMemo(() => [...content.news].sort((a, b) => (a.date < b.date ? 1 : -1)), [content.news]);

  const filteredNews = useMemo(() => {
    const term = newsQuery.trim().toLowerCase();
    if (!term) return newsByRecency;
    return newsByRecency.filter((item) =>
      [item.title, item.summary, item.reaction, item.date].join(' ').toLowerCase().includes(term),
    );
  }, [newsByRecency, newsQuery]);

  const themeNews = useMemo(() => {
    const exactTheme = filteredNews.filter((item) => item.theme === activeTheme);
    if (exactTheme.length) return exactTheme;

    const generalTheme = filteredNews.filter((item) => item.theme === 'geral');
    if (generalTheme.length) return generalTheme;

    return filteredNews;
  }, [filteredNews, activeTheme]);

  const featuredNews = themeNews[0] ?? null;
  const feedNews = themeNews.slice(0, 9);

  const featuredVideo = useMemo(() => {
    const videoItems = content.mediaItems.filter((item) => item.type === 'video');
    const exactTheme = videoItems.find((item) => item.theme === activeTheme);
    if (exactTheme) return exactTheme;

    const generalTheme = videoItems.find((item) => item.theme === 'geral');
    if (generalTheme) return generalTheme;

    return null;
  }, [content.mediaItems, activeTheme]);

  const featuredVideoLink = featuredVideo ? toValidLink(featuredVideo.youtubeUrl || featuredVideo.link) : '';
  const featuredVideoIsExternal = featuredVideo ? isExternalLink(featuredVideoLink) : false;
  const featuredVideoId = featuredVideo ? extractYouTubeVideoId(featuredVideo.youtubeUrl || featuredVideo.link) : null;
  const supportMaterials = useMemo(() => {
    const materialItems = content.mediaItems.filter((item) => item.type !== 'video');
    const themedItems = materialItems.filter((item) => item.theme === activeTheme || item.theme === 'geral');
    return (themedItems.length ? themedItems : materialItems).slice(0, 8);
  }, [content.mediaItems, activeTheme]);

  const currentSlide = content.carousel[activeSlide] ?? content.carousel[0];
  const currentSlideLink = currentSlide
    ? toValidLink(currentSlide.mediaType === 'youtube' ? currentSlide.youtubeUrl || currentSlide.link : currentSlide.link)
    : '/mapas';
  const currentSlideIsExternal = isExternalLink(currentSlideLink);
  const currentSlideVideoId = currentSlide ? extractYouTubeVideoId(currentSlide.youtubeUrl || currentSlide.link) : null;
  const headerClassName = `portal-header portal-header-v2${isHeaderScrolled ? ' is-scrolled' : ''}${isMobileMenuOpen ? ' menu-open' : ''}`;

  return (
    <div className="portal-shell" data-theme={activeTheme}>
      <header className={headerClassName}>
        <div className="portal-header-inner">
          <div className="portal-header-top">
            <div className="portal-header-row-inner portal-header-top-inner">
              <a href="#" className="portal-top-brand" aria-label="E-SINAPIR - atalhos institucionais">
                <BrandMark className="portal-top-brand-mark" />
                <span>E-SINAPIR</span>
              </a>
              <div className="portal-header-actions">
                <a href="/mapas" aria-label="MAPA" className="portal-btn portal-btn-primary" target="_blank" rel="noreferrer">
                  MAPA
                </a>
                <a
                  href="https://pnit.infinity.dev.br/"
                  aria-label="ATPIR"
                  className="portal-btn portal-btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  ATPIR
                </a>
                <a
                  href="https://plataformadiversifica.vercel.app/"
                  aria-label="DIVERSIFICA"
                  className="portal-btn portal-btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  DIVERSIFICA
                </a>
              </div>
            </div>
          </div>
          <div className="portal-header-main">
            <div className="portal-header-row-inner portal-header-main-inner">
              <a href="#" className="portal-brand" aria-label="E-SINAPIR - inicio">
                <BrandMark className="portal-brand-mark" />
                <span className="portal-brand-title">E-SINAPIR</span>
              </a>
              <nav className="portal-nav portal-nav-v2" aria-label="Navegacao principal">
                <div className="portal-nav-inner">
                  {THEME_MAPS.map((theme) => (
                    <button
                      key={theme.key}
                      type="button"
                      className={theme.key === activeTheme ? 'active' : ''}
                      onClick={() => setActiveTheme(theme.key)}
                      aria-pressed={theme.key === activeTheme}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </nav>
              <div className="portal-search-inline portal-search-inline-v2">
                <span className="portal-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="portal-news-search"
                  className="portal-search-field"
                  value={newsQuery}
                  onChange={(event) => setNewsQuery(event.target.value)}
                  placeholder="Buscar noticias..."
                  aria-label="Buscar noticias e reacoes"
                />
              </div>
              <button
                type="button"
                className="portal-menu-toggle"
                aria-label={isMobileMenuOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((current) => !current)}
              >
                <span className="portal-menu-toggle-icon" aria-hidden="true">
                  <span />
                </span>
                <span>Menu</span>
              </button>
            </div>
          </div>
          <div className="portal-mobile-search-row">
            <div className="portal-header-row-inner">
              <div className="portal-search-inline portal-search-inline-v2 portal-search-inline-mobile">
                <span className="portal-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="portal-news-search-mobile"
                  className="portal-search-field"
                  value={newsQuery}
                  onChange={(event) => setNewsQuery(event.target.value)}
                  placeholder="Buscar noticias..."
                  aria-label="Buscar noticias e reacoes"
                />
              </div>
            </div>
          </div>
        </div>
      </header>
      <button
        type="button"
        className={`portal-mobile-overlay${isMobileMenuOpen ? ' is-open' : ''}`}
        aria-label="Fechar menu"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside className={`portal-mobile-drawer${isMobileMenuOpen ? ' is-open' : ''}`} aria-label="Menu principal mobile">
        <div className="portal-mobile-drawer-head">
          <strong>E-SINAPIR</strong>
          <button type="button" className="portal-mobile-drawer-close" aria-label="Fechar menu" onClick={() => setIsMobileMenuOpen(false)}>
            x
          </button>
        </div>
        <nav className="portal-mobile-drawer-nav" aria-label="Categorias de noticias">
          {THEME_MAPS.map((theme) => (
            <button
              key={`mobile-${theme.key}`}
              type="button"
              className={theme.key === activeTheme ? 'active' : ''}
              onClick={() => {
                setActiveTheme(theme.key);
                setIsMobileMenuOpen(false);
              }}
              aria-pressed={theme.key === activeTheme}
            >
              {theme.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="portal-highlight-section">
        <div className="portal-highlight-inner">
          <div className="portal-carousel">
            {currentSlide ? (
              <a
                href={currentSlideLink}
                className="portal-carousel-link"
                target={currentSlideIsExternal ? '_blank' : undefined}
                rel={currentSlideIsExternal ? 'noreferrer' : undefined}
              >
                <img src={currentSlide.imageUrl} alt={currentSlide.title} />
                <div className="portal-carousel-overlay">
                  <h2>{currentSlide.title}</h2>
                  <p>{currentSlide.summary}</p>
                  {currentSlide.mediaType === 'youtube' && currentSlideVideoId ? <span>Vídeo no YouTube</span> : null}
                </div>
              </a>
            ) : (
              <div className="portal-carousel-empty">Nenhum slide disponível.</div>
            )}
            {content.carousel.length > 1 ? (
              <div className="portal-carousel-dots">
                {content.carousel.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={index === activeSlide ? 'active' : ''}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="portal-featured-news">
            <h2>Notícia em destaque - {activeThemeDefinition.label}</h2>
            {featuredNews ? (
              <article>
                {featuredNews.imageUrl.trim() ? <img src={featuredNews.imageUrl} alt={featuredNews.title} /> : null}
                <p className="portal-news-date">{formatDateLabel(featuredNews.date)}</p>
                <h3>{featuredNews.title}</h3>
                <p>{featuredNews.summary}</p>
                <blockquote>{featuredNews.reaction}</blockquote>
                <a
                  href={toValidLink(featuredNews.link)}
                  target={isExternalLink(featuredNews.link) ? '_blank' : undefined}
                  rel={isExternalLink(featuredNews.link) ? 'noreferrer' : undefined}
                >
                  Ler notícia completa
                </a>
              </article>
            ) : (
              <p className="portal-empty-text">Nenhuma notícia cadastrada para o tema atual.</p>
            )}
          </div>
        </div>
      </section>

      <section className="portal-video-section">
        <div className="portal-video-inner">
          <div>
            <h2>Vídeo em destaque - {activeThemeDefinition.label}</h2>
            <p>
              Conteúdo audiovisual conectado ao projeto. O vídeo permanece no YouTube e aqui exibimos apenas referência
              e acesso.
            </p>
          </div>
          {featuredVideo && featuredVideoId ? (
            <div className="portal-video-grid">
              <div className="portal-video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${featuredVideoId}`}
                  title={featuredVideo.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <article className="portal-video-card">
                <p className="portal-news-date">Material audiovisual</p>
                <h3>{featuredVideo.title}</h3>
                <p>{featuredVideo.description}</p>
                <a href={featuredVideoLink} target={featuredVideoIsExternal ? '_blank' : undefined} rel="noreferrer">
                  Abrir no YouTube
                </a>
              </article>
            </div>
          ) : (
            <p className="portal-empty-text">Nenhum vídeo cadastrado para o tema atual.</p>
          )}
        </div>
      </section>

      <section className="portal-theme-map-section">
        <div className="portal-theme-map-inner">
          <div className="portal-theme-map-head">
            <div>
              <h2>Mapa temático: {activeThemeDefinition.label}</h2>
              <p>{activeThemeDefinition.description}</p>
            </div>
            <a href="/mapas" className="portal-map-link" target="_blank" rel="noreferrer">
              Ir para mapa completo
            </a>
          </div>

          <div className="portal-indicator-tabs">
            {themeIndicatorOptions.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={item.slug === activeThemeIndicator ? 'active' : ''}
                onClick={() => setActiveThemeIndicator(item.slug)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {loading ? <div className="loading-banner">Carregando mapa temático...</div> : null}

          <div className="portal-theme-map-canvas">
            <MapCanvas
              geojson={geojsonPayload?.geojson ?? null}
              points={points}
              mode="choropleth"
              unit={selectedThemeIndicator?.unit ?? ''}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              legendScaleMode="linear"
              themeMode="institutional"
            />
          </div>

          <div className="portal-theme-map-summary">
            <p>
              <strong>Tema:</strong> {activeThemeDefinition.label}
            </p>
            <p>
              <strong>Índice:</strong> {selectedThemeIndicator?.label ?? 'N/D'} ({selectedYear})
            </p>
            <p>
              <strong>Selecionado:</strong>{' '}
              {selectedPoint
                ? `${selectedPoint.name} - ${selectedPoint.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${selectedThemeIndicator?.unit ?? ''}`
                : 'Clique em uma UF no mapa'}
            </p>
            <p className="portal-theme-map-index-description">
              <strong>Descrição do índice:</strong> {indicatorDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="portal-news-section">
        <div className="portal-news-inner">
          <div className="portal-news-headline">
            <p className="portal-news-kicker">Cobertura temática</p>
            <h2>Notícias e reações - {activeThemeDefinition.label}</h2>
            <p>Blocos atualizados com leitura rápida de contexto, percepção social e acesso ao conteúdo completo.</p>
          </div>

          {feedNews.length ? (
            <div className="portal-reaction-grid">
              {feedNews.slice(0, 3).map((item, index) => (
                <article key={`${item.id}-reaction`} className={`portal-reaction-card portal-reaction-tone-${(index % 3) + 1}`}>
                  <p className="portal-news-date">{formatDateLabel(item.date)}</p>
                  <h3>{item.title}</h3>
                  <p>{item.reaction}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="portal-empty-text">Nenhuma reação cadastrada para o tema atual.</p>
          )}

          <div className="portal-news-grid">
            {feedNews.map((item, index) => {
              const fallbackImage = content.carousel[index % content.carousel.length]?.imageUrl;
              const cardImage = item.imageUrl.trim() || fallbackImage;
              return (
                <article key={item.id} className="portal-news-card">
                  {cardImage ? <img src={cardImage} alt={item.title} /> : null}
                  <div>
                    <p className="portal-news-date">{formatDateLabel(item.date)}</p>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <a
                      href={toValidLink(item.link)}
                      target={isExternalLink(item.link) ? '_blank' : undefined}
                      rel={isExternalLink(item.link) ? 'noreferrer' : undefined}
                    >
                      Ler mais
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="portal-materials-section">
        <div className="portal-materials-inner">
          <h2>Fotos, folders e comunicados</h2>
          <div className="portal-materials-grid">
            {supportMaterials.map((item) => {
              const href = toValidLink(item.link);
              const external = isExternalLink(href);
              const typeLabel = item.type === 'photo' ? 'Foto' : item.type === 'folder' ? 'Folder' : 'Texto';
              return (
                <article key={item.id} className={`portal-material-card portal-material-${item.type}`}>
                  {item.type !== 'text' && item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : null}
                  <div>
                    <p className="portal-material-kicker">{typeLabel}</p>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {item.link.trim() ? (
                      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                        Abrir material
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
