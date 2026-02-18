import logoMinisterio from '../assets/logos/logo-ministerio.svg';
import logoPlataforma from '../assets/logos/logo-plataforma.svg';

const footerLinks = [
  {
    name: 'Ministerio Interracial do GOLF',
    href: 'https://agentes-1sv.pages.dev',
    logo: logoMinisterio,
  },
  {
    name: 'Portal IBGE',
    href: 'https://www.ibge.gov.br',
    logo: logoPlataforma,
  },
];

export const SiteFooter = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>Mapa tematico com base em dados publicos e visualizacao interativa para analise territorial.</p>
        <div className="footer-logo-links">
          {footerLinks.map((item) => (
            <a key={item.name} href={item.href} target="_blank" rel="noreferrer" aria-label={item.name}>
              <img src={item.logo} alt={item.name} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
