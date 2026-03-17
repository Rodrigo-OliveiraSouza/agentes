type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const footerLogos = [
  {
    name: 'Gov.br',
    href: 'https://www.gov.br/pt-br',
    logo: '/logos_in/govbr.png',
  },
  {
    name: 'MIR',
    href: 'https://www.gov.br/igualdaderacial/pt-br',
    logo: '/logos_in/mir.jpeg',
  },
  {
    name: 'UFRB',
    href: 'https://ufrb.edu.br/portal/',
    logo: '/logos_in/ufrb.jpg',
  },
  {
    name: 'Diversifica',
    href: 'https://www.avadiversifica.com.br/',
    logo: '/logos_in/diversifica.png',
  },
];

const pageLinks: FooterLink[] = [
  { label: 'Pagina inicial', href: '/' },
  { label: 'Mapa', href: '/mapas' },
];

const transparencyLinks: FooterLink[] = [
  { label: 'Ministerio da Igualdade Racial', href: 'https://www.gov.br/igualdaderacial/pt-br', external: true },
  { label: 'Portal Gov.br', href: 'https://www.gov.br/', external: true },
  { label: 'Canal de denuncias', href: 'https://falabr.cgu.gov.br/web/home', external: true },
];

const socialLinks: FooterLink[] = [
  { label: 'Gov.br', href: 'https://www.instagram.com/govbr/', external: true },
  { label: 'MIR', href: 'https://www.instagram.com/ministerioigualdaderacial/', external: true },
  { label: 'Diversifica', href: 'https://www.avadiversifica.com.br/', external: true },
];

const renderColumnLinks = (links: FooterLink[]) =>
  links.map((item) => (
    <a
      key={item.label}
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
    >
      {item.label}
    </a>
  ));

export const SiteFooter = () => {
  const handleScrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand-column">
          <div className="footer-logo-grid">
            {footerLogos.map((item) => (
              <a key={item.name} className="footer-logo-item" href={item.href} target="_blank" rel="noreferrer" aria-label={item.name}>
                <img src={item.logo} alt={item.name} />
              </a>
            ))}
          </div>
        </div>

        <div className="footer-link-columns">
          <section className="footer-links-column">
            <h3>PAGINAS</h3>
            <nav className="footer-links-nav" aria-label="Paginas">
              {renderColumnLinks(pageLinks)}
            </nav>
          </section>

          <section className="footer-links-column">
            <h3>TRANSPARENCIA</h3>
            <nav className="footer-links-nav" aria-label="Transparencia">
              {renderColumnLinks(transparencyLinks)}
            </nav>
          </section>

          <section className="footer-links-column">
            <h3>REDES SOCIAIS</h3>
            <nav className="footer-links-nav" aria-label="Redes sociais">
              {renderColumnLinks(socialLinks)}
            </nav>
          </section>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-scroll-row">
        <button type="button" className="footer-scroll-top" onClick={handleScrollToTop} aria-label="Voltar ao inicio da pagina">
          &uarr;
        </button>
      </div>

      <div className="footer-divider" />

      <p className="footer-legal-text">&copy; 2025 E-SINAPIR. Todos os direitos reservados.</p>
    </footer>
  );
};
