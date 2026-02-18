import logoMinisterio from '../assets/logos/logo-ministerio.svg';
import logoPlataforma from '../assets/logos/logo-plataforma.svg';

const footerLinks = [
  {
    name: 'Ministerio da Igualdade Racial',
    href: 'https://www.gov.br/igualdaderacial/pt-br',
    logo: logoMinisterio,
  },
  {
    name: 'Observatorio de Indicadores',
    href: 'https://agentes-1sv.pages.dev',
    logo: logoPlataforma,
  },
];

const policyLinks = [
  { label: 'Acessibilidade', href: '#governanca-acessibilidade' },
  { label: 'Politica de Dados', href: '#governanca-politica-dados' },
  { label: 'LGPD', href: '#governanca-lgpd' },
];

export const SiteFooter = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-text-block">
          <p>Ministerio da Igualdade Racial | Plataforma de indicadores territoriais com dados publicos.</p>
          <div className="footer-policy-links">
            {policyLinks.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
            <span>Atualizacao de referencia: 18/02/2026</span>
          </div>
        </div>
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
