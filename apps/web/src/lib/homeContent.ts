import slideOne from '../assets/carousel/slide-01-ministerio.svg';
import slideTwo from '../assets/carousel/slide-02-mapa.svg';
import slideThree from '../assets/carousel/slide-03-painel.svg';
import { buildYouTubeThumbnailUrl, buildYouTubeWatchUrl, extractYouTubeVideoId } from './youtube';

export type HomeCarouselMediaType = 'image' | 'youtube';
export type HomeMediaItemType = 'photo' | 'video' | 'folder' | 'text';

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
  title: string;
  summary: string;
  date: string;
  link: string;
  reaction: string;
};

export type HomeMediaItem = {
  id: string;
  type: HomeMediaItemType;
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

export const defaultHomeContent: HomeContent = {
  projectName: 'Projeto Luiza Barros',
  institutionTagline: 'Plataforma de divulgacao institucional e inteligencia territorial.',
  updatedAt: '2026-02-20',
  carousel: [
    {
      id: 'slide-01',
      mediaType: 'image',
      imageUrl: slideOne,
      youtubeUrl: '',
      title: 'Acoes territoriais',
      summary: 'Divulgacao de projetos, mobilizacoes e eventos com foco em equidade racial.',
      link: 'https://pnit.infinity.dev.br/',
    },
    {
      id: 'slide-02',
      mediaType: 'image',
      imageUrl: slideTwo,
      youtubeUrl: '',
      title: 'Mapa de indicadores',
      summary: 'Leitura rapida de indicadores e comparacao territorial para tomada de decisao.',
      link: '/mapas',
    },
    {
      id: 'slide-03',
      mediaType: 'image',
      imageUrl: slideThree,
      youtubeUrl: '',
      title: 'Transparencia publica',
      summary: 'Noticias, reacoes da comunidade e acesso simplificado a dados territoriais.',
      link: 'https://plataformadiversifica.vercel.app/',
    },
  ],
  news: [
    {
      id: 'news-01',
      title: 'Rede territorial amplia mobilizacao em comunidades urbanas',
      summary: 'Equipe local iniciou novo ciclo de escuta comunitaria com foco em acesso a direitos.',
      date: '2026-02-18',
      link: 'https://pnit.infinity.dev.br/',
      reaction: 'Comunidade: alta adesao e retorno positivo.',
    },
    {
      id: 'news-02',
      title: 'Painel de indicadores passa a incluir analise comparativa',
      summary: 'Nova camada analitica ajuda a priorizar municipios com maior vulnerabilidade.',
      date: '2026-02-17',
      link: '/mapas',
      reaction: 'Tecnicos: melhora na leitura para planejamento.',
    },
    {
      id: 'news-03',
      title: 'Parceria com plataformas abertas fortalece transparencia',
      summary: 'Integração de fontes publicas amplia rastreabilidade dos dados do observatorio.',
      date: '2026-02-16',
      link: 'https://plataformadiversifica.vercel.app/',
      reaction: 'Gestao: ganho de confiabilidade nas publicacoes.',
    },
  ],
  mediaItems: [
    {
      id: 'material-01',
      type: 'photo',
      title: 'Registro fotografico territorial',
      description: 'Galeria com imagens de campo e mobilizacao social.',
      imageUrl: slideOne,
      youtubeUrl: '',
      link: 'https://pnit.infinity.dev.br/',
    },
    {
      id: 'material-02',
      type: 'video',
      title: 'Video institucional',
      description: 'Material audiovisual para divulgacao em redes e eventos.',
      imageUrl: buildYouTubeThumbnailUrl('aqz-KE-bpKQ'),
      youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      link: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    },
    {
      id: 'material-03',
      type: 'folder',
      title: 'Pasta de materiais',
      description: 'Acesso a folder digital, pecas e documentos de campanha.',
      imageUrl: slideThree,
      youtubeUrl: '',
      link: 'https://plataformadiversifica.vercel.app/',
    },
    {
      id: 'material-04',
      type: 'text',
      title: 'Comunicado institucional',
      description: 'Texto curto para destacar comunicados e orientacoes publicas.',
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
          .map((item, index) => ({
            id: item.id?.trim() || `news-${index + 1}`,
            title: item.title?.trim() || `Noticia ${index + 1}`,
            summary: item.summary?.trim() || 'Sem resumo informado.',
            date: item.date?.trim() || defaultHomeContent.updatedAt,
            link: item.link?.trim() || '/mapas',
            reaction: item.reaction?.trim() || 'Sem reacao registrada.',
          }))
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
              title: item.title?.trim() || `Material ${index + 1}`,
              description: item.description?.trim() || 'Sem descricao informada.',
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

export const saveHomeContent = (content: HomeContent): void => {
  if (typeof window === 'undefined') return;

  const normalized = sanitizeContent(content);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
};

export const resetHomeContent = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
};

export const homeContentUpdateEvent = STORAGE_EVENT;
