import { useEffect, useMemo, useState } from 'react';

type Slide = {
  src: string;
  alt: string;
};

type SlideMeta = {
  title: string;
  text: string;
  href: string;
  cta: string;
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

const slideMeta: SlideMeta[] = [
  {
    title: 'Camadas e filtros',
    text: 'Navegue por indicador, ano e nivel territorial com visualizacao em camadas.',
    href: '#mapa',
    cta: 'Abrir filtros',
  },
  {
    title: 'Comparacao territorial',
    text: 'Compare municipios, UFs e regioes para apoiar diagnosticos e priorizacao de acoes.',
    href: '#mapa',
    cta: 'Comparar territorios',
  },
  {
    title: 'Exportacao de dados',
    text: 'Consolide leitura do painel e use os indicadores em relatorios tecnicos.',
    href: '#metodologia',
    cta: 'Ver metodologia',
  },
  {
    title: 'Transparencia das fontes',
    text: 'Cada metrica informa origem e abrangencia para auditoria e rastreabilidade.',
    href: '#governanca',
    cta: 'Conferir governanca',
  },
];

const workflowGroups = [
  {
    title: '1) O que voce pode fazer',
    items: ['Comparar municipios e regioes', 'Visualizar desigualdades territoriais', 'Gerar relatorios para politicas publicas'],
  },
  {
    title: '2) Como funciona',
    items: ['Escolha o indicador principal', 'Selecione territorio e ano', 'Analise mapa, painel e graficos'],
  },
  {
    title: '3) Fontes e metodologia',
    items: ['IBGE como fonte principal', 'Bases publicas complementares plugaveis', 'Atualizacao periodica com cache e snapshots'],
  },
];

const lastDataUpdate = '18/02/2026';

export const PresentationSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasSlides = carouselSlides.length > 0;

  useEffect(() => {
    if (carouselSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % carouselSlides.length);
    }, 5200);

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

  const currentMeta = slideMeta[activeIndex % slideMeta.length];

  return (
    <section className="presentation-section">
      <div className="gov-strip">
        <div className="gov-strip-inner">
          <p>gov.br | Ministerio da Igualdade Racial</p>
          <div className="gov-strip-links">
            <a href="#governanca-acessibilidade">Acessibilidade</a>
            <a href="#governanca-politica-dados">Politica de Dados</a>
            <a href="#governanca-lgpd">LGPD</a>
            <span>Ultima atualizacao: {lastDataUpdate}</span>
          </div>
        </div>
      </div>

      <div className="presentation-grid">
        <div className="presentation-copy">
          <p className="presentation-kicker">Ministerio da Igualdade Racial</p>
          <h1>Observatorio territorial de indicadores para equidade racial</h1>
          <p className="presentation-benefit">
            Consulte indicadores por municipio, compare territorios e gere analises para politicas publicas.
          </p>
          <p className="presentation-text">
            Esta plataforma reune dados geograficos e socioeconomicos para apoiar diagnostico territorial, monitorar
            desigualdades e orientar politicas publicas com foco em igualdade racial.
          </p>
          <p className="presentation-text">
            O mapa permite comparar municipios, UFs e regioes em diferentes camadas de visualizacao, com painel de
            detalhes e rastreabilidade da fonte de cada indicador.
          </p>

          <div className="presentation-actions">
            <a className="presentation-button presentation-button-primary" href="#mapa">
              Acessar mapa interativo
            </a>
            <a className="presentation-button presentation-button-secondary" href="#metodologia">
              Ver metodologia
            </a>
          </div>

          <div className="presentation-links-row">
            <a
              className="presentation-link presentation-link-subtle"
              href="https://pnit.infinity.dev.br/"
              target="_blank"
              rel="noreferrer"
            >
              Plataforma de agentes
            </a>
            <a
              className="presentation-link presentation-link-subtle"
              href="https://plataformadiversifica.vercel.app/"
              target="_blank"
              rel="noreferrer"
            >
              Plataforma Diversifica
            </a>
            <span className="presentation-folder">Pasta do carrossel: `apps/web/src/assets/carousel`</span>
          </div>

          <div className="presentation-features">
            {workflowGroups.map((item) => (
              <article key={item.title} className="feature-card">
                <h3>{item.title}</h3>
                {item.items.map((bullet) => (
                  <p key={bullet}>{bullet}</p>
                ))}
              </article>
            ))}
          </div>
        </div>

        <div className="presentation-carousel">
          <div className="carousel-frame">
            {currentSlide && currentMeta ? (
              <a className="carousel-slide-link" href={currentMeta.href}>
                <img src={currentSlide.src} alt={currentSlide.alt} />
                <div className="carousel-overlay">
                  <p className="carousel-tag">Slide {activeIndex + 1}</p>
                  <h3>{currentMeta.title}</h3>
                  <p>{currentMeta.text}</p>
                  <span>{currentMeta.cta}</span>
                </div>
              </a>
            ) : (
              <div className="carousel-empty">
                <p>Adicione imagens na pasta do carrossel para exibir os slides.</p>
              </div>
            )}
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

      <div className="presentation-post-grid">
        <div id="metodologia" className="presentation-pillars">
          <p className="presentation-pillar-title">Metodologia de leitura territorial</p>
          <p className="presentation-pillar-item">Dados oficiais do IBGE com conectores publicos complementares.</p>
          <p className="presentation-pillar-item">Normalizacao por codigos territoriais e validacao de faixa/periodo.</p>
          <p className="presentation-pillar-item">Cache serverless e snapshots para estabilidade operacional.</p>
        </div>

        <div id="governanca" className="presentation-governance">
          <p className="presentation-pillar-title">Governanca e conformidade</p>
          <p id="governanca-acessibilidade" className="presentation-pillar-item">
            Acessibilidade: navegacao por teclado, contraste e foco em leitura de dados publicos.
          </p>
          <p id="governanca-politica-dados" className="presentation-pillar-item">
            Politica de Dados: rastreabilidade de fonte e periodicidade de atualizacao.
          </p>
          <p id="governanca-lgpd" className="presentation-pillar-item">
            LGPD: tratamento de dados agregados e nao identificaveis.
          </p>
          <p className="presentation-pillar-item">Ultima atualizacao de referencia: {lastDataUpdate}.</p>
        </div>
      </div>
    </section>
  );
};
