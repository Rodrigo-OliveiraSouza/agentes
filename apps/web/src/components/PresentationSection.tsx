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
    text: 'Navegue por indicador, ano e nível territorial com visualização em camadas.',
    href: '#mapa',
    cta: 'Abrir filtros',
  },
  {
    title: 'Comparação territorial',
    text: 'Compare municípios, UFs e regiões para apoiar diagnósticos e priorização de ações.',
    href: '#mapa',
    cta: 'Comparar territórios',
  },
  {
    title: 'Exportação de dados',
    text: 'Consolide leitura do painel e use os indicadores em relatórios técnicos.',
    href: '#metodologia',
    cta: 'Ver metodologia',
  },
  {
    title: 'Transparência das fontes',
    text: 'Cada métrica informa origem e abrangência para auditoria e rastreabilidade.',
    href: '#governanca',
    cta: 'Conferir governança',
  },
];

const workflowGroups = [
  {
    title: '1) O que você pode fazer',
    items: ['Comparar municípios e regiões', 'Visualizar desigualdades territoriais', 'Gerar relatórios para políticas públicas'],
  },
  {
    title: '2) Como funciona',
    items: ['Escolha o indicador principal', 'Selecione território e ano', 'Analise mapa, painel e gráficos'],
  },
  {
    title: '3) Fontes e metodologia',
    items: ['IBGE como fonte principal', 'Bases públicas complementares plugáveis', 'Atualização periódica com cache e snapshots'],
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
          <p>gov.br | Ministério da Igualdade Racial</p>
          <div className="gov-strip-links">
            <a href="#governanca-acessibilidade">Acessibilidade</a>
            <a href="#governanca-politica-dados">Política de Dados</a>
            <a href="#governanca-lgpd">LGPD</a>
            <span>Última atualização: {lastDataUpdate}</span>
          </div>
        </div>
      </div>

      <div className="presentation-grid">
        <div className="presentation-copy">
          <p className="presentation-kicker">Ministério da Igualdade Racial</p>
          <h1>Observatório territorial de indicadores para equidade racial</h1>
          <p className="presentation-benefit">
            Consulte indicadores por município, compare territórios e gere análises para políticas públicas.
          </p>
          <p className="presentation-text">
            Esta plataforma reúne dados geográficos e socioeconômicos para apoiar diagnóstico territorial, monitorar
            desigualdades e orientar políticas públicas com foco em igualdade racial.
          </p>
          <p className="presentation-text">
            O mapa permite comparar municípios, UFs e regiões em diferentes camadas de visualização, com painel de
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
          <p className="presentation-pillar-item">Dados oficiais do IBGE com conectores públicos complementares.</p>
          <p className="presentation-pillar-item">Normalização por códigos territoriais e validação de faixa/período.</p>
          <p className="presentation-pillar-item">Cache serverless e snapshots para estabilidade operacional.</p>
        </div>

        <div id="governanca" className="presentation-governance">
          <p className="presentation-pillar-title">Governança e conformidade</p>
          <p id="governanca-acessibilidade" className="presentation-pillar-item">
            Acessibilidade: navegação por teclado, contraste e foco em leitura de dados públicos.
          </p>
          <p id="governanca-politica-dados" className="presentation-pillar-item">
            Política de Dados: rastreabilidade de fonte e periodicidade de atualização.
          </p>
          <p id="governanca-lgpd" className="presentation-pillar-item">
            LGPD: tratamento de dados agregados e não identificáveis.
          </p>
          <p className="presentation-pillar-item">Última atualização de referência: {lastDataUpdate}.</p>
        </div>
      </div>
    </section>
  );
};
