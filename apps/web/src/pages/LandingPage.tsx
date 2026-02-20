import { useEffect, useMemo, useState } from 'react';
import { MapCanvas } from '../components/MapCanvas';
import { SiteFooter } from '../components/SiteFooter';
import { api } from '../lib/api';
import { homeContentUpdateEvent, loadHomeContent, type HomeContent } from '../lib/homeContent';
import { extractYouTubeVideoId } from '../lib/youtube';
import type { GeoJsonResponse, IndicatorDefinition, IndicatorPoint } from '../lib/types';

type ThemeKey = 'politica' | 'economia' | 'saude' | 'educacao' | 'seguranca' | 'demografia' | 'infraestrutura';

const THEME_MAPS: Array<{
  key: ThemeKey;
  label: string;
  description: string;
  indicators: string[];
}> = [
  {
    key: 'politica',
    label: 'Politica Publica',
    description: 'Leitura territorial de desigualdade e desenvolvimento para apoiar decisao publica.',
    indicators: ['idh', 'gini_index', 'extreme_poverty_rate', 'income_per_capita'],
  },
  {
    key: 'economia',
    label: 'Economia',
    description: 'Indicadores de renda, atividade economica e condicao de trabalho no territorio.',
    indicators: ['gdp', 'income_per_capita', 'unemployment_rate', 'extreme_poverty_rate'],
  },
  {
    key: 'saude',
    label: 'Saude',
    description: 'Cobertura e resultados de saude para comparacao entre UFs.',
    indicators: ['life_expectancy', 'infant_mortality_rate', 'prenatal_coverage', 'primary_care_coverage'],
  },
  {
    key: 'educacao',
    label: 'Educacao',
    description: 'Indicadores de alfabetizacao, frequencia escolar e conclusao educacional.',
    indicators: ['literacy_rate', 'school_attendance_rate', 'higher_education_rate', 'internet_access_rate'],
  },
  {
    key: 'seguranca',
    label: 'Seguranca',
    description: 'Visao territorial de homicidios, roubos e riscos de mobilidade.',
    indicators: ['homicide_rate', 'robbery_rate', 'crime_rate', 'traffic_mortality_rate'],
  },
  {
    key: 'demografia',
    label: 'Demografia',
    description: 'Distribuicao populacional, densidade e transicao etaria por UF.',
    indicators: ['population', 'demographic_density', 'aging_index', 'fertility_rate'],
  },
  {
    key: 'infraestrutura',
    label: 'Infraestrutura',
    description: 'Servicos urbanos essenciais para qualidade de vida e dignidade.',
    indicators: ['water_network_coverage', 'sewer_network_coverage', 'garbage_collection_coverage', 'electricity_access_rate'],
  },
];

const toValidLink = (href: string): string => {
  if (!href.trim()) return '/mapas';
  return href;
};

const isExternalLink = (href: string): boolean => /^https?:\/\//i.test(href.trim());

const formatDateLabel = (isoDate: string): string => {
  if (!isoDate.trim()) return 'Data nao informada';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('pt-BR');
};

export const LandingPage = () => {
  const [content, setContent] = useState<HomeContent>(() => loadHomeContent());
  const [activeSlide, setActiveSlide] = useState(0);
  const [catalog, setCatalog] = useState<IndicatorDefinition[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('politica');
  const [activeThemeIndicator, setActiveThemeIndicator] = useState('');
  const [geojsonPayload, setGeojsonPayload] = useState<GeoJsonResponse | null>(null);
  const [points, setPoints] = useState<IndicatorPoint[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [newsQuery, setNewsQuery] = useState('');
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

  const featuredNews = filteredNews[0] ?? null;
  const feedNews = filteredNews.slice(0, 9);
  const featuredVideo = content.mediaItems.find((item) => item.type === 'video') ?? null;
  const featuredVideoLink = featuredVideo ? toValidLink(featuredVideo.youtubeUrl || featuredVideo.link) : '';
  const featuredVideoIsExternal = featuredVideo ? isExternalLink(featuredVideoLink) : false;
  const featuredVideoId = featuredVideo ? extractYouTubeVideoId(featuredVideo.youtubeUrl || featuredVideo.link) : null;
  const supportMaterials = content.mediaItems.filter((item) => item.type !== 'video').slice(0, 8);

  const currentSlide = content.carousel[activeSlide] ?? content.carousel[0];
  const currentSlideLink = currentSlide
    ? toValidLink(currentSlide.mediaType === 'youtube' ? currentSlide.youtubeUrl || currentSlide.link : currentSlide.link)
    : '/mapas';
  const currentSlideIsExternal = isExternalLink(currentSlideLink);
  const currentSlideVideoId = currentSlide ? extractYouTubeVideoId(currentSlide.youtubeUrl || currentSlide.link) : null;

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-header-inner">
          <p className="portal-kicker">Projeto Luiza Barros</p>
          <h1>Portal de Noticias e Inteligencia Territorial</h1>
          <p>
            Plataforma institucional para acompanhar noticias, reacoes e indicadores territoriais em politica, economia,
            saude, educacao, seguranca e infraestrutura.
          </p>
          <div className="portal-header-actions">
            <a href="/mapas" className="portal-btn portal-btn-primary" target="_blank" rel="noreferrer">
              Abrir mapa completo com todos os filtros
            </a>
            <a href="https://pnit.infinity.dev.br/" className="portal-btn portal-btn-secondary" target="_blank" rel="noreferrer">
              Plataforma de agentes
            </a>
            <a
              href="https://plataformadiversifica.vercel.app/"
              className="portal-btn portal-btn-secondary"
              target="_blank"
              rel="noreferrer"
            >
              Plataforma Diversifica
            </a>
          </div>
          <p className="portal-updated">Atualizado em: {formatDateLabel(content.updatedAt)}</p>
        </div>
      </header>

      <nav className="portal-nav">
        <div className="portal-nav-inner">
          <a href="/" className="portal-nav-home">
            Inicio
          </a>
          {THEME_MAPS.map((theme) => (
            <button
              key={theme.key}
              type="button"
              className={theme.key === activeTheme ? 'active' : ''}
              onClick={() => setActiveTheme(theme.key)}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </nav>

      <section className="portal-search-section">
        <div className="portal-search-inner">
          <label htmlFor="portal-news-search">Buscar noticias e reacoes</label>
          <input
            id="portal-news-search"
            value={newsQuery}
            onChange={(event) => setNewsQuery(event.target.value)}
            placeholder="Digite um termo para filtrar noticias..."
          />
        </div>
      </section>

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
                  <p>Destaque principal</p>
                  <h2>{currentSlide.title}</h2>
                  <p>{currentSlide.summary}</p>
                  {currentSlide.mediaType === 'youtube' && currentSlideVideoId ? <span>Video no YouTube</span> : null}
                </div>
              </a>
            ) : (
              <div className="portal-carousel-empty">Nenhum slide disponivel.</div>
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
            <h2>Noticia em destaque</h2>
            {featuredNews ? (
              <article>
                <p className="portal-news-date">{formatDateLabel(featuredNews.date)}</p>
                <h3>{featuredNews.title}</h3>
                <p>{featuredNews.summary}</p>
                <blockquote>{featuredNews.reaction}</blockquote>
                <a
                  href={toValidLink(featuredNews.link)}
                  target={isExternalLink(featuredNews.link) ? '_blank' : undefined}
                  rel={isExternalLink(featuredNews.link) ? 'noreferrer' : undefined}
                >
                  Ler noticia completa
                </a>
              </article>
            ) : (
              <p className="portal-empty-text">Nenhuma noticia encontrada para o filtro atual.</p>
            )}
          </div>
        </div>
      </section>

      <section className="portal-video-section">
        <div className="portal-video-inner">
          <div>
            <h2>Video em destaque</h2>
            <p>
              Conteudo audiovisual conectado ao projeto. O video permanece no YouTube e aqui exibimos apenas referencia
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
            <p className="portal-empty-text">Nenhum video cadastrado no painel admin.</p>
          )}
        </div>
      </section>

      <section className="portal-theme-map-section">
        <div className="portal-theme-map-inner">
          <div className="portal-theme-map-head">
            <div>
              <h2>Mapa tematico: {activeThemeDefinition.label}</h2>
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
          {loading ? <div className="loading-banner">Carregando mapa tematico...</div> : null}

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
              <strong>Indice:</strong> {selectedThemeIndicator?.label ?? 'N/D'} ({selectedYear})
            </p>
            <p>
              <strong>Selecionado:</strong>{' '}
              {selectedPoint
                ? `${selectedPoint.name} - ${selectedPoint.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${selectedThemeIndicator?.unit ?? ''}`
                : 'Clique em uma UF no mapa'}
            </p>
          </div>
        </div>
      </section>

      <section className="portal-news-section">
        <div className="portal-news-inner">
          <h2>Ultimas noticias</h2>
          <div className="portal-news-grid">
            {feedNews.map((item, index) => {
              const fallbackImage = content.carousel[index % content.carousel.length]?.imageUrl;
              return (
                <article key={item.id} className="portal-news-card">
                  {fallbackImage ? <img src={fallbackImage} alt={item.title} /> : null}
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
