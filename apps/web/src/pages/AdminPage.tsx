import { useMemo, useState } from 'react';
import {
  defaultHomeContent,
  loadHomeContent,
  resetHomeContent,
  saveHomeContent,
  type HomeCarouselItem,
  type HomeNewsItem,
} from '../lib/homeContent';

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10_000)}`;

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const AdminPage = () => {
  const [draft, setDraft] = useState(loadHomeContent);
  const [status, setStatus] = useState('');

  const sortedNews = useMemo(
    () => [...draft.news].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [draft.news],
  );

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

