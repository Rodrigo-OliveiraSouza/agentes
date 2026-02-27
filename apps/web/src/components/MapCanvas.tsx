import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { centroid } from '@turf/turf';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { IndicatorPoint, ViewMode } from '../lib/types';

type MapCanvasProps = {
  geojson: FeatureCollection | null;
  points: IndicatorPoint[];
  mode: ViewMode;
  unit: string;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  legendScaleMode: 'linear' | 'quartile' | 'percentile';
  themeMode: 'institutional' | 'dark';
  colorPalette?: MapColorPalette;
};

export type MapColorPalette = 'terra' | 'verde' | 'azul' | 'roxo';

type CentroidPoint = {
  code: string;
  lat: number;
  lng: number;
  value: number;
  name: string;
};

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const initialCenter = { lat: -14.2, lng: -51.9 };
const initialZoom = 4;

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#2b2018' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d7c0a5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d140f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1b130f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#5a4637' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#d0bca7' }] },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  restriction: {
    latLngBounds: {
      north: 6.5,
      south: -35.5,
      west: -75.5,
      east: -31.0,
    },
    strictBounds: false,
  },
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const clampChannel = (channel: number) => clamp(Math.round(channel), 0, 255);
  const toHex = (channel: number) => clampChannel(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixHexColor = (fromHex: string, toHex: string, ratio: number): string => {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  if (!from || !to) return fromHex;
  const t = clamp(ratio, 0, 1);
  return rgbToHex(
    from.r + (to.r - from.r) * t,
    from.g + (to.g - from.g) * t,
    from.b + (to.b - from.b) * t,
  );
};

const colorFromStops = (stops: string[], ratio: number): string => {
  if (!stops.length) return '#000000';
  if (stops.length === 1) return stops[0];
  const t = clamp(ratio, 0, 1);
  const scaled = t * (stops.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(stops.length - 1, index + 1);
  const localRatio = scaled - index;
  return mixHexColor(stops[index], stops[next], localRatio);
};

const quantileFrom = (sorted: number[], p: number): number => {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
};

type PaletteConfig = {
  choroplethStops: string[];
  heatmapStops: string[];
  bubbleFill: string;
  bubbleStroke: string;
  stroke: string;
  heatmapStroke: string;
  selectedStroke: string;
  noData: string;
};

const MAP_PALETTES: Record<MapColorPalette, PaletteConfig> = {
  terra: {
    choroplethStops: ['#f4e4d1', '#e6c7a0', '#d9aa78', '#c68752', '#9a582e'],
    heatmapStops: ['#f7ead9', '#ebd2b7', '#deb78f', '#cf9965', '#be7d46', '#a86532', '#844b24', '#5f3117'],
    bubbleFill: '#b56a38',
    bubbleStroke: '#8a4d28',
    stroke: '#7b5e4a',
    heatmapStroke: '#5f4332',
    selectedStroke: '#cf6b3a',
    noData: '#e7d9c9',
  },
  verde: {
    choroplethStops: ['#edf6ea', '#cce6c2', '#9ed18f', '#6eb66a', '#3f8b45'],
    heatmapStops: ['#edf6ea', '#d7eccf', '#c0e2b4', '#a7d696', '#8bc877', '#67b05a', '#4c9446', '#326f35'],
    bubbleFill: '#58a65f',
    bubbleStroke: '#2f7241',
    stroke: '#4f7a58',
    heatmapStroke: '#3f6948',
    selectedStroke: '#2f9b9f',
    noData: '#dfe8d8',
  },
  azul: {
    choroplethStops: ['#e8f2fb', '#c8def4', '#9ec4e8', '#6ea7d8', '#3e79b5'],
    heatmapStops: ['#edf5fe', '#d9eafb', '#bedbf7', '#9bc7f0', '#79b1e6', '#5e98d7', '#447dbd', '#2e629f'],
    bubbleFill: '#4f95d8',
    bubbleStroke: '#2f6798',
    stroke: '#4f6c89',
    heatmapStroke: '#3f5c78',
    selectedStroke: '#c45e2b',
    noData: '#dde6f0',
  },
  roxo: {
    choroplethStops: ['#f3e9f9', '#dfc7ef', '#c59fdf', '#a576ca', '#7d4ea8'],
    heatmapStops: ['#f6eefb', '#ead9f6', '#d9bdef', '#c59fe5', '#ae80d8', '#9662c7', '#7d4aa9', '#623483'],
    bubbleFill: '#9a6ac8',
    bubbleStroke: '#6f4693',
    stroke: '#705c84',
    heatmapStroke: '#5d4970',
    selectedStroke: '#c4662f',
    noData: '#e4d8ee',
  },
};

const UF_BY_IBGE_CODE: Record<string, string> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const ufFromTerritoryCode = (territoryCode: string): string | null => {
  const ibgeUfCode = territoryCode.length >= 2 ? territoryCode.slice(0, 2) : territoryCode;
  return UF_BY_IBGE_CODE[ibgeUfCode] ?? null;
};

const areaOpacityFor = (mode: ViewMode): number => {
  if (mode === 'choropleth') return 0.82;
  if (mode === 'heatmap') return 0.94;
  return 0.12;
};

const heatmapOpacityForZoom = (zoom: number): number => {
  return clamp(0.9 + (zoom - 4) * 0.015, 0.9, 0.97);
};

const boundaryWeightFor = (mode: ViewMode, zoom: number, isSelected: boolean): number => {
  if (isSelected) return 2.2;
  if (mode === 'heatmap') {
    return clamp(1.15 - (zoom - 4) * 0.07, 0.45, 1.15);
  }
  return 0.8;
};

const radiusFor = (value: number, max: number, zoom: number): number => {
  if (max <= 0) return 8000;
  const normalized = Math.sqrt(value / max);
  const zoomScale = clamp(1 - (zoom - 4) * 0.08, 0.35, 1);
  return (7000 + normalized * 32000) * zoomScale;
};

export const MapCanvas = ({
  geojson,
  points,
  mode,
  unit,
  selectedCode,
  onSelect,
  legendScaleMode,
  themeMode,
  colorPalette = 'terra',
}: MapCanvasProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'ibge-map-loader',
  });

  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const circleValuesRef = useRef<number[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clusterRef = useRef<MarkerClusterer | null>(null);

  const values = useMemo(() => points.map((point) => point.value), [points]);
  const sortedValues = useMemo(() => [...values].sort((a, b) => a - b), [values]);
  const min = useMemo(() => (values.length ? Math.min(...values) : 0), [values]);
  const max = useMemo(() => (values.length ? Math.max(...values) : 0), [values]);
  const average = useMemo(
    () => (values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0),
    [values],
  );

  const selectedValue = useMemo(() => {
    if (!selectedCode) return null;
    return points.find((point) => point.code === selectedCode)?.value ?? null;
  }, [selectedCode, points]);

  const pointsByCode = useMemo(() => {
    return new Map(points.map((point) => [point.code, point]));
  }, [points]);

  const rankByCode = useMemo(() => {
    return new Map(
      [...points]
        .sort((a, b) => b.value - a.value)
        .map((point, index) => [point.code, index + 1]),
    );
  }, [points]);

  const quartiles = useMemo(
    () => ({
      q1: quantileFrom(sortedValues, 0.25),
      q2: quantileFrom(sortedValues, 0.5),
      q3: quantileFrom(sortedValues, 0.75),
    }),
    [sortedValues],
  );

  const paletteConfig = useMemo(() => {
    return MAP_PALETTES[colorPalette] ?? MAP_PALETTES.terra;
  }, [colorPalette]);

  const ratioByScale = useCallback(
    (value: number): number => {
      if (sortedValues.length <= 1) return 0.5;

      if (legendScaleMode === 'quartile') {
        if (value <= quartiles.q1) return 0.2;
        if (value <= quartiles.q2) return 0.45;
        if (value <= quartiles.q3) return 0.7;
        return 0.95;
      }

      if (legendScaleMode === 'percentile') {
        let low = 0;
        let high = sortedValues.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (sortedValues[mid] <= value) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        return clamp(high / (sortedValues.length - 1), 0, 1);
      }

      return max <= min ? 0.5 : clamp((value - min) / (max - min), 0, 1);
    },
    [sortedValues, legendScaleMode, quartiles.q1, quartiles.q2, quartiles.q3, max, min],
  );

  const areaColor = useCallback(
    (value: number, heatmapMode: boolean): string => {
      const ratio = ratioByScale(value);
      if (heatmapMode) {
        return colorFromStops(paletteConfig.heatmapStops, ratio);
      }
      return colorFromStops(paletteConfig.choroplethStops, ratio);
    },
    [ratioByScale, paletteConfig],
  );

  const centroidPoints = useMemo<CentroidPoint[]>(() => {
    if (!geojson) return [];

    return geojson.features
      .map((feature) => {
        const code = String((feature.properties?.codarea as string | undefined) ?? '');
        const point = pointsByCode.get(code);
        if (!point) return null;

        const c = centroid(feature as GeoJSON.Feature<Polygon | MultiPolygon>);
        const [lng, lat] = c.geometry.coordinates;

        return {
          code,
          lat,
          lng,
          value: point.value,
          name: point.name,
        } satisfies CentroidPoint;
      })
      .filter((item): item is CentroidPoint => item !== null);
  }, [geojson, pointsByCode]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({
      styles: themeMode === 'dark' ? DARK_MAP_STYLE : [],
    });
  }, [themeMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];
    circleValuesRef.current = [];

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    clusterRef.current?.clearMarkers();
    clusterRef.current = null;

    map.data.forEach((feature) => {
      map.data.remove(feature);
    });

    google.maps.event.clearListeners(map.data, 'click');
    google.maps.event.clearListeners(map.data, 'mouseover');
    google.maps.event.clearListeners(map.data, 'mouseout');

    if (!geojson) return;

    map.data.addGeoJson(geojson as unknown as object);

    map.data.setStyle((feature) => {
      const code = String(feature.getProperty('codarea') ?? '');
      const point = pointsByCode.get(code);
      const hasValue = typeof point?.value === 'number' && Number.isFinite(point.value);
      const value = hasValue ? point!.value : null;
      const isSelected = selectedCode === code;
      const fillColor =
        value === null
          ? paletteConfig.noData
          : mode === 'heatmap'
            ? areaColor(value, true)
            : areaColor(value, false);
      const fillOpacity =
        value === null
          ? 0.45
          : mode === 'heatmap'
            ? heatmapOpacityForZoom(currentZoom)
            : areaOpacityFor(mode);

      return {
        fillColor,
        fillOpacity,
        strokeColor: isSelected
          ? paletteConfig.selectedStroke
          : mode === 'heatmap'
            ? paletteConfig.heatmapStroke
            : paletteConfig.stroke,
        strokeWeight: boundaryWeightFor(mode, currentZoom, isSelected),
        strokeOpacity: mode === 'heatmap' ? 0.88 : 0.78,
        visible: true,
      };
    });

    map.data.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const code = String(event.feature.getProperty('codarea') ?? '');
      if (code) {
        onSelect(code);
      }
    });

    map.data.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
      const code = String(event.feature.getProperty('codarea') ?? '');
      const point = pointsByCode.get(code);
      if (!point || !event.latLng) return;

      const rank = rankByCode.get(code) ?? '-';
      const diff = average > 0 ? ((point.value - average) / average) * 100 : 0;
      const diffLabel = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
      const uf = ufFromTerritoryCode(point.code);
      const flagUrl = uf
        ? `https://assets.codante.io/codante-apis/bandeiras-do-brasil/${uf.toLowerCase()}-circle.svg`
        : null;
      const safeName = escapeHtml(point.name);
      const safeUnit = escapeHtml(unit);
      const safeDiff = escapeHtml(diffLabel);
      const safeValue = escapeHtml(point.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
      const html = `
        <div style="font-size:12px;line-height:1.4;max-width:260px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            ${flagUrl
              ? `<img src="${flagUrl}" alt="Bandeira do estado ${safeName}" width="24" height="24" style="border-radius:999px;display:block;border:1px solid #d8c3ac;" onerror="this.style.display='none'" />`
              : ''}
            <strong>${safeName}</strong>
          </div>
          Valor: ${safeValue} ${safeUnit}<br/>
          Ranking: ${rank} de ${points.length}<br/>
          Dif. média: ${safeDiff}
        </div>
      `;

      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }
      infoWindowRef.current.setContent(html);
      infoWindowRef.current.setPosition(event.latLng);
      infoWindowRef.current.open(map);
    });

    map.data.addListener('mouseout', () => {
      infoWindowRef.current?.close();
    });

    if (mode === 'bubbles') {
      circleValuesRef.current = centroidPoints.map((item) => item.value);
      circlesRef.current = centroidPoints.map((item) => {
        const circle = new google.maps.Circle({
          map,
          center: { lat: item.lat, lng: item.lng },
          radius: radiusFor(item.value, max, currentZoom),
          fillColor: paletteConfig.bubbleFill,
          fillOpacity: 0.34,
          strokeColor: paletteConfig.bubbleStroke,
          strokeOpacity: 0.85,
          strokeWeight: 1,
        });

        circle.addListener('click', () => onSelect(item.code));
        return circle;
      });
    }

    if (mode === 'clusters') {
      markersRef.current = centroidPoints.map((item) => {
        const marker = new google.maps.Marker({
          position: { lat: item.lat, lng: item.lng },
          title: `${item.name}: ${item.value.toLocaleString('pt-BR')}`,
        });

        marker.addListener('click', () => onSelect(item.code));
        return marker;
      });

      clusterRef.current = new MarkerClusterer({
        map,
        markers: markersRef.current,
      });
    }

  }, [
    geojson,
    pointsByCode,
    selectedCode,
    onSelect,
    mode,
    centroidPoints,
    currentZoom,
    areaColor,
    paletteConfig,
    rankByCode,
    average,
    points.length,
    unit,
  ]);

  useEffect(() => {
    if (mode === 'bubbles' && circlesRef.current.length) {
      circlesRef.current.forEach((circle, index) => {
        const value = circleValuesRef.current[index] ?? 0;
        circle.setRadius(radiusFor(value, max, currentZoom));
      });
    }
  }, [mode, currentZoom, max]);

  const legendGradient = useMemo(() => {
    if (mode === 'heatmap') {
      return `linear-gradient(90deg, ${paletteConfig.heatmapStops.join(', ')})`;
    }

    return `linear-gradient(90deg, ${paletteConfig.choroplethStops.join(', ')})`;
  }, [mode, paletteConfig]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson || !geojson.features.length) return;

    const bounds = new google.maps.LatLngBounds();

    geojson.features.forEach((feature) => {
      const geometry = feature.geometry;
      if (!geometry) return;

      const extend = (coords: number[][] | number[][][]) => {
        if (typeof coords[0][0] === 'number') {
          (coords as number[][]).forEach(([lng, lat]) => bounds.extend({ lat, lng }));
          return;
        }

        (coords as number[][][]).forEach((ring) => ring.forEach(([lng, lat]) => bounds.extend({ lat, lng })));
      };

      if (geometry.type === 'Polygon') {
        extend(geometry.coordinates as number[][][]);
      }

      if (geometry.type === 'MultiPolygon') {
        (geometry.coordinates as number[][][][]).forEach((polygon) => extend(polygon));
      }
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  }, [geojson]);

  if (!apiKey) {
    return <div className="map-fallback">Defina `VITE_GOOGLE_MAPS_API_KEY` para carregar o mapa.</div>;
  }

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <div className="map-fallback">
        Falha ao carregar Google Maps. Verifique API key, restrições de domínio, Maps JavaScript API e billing.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="map-fallback">Carregando mapa...</div>;
  }

  return (
    <div className="map-canvas-shell">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCenter}
        zoom={initialZoom}
        options={mapOptions}
        onLoad={(map) => {
          mapRef.current = map;
          setCurrentZoom(map.getZoom() ?? initialZoom);
        }}
        onZoomChanged={() => {
          const zoom = mapRef.current?.getZoom();
          if (typeof zoom === 'number') {
            setCurrentZoom((previous) => (previous === zoom ? previous : zoom));
          }
        }}
      />

      {values.length ? (
        <div className="map-legend">
          <p className="map-legend-title">
            {mode === 'heatmap' ? 'Escala de calor por território' : 'Escala do indicador'} ({legendScaleMode})
          </p>
          <div className="map-legend-gradient" style={{ background: legendGradient }} />
          <div className="map-legend-row">
            <span>Min {min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            <span>Média {average.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            <span>Máx {max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
          </div>
          {legendScaleMode === 'quartile' ? (
            <div className="map-legend-row">
              <span>Q1 {quartiles.q1.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
              <span>Q2 {quartiles.q2.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
              <span>Q3 {quartiles.q3.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            </div>
          ) : null}
          {legendScaleMode === 'percentile' ? (
            <div className="map-legend-row">
              <span>P10 {quantileFrom(sortedValues, 0.1).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
              <span>P50 {quantileFrom(sortedValues, 0.5).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
              <span>P90 {quantileFrom(sortedValues, 0.9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            </div>
          ) : null}
          {mode === 'heatmap' ? (
            <div className="map-legend-row">
              <span>Mais claro = menor índice</span>
              <span>Mais escuro = maior índice</span>
            </div>
          ) : null}
          <div className="map-legend-row">
            <span>Zoom {currentZoom}</span>
            <span>
              Selecionado:{' '}
              {selectedValue === null
                ? 'N/D'
                : `${selectedValue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`.trim()}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
