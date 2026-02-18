import { useEffect, useMemo, useRef, useState } from 'react';
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
};

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

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
};

const mapLibraries: 'visualization'[] = ['visualization'];

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const colorFor = (value: number, min: number, max: number): string => {
  if (max <= min) return 'hsl(200, 86%, 62%)';
  const ratio = clamp((value - min) / (max - min), 0, 1);
  const hue = 210 - ratio * 190;
  const lightness = 84 - ratio * 44;
  return `hsl(${Math.round(hue)}, 88%, ${Math.round(lightness)}%)`;
};

const areaOpacityFor = (mode: ViewMode): number => {
  if (mode === 'choropleth') return 0.82;
  if (mode === 'heatmap') return 0.22;
  return 0.12;
};

const radiusFor = (value: number, max: number, zoom: number): number => {
  if (max <= 0) return 8000;
  const normalized = Math.sqrt(value / max);
  const zoomScale = clamp(1 - (zoom - 4) * 0.08, 0.35, 1);
  return (7000 + normalized * 32000) * zoomScale;
};

const heatWeightFor = (value: number, min: number, max: number): number => {
  if (max <= min) return 50;
  const normalized = clamp((value - min) / (max - min), 0, 1);
  return 15 + Math.pow(normalized, 0.65) * 85;
};

const heatRadiusForZoom = (zoom: number): number => {
  if (zoom <= 4) return 38;
  if (zoom <= 5) return 34;
  if (zoom <= 6) return 30;
  if (zoom <= 7) return 26;
  if (zoom <= 8) return 22;
  if (zoom <= 9) return 18;
  return 14;
};

export const MapCanvas = ({ geojson, points, mode, unit, selectedCode, onSelect }: MapCanvasProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: mapLibraries,
    id: 'ibge-map-loader',
  });

  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const circleValuesRef = useRef<number[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clusterRef = useRef<MarkerClusterer | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  const values = useMemo(() => points.map((point) => point.value), [points]);
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
    const map = mapRef.current;
    if (!map) return;

    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];
    circleValuesRef.current = [];

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    clusterRef.current?.clearMarkers();
    clusterRef.current = null;

    heatmapRef.current?.setMap(null);
    heatmapRef.current = null;

    map.data.forEach((feature) => {
      map.data.remove(feature);
    });

    google.maps.event.clearListeners(map.data, 'click');

    if (!geojson) return;

    map.data.addGeoJson(geojson as unknown as object);

    map.data.setStyle((feature) => {
      const code = String(feature.getProperty('codarea') ?? '');
      const point = pointsByCode.get(code);
      const value = point?.value ?? 0;
      const isSelected = selectedCode === code;

      return {
        fillColor: colorFor(value, min, max),
        fillOpacity: areaOpacityFor(mode),
        strokeColor: isSelected ? '#e74c3c' : '#4e5d6c',
        strokeWeight: isSelected ? 2.2 : 0.8,
        visible: true,
      };
    });

    map.data.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const code = String(event.feature.getProperty('codarea') ?? '');
      if (code) {
        onSelect(code);
      }
    });

    if (mode === 'bubbles') {
      circleValuesRef.current = centroidPoints.map((item) => item.value);
      circlesRef.current = centroidPoints.map((item) => {
        const circle = new google.maps.Circle({
          map,
          center: { lat: item.lat, lng: item.lng },
          radius: radiusFor(item.value, max, currentZoom),
          fillColor: '#2ed573',
          fillOpacity: 0.34,
          strokeColor: '#1eae60',
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

    if (mode === 'heatmap' && google.maps.visualization) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: centroidPoints.map((item) => ({
          location: new google.maps.LatLng(item.lat, item.lng),
          weight: heatWeightFor(item.value, min, max),
        })),
        radius: heatRadiusForZoom(currentZoom),
        maxIntensity: 100,
        opacity: 0.78,
        dissipating: true,
      });

      heatmapRef.current.setMap(map);
    }
  }, [geojson, pointsByCode, selectedCode, onSelect, mode, min, max, centroidPoints]);

  useEffect(() => {
    if (mode === 'heatmap' && heatmapRef.current) {
      heatmapRef.current.set('radius', heatRadiusForZoom(currentZoom));
    }

    if (mode === 'bubbles' && circlesRef.current.length) {
      circlesRef.current.forEach((circle, index) => {
        const value = circleValuesRef.current[index] ?? 0;
        circle.setRadius(radiusFor(value, max, currentZoom));
      });
    }
  }, [mode, currentZoom, max]);

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
        Falha ao carregar Google Maps. Verifique API key, restricoes de dominio, Maps JavaScript API e billing.
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
          <p className="map-legend-title">Escala do indicador</p>
          <div className="map-legend-gradient" />
          <div className="map-legend-row">
            <span>Min {min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            <span>Media {average.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            <span>Max {max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
          </div>
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

