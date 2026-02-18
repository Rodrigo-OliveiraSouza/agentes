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
    title: 'Mapa em camadas',
    text: 'Navegue por regiao, UF e municipio com sobreposicao de dados oficiais.',
  },
  {
    title: 'Indicadores comparaveis',
    text: 'Troque indicador, periodo e visualizacao para encontrar padroes territoriais.',
  },
  {
    title: 'Painel por cidade',
    text: 'Clique no municipio para ver os principais indices em tabela e grafico.',
  },
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
          <p className="presentation-kicker">Ministerio Interracial do GOLF</p>
          <h1>Plataforma de mapa interativo para leitura territorial e social</h1>
          <p className="presentation-text">
            Esta plataforma conecta mapa, filtros e indicadores para apoiar analise territorial, planejamento e tomada
            de decisao com dados publicos.
          </p>
          <p className="presentation-text">
            Selecione uma cidade, compare metricas e visualize resultados em choropleth, bolhas, heatmap ou clusters.
          </p>

          <div className="presentation-actions">
            <a className="presentation-button" href="#mapa">
              Ir para o mapa
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
