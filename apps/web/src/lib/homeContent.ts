import slideOne from '../assets/carousel/slide-01-ministerio.svg';
import slideTwo from '../assets/carousel/slide-02-mapa.svg';
import slideThree from '../assets/carousel/slide-03-painel.svg';
import { api } from './api';
import { buildYouTubeThumbnailUrl, buildYouTubeWatchUrl, extractYouTubeVideoId } from './youtube';

export type HomeCarouselMediaType = 'image' | 'youtube';
export type HomeMediaItemType = 'photo' | 'video' | 'folder' | 'text';
export type HomeThemeKey = 'geral' | 'politica' | 'economia' | 'saude' | 'educacao' | 'seguranca' | 'demografia' | 'infraestrutura';

export const HOME_THEME_OPTIONS: Array<{ key: HomeThemeKey; label: string }> = [
  { key: 'geral', label: 'Geral' },
  { key: 'politica', label: 'Política Pública' },
  { key: 'economia', label: 'Economia' },
  { key: 'saude', label: 'Saúde' },
  { key: 'educacao', label: 'Educação' },
  { key: 'seguranca', label: 'Segurança' },
  { key: 'demografia', label: 'Demografia' },
  { key: 'infraestrutura', label: 'Infraestrutura' },
];

export type HomeCarouselItem = {
  id: string;
  mediaType: HomeCarouselMediaType;
  imageUrl: string;
  youtubeUrl: string;
  title: string;
  summary: string;
  link: string;
};

export type HomeNewsItem = {
  id: string;
  theme: HomeThemeKey;
  title: string;
  summary: string;
  date: string;
  imageUrl: string;
  link: string;
  reaction: string;
  priority: number;
};

export type HomeMediaItem = {
  id: string;
  type: HomeMediaItemType;
  theme: HomeThemeKey;
  title: string;
  description: string;
  imageUrl: string;
  youtubeUrl: string;
  link: string;
};

export type HomeContent = {
  projectName: string;
  institutionTagline: string;
  carousel: HomeCarouselItem[];
  news: HomeNewsItem[];
  mediaItems: HomeMediaItem[];
  updatedAt: string;
};

const STORAGE_KEY = 'luiza-barros-home-content-v1';
const STORAGE_EVENT = 'luiza-barros-home-content-updated';

const normalizeNewsPriority = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
};

const parseNewsDateValue = (rawDate: string): number => {
  const normalized = rawDate.trim();
  if (!normalized) return 0;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map((value) => Number(value));
    return Date.UTC(year, month - 1, day);
  }

  const brDate = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const compareHomeNewsItems = (a: HomeNewsItem, b: HomeNewsItem): number => {
  const byPriority = normalizeNewsPriority(b.priority) - normalizeNewsPriority(a.priority);
  if (byPriority !== 0) return byPriority;
  return parseNewsDateValue(b.date) - parseNewsDateValue(a.date);
};

export const defaultHomeContent: HomeContent = {
  projectName: 'Esinapir',
  institutionTagline: 'Plataforma de divulgação institucional e inteligência territorial.',
  updatedAt: '2026-02-20',
  carousel: [
    {
      id: 'slide-01',
      mediaType: 'image',
      imageUrl: slideOne,
      youtubeUrl: '',
      title: 'Ações territoriais',
      summary: 'Divulgação de projetos, mobilizações e eventos com foco em equidade racial.',
      link: 'https://pnit.infinity.dev.br/',
    },
    {
      id: 'slide-02',
      mediaType: 'image',
      imageUrl: slideTwo,
      youtubeUrl: '',
      title: 'Mapa de indicadores',
      summary: 'Leitura rápida de indicadores e comparação territorial para tomada de decisão.',
      link: '/mapas',
    },
    {
      id: 'slide-03',
      mediaType: 'image',
      imageUrl: slideThree,
      youtubeUrl: '',
      title: 'Transparência pública',
      summary: 'Notícias, reações da comunidade e acesso simplificado a dados territoriais.',
      link: 'https://plataformadiversifica.vercel.app/',
    },
  ],
  news: [
    {
      id: 'news-01',
      theme: 'politica',
      title: 'Rede territorial amplia mobilização em comunidades urbanas',
      summary: 'Equipe local iniciou novo ciclo de escuta comunitária com foco em acesso a direitos.',
      date: '2026-02-18',
      imageUrl: slideOne,
      link: 'https://pnit.infinity.dev.br/',
      reaction: 'Comunidade: alta adesão e retorno positivo.',
      priority: 3,
    },
    {
      id: 'news-02',
      theme: 'economia',
      title: 'Painel de indicadores passa a incluir análise comparativa',
      summary: 'Nova camada analítica ajuda a priorizar municípios com maior vulnerabilidade.',
      date: '2026-02-17',
      imageUrl: slideTwo,
      link: '/mapas',
      reaction: 'Técnicos: melhora na leitura para planejamento.',
      priority: 2,
    },
    {
      id: 'news-03',
      theme: 'infraestrutura',
      title: 'Parceria com plataformas abertas fortalece transparência',
      summary: 'Integração de fontes públicas amplia rastreabilidade dos dados do observatório.',
      date: '2026-02-16',
      imageUrl: slideThree,
      link: 'https://plataformadiversifica.vercel.app/',
      reaction: 'Gestão: ganho de confiabilidade nas publicações.',
      priority: 1,
    },
  ],
  mediaItems: [
    {
      id: 'material-01',
      type: 'photo',
      theme: 'politica',
      title: 'Registro fotográfico territorial',
      description: 'Galeria com imagens de campo e mobilização social.',
      imageUrl: slideOne,
      youtubeUrl: '',
      link: 'https://pnit.infinity.dev.br/',
    },
    {
      id: 'material-02',
      type: 'video',
      theme: 'economia',
      title: 'Vídeo institucional',
      description: 'Material audiovisual para divulgação em redes e eventos.',
      imageUrl: buildYouTubeThumbnailUrl('aqz-KE-bpKQ'),
      youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      link: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    },
    {
      id: 'material-05',
      type: 'video',
      theme: 'saude',
      title: 'Vídeo em destaque - Saúde pública',
      description: 'Resumo em vídeo com foco em cobertura de atenção primária e pré-natal.',
      imageUrl: buildYouTubeThumbnailUrl('aqz-KE-bpKQ'),
      youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      link: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    },
    {
      id: 'material-06',
      type: 'video',
      theme: 'educacao',
      title: 'Vídeo em destaque - Educação e oportunidade',
      description: 'Conteúdo audiovisual sobre alfabetização, frequência escolar e ensino superior.',
      imageUrl: buildYouTubeThumbnailUrl('aqz-KE-bpKQ'),
      youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      link: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    },
    {
      id: 'material-03',
      type: 'folder',
      theme: 'infraestrutura',
      title: 'Pasta de materiais',
      description: 'Acesso a folder digital, peças e documentos de campanha.',
      imageUrl: slideThree,
      youtubeUrl: '',
      link: 'https://plataformadiversifica.vercel.app/',
    },
    {
      id: 'material-04',
      type: 'text',
      theme: 'geral',
      title: 'Comunicado institucional',
      description: 'Texto curto para destacar comunicados e orientações públicas.',
      imageUrl: '',
      youtubeUrl: '',
      link: '',
    },
  ],
};

const cloneContent = (content: HomeContent): HomeContent => ({
  ...content,
  carousel: content.carousel.map((item) => ({ ...item })),
  news: content.news.map((item) => ({ ...item })),
  mediaItems: content.mediaItems.map((item) => ({ ...item })),
});

const THEME_FALLBACK_SEQUENCE: HomeThemeKey[] = ['politica', 'economia', 'saude', 'educacao', 'seguranca', 'demografia', 'infraestrutura'];

const normalizeThemeKey = (value: unknown, fallbackTheme: HomeThemeKey): HomeThemeKey => {
  if (typeof value !== 'string') return fallbackTheme;
  const normalized = value.trim().toLowerCase();
  if (HOME_THEME_OPTIONS.some((option) => option.key === normalized)) {
    return normalized as HomeThemeKey;
  }
  return fallbackTheme;
};

const sanitizeContent = (value: unknown): HomeContent => {
  if (!value || typeof value !== 'object') {
    return cloneContent(defaultHomeContent);
  }

  const payload = value as Partial<HomeContent>;
  return {
    projectName: payload.projectName?.trim() || defaultHomeContent.projectName,
    institutionTagline: payload.institutionTagline?.trim() || defaultHomeContent.institutionTagline,
    updatedAt: payload.updatedAt?.trim() || defaultHomeContent.updatedAt,
    carousel: Array.isArray(payload.carousel) && payload.carousel.length
      ? payload.carousel
          .map((item, index) => {
            const fallback = defaultHomeContent.carousel[index % defaultHomeContent.carousel.length];
            const mediaType: HomeCarouselMediaType = item.mediaType === 'youtube' ? 'youtube' : 'image';
            const parsedVideoId = extractYouTubeVideoId(item.youtubeUrl?.trim() || item.link?.trim() || '');
            const youtubeUrl = parsedVideoId ? buildYouTubeWatchUrl(parsedVideoId) : '';
            const imageUrl = mediaType === 'youtube'
              ? (parsedVideoId ? buildYouTubeThumbnailUrl(parsedVideoId) : fallback.imageUrl)
              : item.imageUrl?.trim() || fallback.imageUrl;

            return {
              id: item.id?.trim() || `slide-${index + 1}`,
              mediaType,
              imageUrl,
              youtubeUrl,
              title: item.title?.trim() || `Slide ${index + 1}`,
              summary: item.summary?.trim() || 'Sem resumo informado.',
              link: mediaType === 'youtube' ? (youtubeUrl || item.link?.trim() || '/mapas') : item.link?.trim() || '/mapas',
            };
          })
          .slice(0, 12)
      : cloneContent(defaultHomeContent).carousel,
    news: Array.isArray(payload.news) && payload.news.length
      ? payload.news
          .map((item, index) => {
            const fallbackTheme = THEME_FALLBACK_SEQUENCE[index % THEME_FALLBACK_SEQUENCE.length];
            return {
              id: item.id?.trim() || `news-${index + 1}`,
              theme: normalizeThemeKey(item.theme, fallbackTheme),
              title: item.title?.trim() || `Notícia ${index + 1}`,
              summary: item.summary?.trim() || 'Sem resumo informado.',
              date: item.date?.trim() || defaultHomeContent.updatedAt,
              imageUrl: item.imageUrl?.trim() || '',
              link: item.link?.trim() || '/mapas',
              reaction: item.reaction?.trim() || 'Sem reação registrada.',
              priority: normalizeNewsPriority(item.priority),
            };
          })
          .slice(0, 30)
      : cloneContent(defaultHomeContent).news,
    mediaItems: Array.isArray(payload.mediaItems) && payload.mediaItems.length
      ? payload.mediaItems
          .map((item, index) => {
            const fallback = defaultHomeContent.mediaItems[index % defaultHomeContent.mediaItems.length];
            const type: HomeMediaItemType =
              item.type === 'video' || item.type === 'photo' || item.type === 'folder' || item.type === 'text'
                ? item.type
                : 'text';

            const rawLink = item.link?.trim() || fallback.link || '';
            const parsedVideoId = extractYouTubeVideoId(item.youtubeUrl?.trim() || rawLink);
            const youtubeUrl = type === 'video' && parsedVideoId ? buildYouTubeWatchUrl(parsedVideoId) : '';

            const imageUrl = type === 'video'
              ? (parsedVideoId ? buildYouTubeThumbnailUrl(parsedVideoId) : item.imageUrl?.trim() || fallback.imageUrl)
              : type === 'text'
                ? item.imageUrl?.trim() || ''
                : item.imageUrl?.trim() || fallback.imageUrl;

            return {
              id: item.id?.trim() || `material-${index + 1}`,
              type,
              theme: normalizeThemeKey(item.theme, fallback.theme),
              title: item.title?.trim() || `Material ${index + 1}`,
              description: item.description?.trim() || 'Sem descrição informada.',
              imageUrl,
              youtubeUrl: type === 'video' ? (youtubeUrl || item.youtubeUrl?.trim() || '') : '',
              link: type === 'video' ? (youtubeUrl || rawLink) : item.link?.trim() || fallback.link || '',
            };
          })
          .slice(0, 30)
      : cloneContent(defaultHomeContent).mediaItems,
  };
};

export const loadHomeContent = (): HomeContent => {
  if (typeof window === 'undefined') {
    return cloneContent(defaultHomeContent);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneContent(defaultHomeContent);
    return sanitizeContent(JSON.parse(raw));
  } catch {
    return cloneContent(defaultHomeContent);
  }
};

const persistLocalHomeContent = (content: HomeContent): HomeContent => {
  const normalized = sanitizeContent(content);
  if (typeof window === 'undefined') {
    return normalized;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  return normalized;
};

export const saveHomeContent = async (
  content: HomeContent,
): Promise<{
  normalized: HomeContent;
  remoteSaved: boolean;
  remoteUpdatedAt: string | null;
  errorMessage: string | null;
}> => {
  const normalized = persistLocalHomeContent(content);

  try {
    const result = await api.saveHomeContent(normalized);
    return {
      normalized,
      remoteSaved: Boolean(result.ok),
      remoteUpdatedAt: result.updatedAt ?? null,
      errorMessage: null,
    };
  } catch (error) {
    console.warn('Falha ao salvar conteudo da home no banco. Mantendo armazenamento local.', error);
    return {
      normalized,
      remoteSaved: false,
      remoteUpdatedAt: null,
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido ao salvar conteudo da home.',
    };
  }
};

export const syncHomeContentFromApi = async (): Promise<HomeContent | null> => {
  try {
    const payload = await api.homeContent();
    if (!payload.item) return null;
    const normalized = sanitizeContent(payload.item);
    return persistLocalHomeContent(normalized);
  } catch (error) {
    console.warn('Falha ao sincronizar conteudo da home com a API. Usando conteudo local.', error);
    return null;
  }
};

export const resetHomeContent = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
};

export const homeContentUpdateEvent = STORAGE_EVENT;
