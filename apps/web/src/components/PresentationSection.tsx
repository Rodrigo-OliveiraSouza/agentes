import { useEffect, useMemo, useState } from 'react';

type Slide = {
  src: string;
  alt: string;
};

const carouselModules = import.meta.glob('../assets/carousel/*.{png,jpg,jpeg,webp,avif,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const carouselSlides: Slide[] = Object.entries(carouselModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src], index) => {
    const fileName = path.split('/').pop()?.replace(/\.[a-zA-Z0-9]+$/, '') ?? `slide-${index + 1}`;
    const normalizedAlt = fileName.replace(/[_-]/g, ' ').trim();

    return {
      src,
      alt: normalizedAlt || `Slide ${index + 1}`,
    };
  });

const features = [
  {
    title: 'Sobre o observatorio',
    text: 'Plataforma para leitura territorial de desigualdades e monitoramento de indicadores sociais.',
  },
  {
    title: 'Como usar',
    text: 'Escolha indicador, nivel territorial e ano para comparar municipios, UFs e regioes.',
  },
  {
    title: 'Transparencia',
    text: 'Cada indicador mostra a fonte de origem (IBGE e conectores publicos complementares).',
  },
];

const institutionPillars = [
  'Equidade racial em politicas publicas',
  'Acesso transparente a indicadores territoriais',
  'Evidencias para tomada de decisao local',
];

const palette = [
  { name: 'Verde institucional', color: '#136c3a' },
  { name: 'Dourado cidadania', color: '#f3b61f' },
  { name: 'Terracota diversidade', color: '#b64b2b' },
  { name: 'Azul dados publicos', color: '#1f5a94' },
];

export const PresentationSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasSlides = carouselSlides.length > 0;

  useEffect(() => {
    if (carouselSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % carouselSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeIndex >= carouselSlides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex]);

  const currentSlide = useMemo(() => {
    if (!hasSlides) return null;
    return carouselSlides[activeIndex] ?? carouselSlides[0];
  }, [activeIndex, hasSlides]);

  const prevSlide = () => {
    if (carouselSlides.length <= 1) return;
    setActiveIndex((current) => (current - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const nextSlide = () => {
    if (carouselSlides.length <= 1) return;
    setActiveIndex((current) => (current + 1) % carouselSlides.length);
  };

  return (
    <section className="presentation-section">
      <div className="presentation-grid">
        <div className="presentation-copy">
          <p className="presentation-kicker">Ministerio da Igualdade Racial</p>
          <h1>Observatorio territorial de indicadores para equidade racial</h1>
          <p className="presentation-text">
            Esta plataforma reune dados geograficos e socioeconomicos para apoiar diagnostico territorial, monitorar
            desigualdades e orientar politicas publicas com foco em igualdade racial.
          </p>
          <p className="presentation-text">
            O mapa permite comparar municipios, UFs e regioes em diferentes camadas de visualizacao, com painel de
            detalhes e rastreabilidade da fonte de cada indicador.
          </p>

          <div className="presentation-actions">
            <a className="presentation-button" href="#mapa">
              Entrar no painel de mapas
            </a>
            <a
              className="presentation-link"
              href="https://www.gov.br/igualdaderacial/pt-br"
              target="_blank"
              rel="noreferrer"
            >
              Site institucional do ministerio
            </a>
            <span className="presentation-folder">Pasta do carrossel: `apps/web/src/assets/carousel`</span>
          </div>

          <div className="presentation-features">
            {features.map((item) => (
              <article key={item.title} className="feature-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="presentation-pillars">
            <p className="presentation-pillar-title">Compromissos da instituicao</p>
            {institutionPillars.map((pillar) => (
              <p key={pillar} className="presentation-pillar-item">
                {pillar}
              </p>
            ))}
          </div>

          <div className="presentation-palette">
            <p className="presentation-pillar-title">Paleta institucional aplicada</p>
            <div className="palette-grid">
              {palette.map((item) => (
                <div key={item.name} className="palette-card">
                  <span className="palette-color" style={{ background: item.color }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="presentation-carousel">
          <div className="carousel-frame">
            {currentSlide ? (
              <img src={currentSlide.src} alt={currentSlide.alt} />
            ) : (
              <div className="carousel-empty">
                <p>Adicione imagens na pasta do carrossel para exibir os slides.</p>
              </div>
            )}

            <div className="carousel-controls">
              <button type="button" onClick={prevSlide} disabled={carouselSlides.length <= 1}>
                Anterior
              </button>
              <button type="button" onClick={nextSlide} disabled={carouselSlides.length <= 1}>
                Proximo
              </button>
            </div>
          </div>

          {carouselSlides.length > 1 ? (
            <div className="carousel-dots">
              {carouselSlides.map((slide, index) => (
                <button
                  key={`${slide.src}-${index}`}
                  type="button"
                  className={index === activeIndex ? 'active' : ''}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
