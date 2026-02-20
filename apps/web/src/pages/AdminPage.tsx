import { type FormEvent, useMemo, useState } from 'react';
import {
  defaultHomeContent,
  loadHomeContent,
  resetHomeContent,
  saveHomeContent,
  type HomeCarouselItem,
  type HomeNewsItem,
} from '../lib/homeContent';

const ADMIN_SESSION_KEY = 'luiza-barros-admin-session-v1';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 90;
const ADMIN_FALLBACK_ACCESS_CODE = 'luiza-barros-2026';

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10_000)}`;

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getExpectedAccessCode = (): string => {
  const configured = import.meta.env.VITE_ADMIN_ACCESS_CODE?.trim();
  if (configured && configured.length >= 4) {
    return configured;
  }
  return ADMIN_FALLBACK_ACCESS_CODE;
};

const hasValidAdminSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw) as { expiresAt?: number };
    if (typeof payload.expiresAt !== 'number' || payload.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return false;
  }
};

const persistAdminSession = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    }),
  );
};

const clearAdminSession = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const AdminPage = () => {
  const expectedAccessCode = useMemo(getExpectedAccessCode, []);
  const isFallbackCode = expectedAccessCode === ADMIN_FALLBACK_ACCESS_CODE;
  const [isUnlocked, setIsUnlocked] = useState(hasValidAdminSession);
  const [accessCode, setAccessCode] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [draft, setDraft] = useState(loadHomeContent);
  const [status, setStatus] = useState('');

  const sortedNews = useMemo(
    () => [...draft.news].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [draft.news],
  );

  const unlockAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (accessCode.trim() !== expectedAccessCode) {
      setAccessMessage('Codigo invalido. Tente novamente.');
      return;
    }

    persistAdminSession();
    setIsUnlocked(true);
    setAccessCode('');
    setAccessMessage('');
  };

  const lockAdmin = () => {
    clearAdminSession();
    setIsUnlocked(false);
    setStatus('');
    setAccessCode('');
    setAccessMessage('Sessao encerrada.');
  };

  if (!isUnlocked) {
    return (
      <div className="admin-gate-shell">
        <section className="admin-gate-card">
          <p className="admin-kicker">Painel protegido</p>
          <h1>Acesso restrito</h1>
          <p>Informe o codigo para editar conteudo da pagina inicial.</p>
          <form className="admin-gate-form" onSubmit={unlockAdmin}>
            <label htmlFor="admin-access-code">
              Codigo de acesso
              <input
                id="admin-access-code"
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Digite o codigo"
                autoComplete="off"
              />
            </label>
            <button type="submit">Entrar no painel</button>
          </form>
          {accessMessage ? <p className="admin-gate-message">{accessMessage}</p> : null}
          {isFallbackCode ? (
            <p className="admin-gate-warning">
              Codigo padrao em uso. Defina `VITE_ADMIN_ACCESS_CODE` no ambiente para aumentar a seguranca.
            </p>
          ) : null}
          <a href="/">Voltar para pagina inicial</a>
        </section>
      </div>
    );
  }

  const updateCarousel = (id: string, patch: Partial<HomeCarouselItem>) => {
    setDraft((current) => ({
      ...current,
      carousel: current.carousel.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const updateNews = (id: string, patch: Partial<HomeNewsItem>) => {
    setDraft((current) => ({
      ...current,
      news: current.news.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const saveDraft = () => {
    const payload = {
      ...draft,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    saveHomeContent(payload);
    setDraft(payload);
    setStatus('Conteudo salvo com sucesso.');
    window.setTimeout(() => setStatus(''), 2500);
  };

  const restoreDefault = () => {
    resetHomeContent();
    setDraft(loadHomeContent());
    setStatus('Conteudo restaurado para o padrao.');
    window.setTimeout(() => setStatus(''), 2500);
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Painel interno</p>
          <h1>Gestao de divulgacao - Projeto Luiza Barros</h1>
          <p>Rota reservada: `/dev/admin` (nao exibida no menu publico).</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" onClick={saveDraft}>
            Salvar conteudo
          </button>
          <button type="button" onClick={restoreDefault}>
            Restaurar padrao
          </button>
          <button type="button" onClick={lockAdmin}>
            Encerrar sessao
          </button>
          <a href="/">Voltar para pagina inicial</a>
        </div>
      </header>

      {status ? <p className="admin-status">{status}</p> : null}

      <section className="admin-card">
        <h2>Dados gerais</h2>
        <div className="admin-grid">
          <label>
            Nome do projeto
            <input
              value={draft.projectName}
              onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))}
            />
          </label>
          <label>
            Frase institucional
            <input
              value={draft.institutionTagline}
              onChange={(event) => setDraft((current) => ({ ...current, institutionTagline: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-section-head">
          <h2>Carrossel da pagina inicial</h2>
          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                carousel: [
                  ...current.carousel,
                  {
                    id: makeId('slide'),
                    imageUrl: '',
                    title: 'Novo destaque',
                    summary: 'Resumo do destaque',
                    link: '/mapas',
                  },
                ],
              }))
            }
          >
            Adicionar slide
          </button>
        </div>

        <div className="admin-list">
          {draft.carousel.map((item) => (
            <article className="admin-item" key={item.id}>
              <div className="admin-item-head">
                <h3>{item.title || 'Slide sem titulo'}</h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      carousel: current.carousel.filter((entry) => entry.id !== item.id),
                    }))
                  }
                >
                  Remover
                </button>
              </div>
              <div className="admin-grid">
                <label>
                  Titulo
                  <input value={item.title} onChange={(event) => updateCarousel(item.id, { title: event.target.value })} />
                </label>
                <label>
                  Link
                  <input value={item.link} onChange={(event) => updateCarousel(item.id, { link: event.target.value })} />
                </label>
                <label className="admin-span-2">
                  Resumo
                  <textarea value={item.summary} onChange={(event) => updateCarousel(item.id, { summary: event.target.value })} />
                </label>
                <label className="admin-span-2">
                  URL da imagem
                  <input
                    value={item.imageUrl}
                    onChange={(event) => updateCarousel(item.id, { imageUrl: event.target.value })}
                    placeholder="https://..."
                  />
                </label>
                <label className="admin-span-2">
                  Upload local (base64)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const imageUrl = await readFileAsDataUrl(file);
                      updateCarousel(item.id, { imageUrl });
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-section-head">
          <h2>Noticias e reacoes</h2>
          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                news: [
                  ...current.news,
                  {
                    id: makeId('news'),
                    title: 'Nova noticia',
                    summary: 'Resumo da noticia',
                    date: new Date().toISOString().slice(0, 10),
                    link: '/mapas',
                    reaction: 'Sem reacao registrada.',
                  },
                ],
              }))
            }
          >
            Adicionar noticia
          </button>
        </div>

        <div className="admin-list">
          {sortedNews.map((item) => (
            <article className="admin-item" key={item.id}>
              <div className="admin-item-head">
                <h3>{item.title || 'Noticia sem titulo'}</h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      news: current.news.filter((entry) => entry.id !== item.id),
                    }))
                  }
                >
                  Remover
                </button>
              </div>
              <div className="admin-grid">
                <label>
                  Titulo
                  <input value={item.title} onChange={(event) => updateNews(item.id, { title: event.target.value })} />
                </label>
                <label>
                  Data
                  <input type="date" value={item.date} onChange={(event) => updateNews(item.id, { date: event.target.value })} />
                </label>
                <label className="admin-span-2">
                  Resumo
                  <textarea value={item.summary} onChange={(event) => updateNews(item.id, { summary: event.target.value })} />
                </label>
                <label className="admin-span-2">
                  Reacao
                  <textarea value={item.reaction} onChange={(event) => updateNews(item.id, { reaction: event.target.value })} />
                </label>
                <label className="admin-span-2">
                  Link
                  <input value={item.link} onChange={(event) => updateNews(item.id, { link: event.target.value })} />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>Seguranca atual</h2>
        <p>
          O painel usa codigo de acesso em sessao local (90 minutos). Esta barreira reduz acesso acidental, mas a
          protecao definitiva exige autenticacao no backend.
        </p>
        {isFallbackCode ? (
          <p className="admin-security-alert">
            Alerta: codigo padrao ativo. Configure `VITE_ADMIN_ACCESS_CODE` no ambiente de build/deploy.
          </p>
        ) : null}
      </section>

      <section className="admin-card">
        <h2>Limite do MVP</h2>
        <p>
          Este admin salva dados no `localStorage` do navegador atual. Para publicar alteracoes globais para todos os
          usuarios, o proximo passo e conectar este painel a um endpoint da API (Worker + Neon/KV).
        </p>
        <button
          type="button"
          onClick={() => {
            saveHomeContent(defaultHomeContent);
            setDraft(loadHomeContent());
            setStatus('Conteudo padrao regravado no armazenamento local.');
            window.setTimeout(() => setStatus(''), 2500);
          }}
        >
          Regravar padrao no storage local
        </button>
      </section>
    </div>
  );
};
