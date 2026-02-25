import logoMinisterio from '../assets/logos/logo-ministerio.svg';
import logoPlataforma from '../assets/logos/logo-plataforma.svg';

const footerLinks = [
  {
    name: 'Plataforma de Agentes',
    href: 'https://pnit.infinity.dev.br/',
    logo: logoMinisterio,
  },
  {
    name: 'Plataforma Diversifica',
    href: 'https://plataformadiversifica.vercel.app/',
    logo: logoPlataforma,
  },
];

const policyLinks = [
  { label: 'Acessibilidade', href: '#governanca-acessibilidade' },
  { label: 'Política de Dados', href: '#governanca-politica-dados' },
  { label: 'LGPD', href: '#governanca-lgpd' },
];

export const SiteFooter = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-text-block">
          <p>Ministério da Igualdade Racial | Plataforma de indicadores territoriais com dados públicos.</p>
          <div className="footer-policy-links">
            {policyLinks.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
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
