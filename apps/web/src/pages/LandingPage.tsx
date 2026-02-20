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

    const loadMiniMap = async () => {
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
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar mini mapa.');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadMiniMap();
    return () => {
      alive = false;
    };
  }, [selectedThemeIndicator, selectedYear]);

  const selectedPoint = useMemo(() => {
    if (!selectedCode) return null;
    return points.find((item) => item.code === selectedCode) ?? null;
  }, [points, selectedCode]);

  const newsByRecency = useMemo(() => [...content.news].sort((a, b) => (a.date < b.date ? 1 : -1)), [content.news]);
  const featuredNews = newsByRecency[0] ?? null;
  const secondaryNews = newsByRecency.slice(1, 3);
  const reactionHighlights = newsByRecency.slice(0, 4);
  const feedNews = newsByRecency.slice(0, 9);
  const mediaItems = content.mediaItems.slice(0, 12);

  const currentSlide = content.carousel[activeSlide] ?? content.carousel[0];
  const currentSlideLink = currentSlide
    ? toValidLink(currentSlide.mediaType === 'youtube' ? currentSlide.youtubeUrl || currentSlide.link : currentSlide.link)
    : '/mapas';
  const currentSlideIsExternal = isExternalLink(currentSlideLink);
  const currentSlideVideoId = currentSlide ? extractYouTubeVideoId(currentSlide.youtubeUrl || currentSlide.link) : null;

  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-copy">
            <p className="landing-kicker">Portal Territorial</p>
            <h1>{content.projectName}</h1>
            <p className="landing-subtitle">{content.institutionTagline}</p>
            <p className="landing-text">
              Painel de noticias e analise por tema do Projeto Luiza Barros. Explore politica, economia, saude,
              educacao, seguranca e infraestrutura com mapas de indicadores atualizados.
            </p>
            <div className="landing-actions">
              <a href="/mapas" className="landing-btn landing-btn-primary">
                Abrir pagina de mapas
              </a>
              <a href="https://pnit.infinity.dev.br/" target="_blank" rel="noreferrer" className="landing-btn landing-btn-secondary">
                Plataforma de agentes
              </a>
              <a href="https://plataformadiversifica.vercel.app/" target="_blank" rel="noreferrer" className="landing-btn landing-btn-secondary">
                Plataforma Diversifica
              </a>
            </div>
          </div>

          <div className="landing-carousel">
            {currentSlide ? (
              <a
                href={currentSlideLink}
                className="landing-carousel-item"
                target={currentSlideIsExternal ? '_blank' : undefined}
                rel={currentSlideIsExternal ? 'noreferrer' : undefined}
              >
                <img src={currentSlide.imageUrl} alt={currentSlide.title} />
                <div className="landing-carousel-overlay">
                  <p className="landing-kicker">Destaque</p>
                  <h3>{currentSlide.title}</h3>
                  <p>{currentSlide.summary}</p>
                  {currentSlide.mediaType === 'youtube' && currentSlideVideoId ? (
                    <span className="landing-carousel-badge">Video no YouTube</span>
                  ) : null}
                </div>
              </a>
            ) : (
              <div className="landing-carousel-empty">Nenhuma imagem cadastrada.</div>
            )}
            {content.carousel.length > 1 ? (
              <div className="landing-dots">
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
        </div>
      </section>

      <section className="news-showcase">
        <div className="news-showcase-inner">
          <div className="news-showcase-head">
            <div>
              <h2>Noticias e reacoes em destaque</h2>
              <p>Atualizacao de conteudo: {content.updatedAt}</p>
            </div>
            <a href="/mapas" className="news-showcase-link">
              Abrir analise completa no mapa
            </a>
          </div>

          <div className="news-main-grid">
            {featuredNews ? (
              <article className="news-lead-card">
                <p className="news-lead-date">{formatDateLabel(featuredNews.date)}</p>
                <h3>{featuredNews.title}</h3>
                <p>{featuredNews.summary}</p>
                <blockquote>{featuredNews.reaction}</blockquote>
                <a
                  href={toValidLink(featuredNews.link)}
                  target={isExternalLink(featuredNews.link) ? '_blank' : undefined}
                  rel={isExternalLink(featuredNews.link) ? 'noreferrer' : undefined}
                >
                  Ler destaque
                </a>
              </article>
            ) : (
              <div className="news-lead-empty">Nenhuma noticia cadastrada.</div>
            )}

            <div className="news-side-list">
              {secondaryNews.map((item, index) => (
                <article key={item.id} className={`news-side-card news-side-card-tone-${(index % 2) + 1}`}>
                  <p className="news-date">{formatDateLabel(item.date)}</p>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <a
                    href={toValidLink(item.link)}
                    target={isExternalLink(item.link) ? '_blank' : undefined}
                    rel={isExternalLink(item.link) ? 'noreferrer' : undefined}
                  >
                    Abrir noticia
                  </a>
                </article>
              ))}
              {!secondaryNews.length ? <div className="news-side-empty">Adicione mais noticias para ampliar o destaque.</div> : null}
            </div>
          </div>

          {reactionHighlights.length ? (
            <div className="reaction-grid">
              {reactionHighlights.map((item, index) => (
                <article key={`${item.id}-reaction`} className={`reaction-card reaction-card-tone-${(index % 4) + 1}`}>
                  <p className="reaction-kicker">Reacao da comunidade</p>
                  <p className="reaction-text">{item.reaction}</p>
                  <a
                    href={toValidLink(item.link)}
                    target={isExternalLink(item.link) ? '_blank' : undefined}
                    rel={isExternalLink(item.link) ? 'noreferrer' : undefined}
                  >
                    {item.title}
                  </a>
                </article>
              ))}
            </div>
          ) : null}

          <div className="news-feed-grid">
            {feedNews.map((item, index) => (
              <article key={`${item.id}-feed`} className={`news-feed-card news-feed-tone-${(index % 3) + 1}`}>
                <p className="news-date">{formatDateLabel(item.date)}</p>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <a
                  href={toValidLink(item.link)}
                  target={isExternalLink(item.link) ? '_blank' : undefined}
                  rel={isExternalLink(item.link) ? 'noreferrer' : undefined}
                >
                  Detalhes
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="media-hub-section">
        <div className="media-hub-inner">
          <div className="media-hub-head">
            <h2>Midias e materiais</h2>
            <p>Area para fotos, videos, folders e comunicados editaveis no painel admin.</p>
          </div>

          <div className="media-hub-grid">
            {mediaItems.map((item) => {
              const rawLink = item.type === 'video' ? item.youtubeUrl || item.link : item.link;
              const hasLink = Boolean(rawLink.trim());
              const href = toValidLink(rawLink);
              const external = isExternalLink(href);
              const typeLabel =
                item.type === 'photo'
                  ? 'Foto'
                  : item.type === 'video'
                    ? 'Video'
                    : item.type === 'folder'
                      ? 'Folder'
                      : 'Texto';

              return (
                <article key={item.id} className={`media-card media-card-${item.type}`}>
                  {item.type !== 'text' && item.imageUrl ? (
                    <div className="media-card-cover">
                      <img src={item.imageUrl} alt={item.title} />
                      {item.type === 'video' ? <span>YouTube</span> : null}
                    </div>
                  ) : null}

                  <div className="media-card-body">
                    <p className="media-card-kicker">{typeLabel}</p>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {hasLink ? (
                      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                        {item.type === 'video' ? 'Abrir video' : item.type === 'folder' ? 'Abrir folder' : 'Abrir material'}
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mini-map-section">
        <div className="mini-map-head">
          <div>
            <h2>Mapas por tema</h2>
            <p>{activeThemeDefinition.description}</p>
          </div>
          <a href="/mapas" className="mini-map-complete-link" target="_blank" rel="noreferrer">
            Abrir mapa completo com todos os filtros
          </a>
        </div>

        <div className="theme-tabs" role="tablist" aria-label="Temas de analise">
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

        <div className="theme-indicator-row">
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
        {loading ? <div className="loading-banner">Carregando mini mapa...</div> : null}

        <div className="mini-map-canvas">
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

        <div className="mini-map-summary">
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
          <a href="/mapas" className="mini-map-link" target="_blank" rel="noreferrer">
            Ir para pagina de mapas completa (nova aba)
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
