import { useEffect, useMemo, useState } from 'react';
import { MapCanvas } from '../components/MapCanvas';
import { SiteFooter } from '../components/SiteFooter';
import { api } from '../lib/api';
import { homeContentUpdateEvent, loadHomeContent, type HomeContent } from '../lib/homeContent';
import { extractYouTubeVideoId } from '../lib/youtube';
import type { GeoJsonResponse, IndicatorDefinition, IndicatorPoint } from '../lib/types';

const MINI_INDICATOR_PREFERENCE = ['population', 'gdp', 'literacy_rate'];

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
  const [miniIndicator, setMiniIndicator] = useState('');
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

  const miniIndicatorOptions = useMemo(() => {
    if (!catalog.length) return [];

    const preferred = MINI_INDICATOR_PREFERENCE
      .map((slug) => catalog.find((item) => item.slug === slug))
      .filter((item): item is IndicatorDefinition => Boolean(item));

    if (preferred.length >= 3) {
      return preferred.slice(0, 3);
    }

    const fallback = catalog.filter((item) => !preferred.some((entry) => entry.slug === item.slug));
    return [...preferred, ...fallback].slice(0, 3);
  }, [catalog]);

  useEffect(() => {
    if (!miniIndicatorOptions.length) return;
    if (miniIndicatorOptions.some((item) => item.slug === miniIndicator)) return;
    setMiniIndicator(miniIndicatorOptions[0].slug);
  }, [miniIndicator, miniIndicatorOptions]);

  const selectedMiniIndicator = useMemo(
    () => miniIndicatorOptions.find((item) => item.slug === miniIndicator) ?? null,
    [miniIndicatorOptions, miniIndicator],
  );

  const selectedYear = selectedMiniIndicator?.defaultYear ?? 2022;

  useEffect(() => {
    if (!selectedMiniIndicator) return;
    let alive = true;
    setLoading(true);
    setError('');
    setSelectedCode(null);

    const loadMiniMap = async () => {
      try {
        const [geojson, data] = await Promise.all([
          api.geojson({ level: 'UF', simplified: true }),
          api.data({
            indicator: selectedMiniIndicator.slug,
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
  }, [selectedMiniIndicator, selectedYear]);

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
            <p className="landing-kicker">Divulgacao Institucional</p>
            <h1>{content.projectName}</h1>
            <p className="landing-subtitle">{content.institutionTagline}</p>
            <p className="landing-text">
              Esta pagina concentra noticias, reacoes da comunidade e materiais de divulgacao do projeto. Para analise
              tecnica completa, utilize a pagina de mapas com todos os filtros e exportacoes.
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
            <h2>Mapa rapido (2-3 indices)</h2>
            <p>Visao sintetica por UF. Para painel completo, entre na pagina de mapas.</p>
          </div>
          <div className="mini-map-controls">
            <label htmlFor="mini-map-indicator">Indice</label>
            <select
              id="mini-map-indicator"
              value={miniIndicator}
              onChange={(event) => setMiniIndicator(event.target.value)}
              disabled={!miniIndicatorOptions.length}
            >
              {miniIndicatorOptions.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <div className="loading-banner">Carregando mini mapa...</div> : null}

        <div className="mini-map-canvas">
          <MapCanvas
            geojson={geojsonPayload?.geojson ?? null}
            points={points}
            mode="choropleth"
            unit={selectedMiniIndicator?.unit ?? ''}
            selectedCode={selectedCode}
            onSelect={setSelectedCode}
            legendScaleMode="linear"
            themeMode="institutional"
          />
        </div>

        <div className="mini-map-summary">
          <p>
            <strong>Indice:</strong> {selectedMiniIndicator?.label ?? 'N/D'} ({selectedYear})
          </p>
          <p>
            <strong>Selecionado:</strong>{' '}
            {selectedPoint
              ? `${selectedPoint.name} - ${selectedPoint.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${selectedMiniIndicator?.unit ?? ''}`
              : 'Clique em uma UF no mapa'}
          </p>
          <a href="/mapas" className="mini-map-link">
            Ir para pagina de mapas completa
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
