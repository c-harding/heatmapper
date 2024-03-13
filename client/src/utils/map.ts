import { toGeoJSON } from '@mapbox/polyline';
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import type {
  AnyLayer,
  Expression,
  GeoJSONSource,
  GeoJSONSourceRaw,
  Map as MapboxMap,
  MapMouseEvent,
  Point,
  PointLike,
} from 'mapbox-gl';
import { nextTick, ref, watch } from 'vue';

import { MapStyle } from '../MapStyle';

export interface MapProperties {
  id: string;
}

type RGB = [r: number, g: number, b: number];

export enum MapSourceLayer {
  LINES = 'lines',
  SELECTED = 'selected',
}

const colorOpacityFromZoom = (
  [r, g, b]: RGB,
  ...pairs: [zoom: number, opacity: number][]
): Expression => fromZoom(...pairs.map(([zoom, a]) => [zoom, ['rgba', r, g, b, a]] as const));

const fromZoom = (...pairs: (readonly [zoom: number, value: unknown])[]): Expression => [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...pairs.flatMap(([zoomLevel, value]) => [zoomLevel, value]),
];

const makeGeoJsonData = (
  mapItems: readonly MapItem[] = [],
): FeatureCollection<LineString, MapProperties> => ({
  type: 'FeatureCollection',
  features: mapItems
    .filter((item) => item.map)
    .map<Feature<LineString, MapProperties>>((item) => ({
      type: 'Feature',
      properties: {
        id: item.id,
      },
      geometry: toGeoJSON(item.map),
    })),
});

const makeGeoJson = (mapItems: readonly MapItem[] = []): GeoJSONSourceRaw => ({
  type: 'geojson',
  data: makeGeoJsonData(mapItems),
});

interface LayerDef {
  source: string;
  color: Expression | string;
  width: Expression | number;
}

const lineWidth = fromZoom([5, 1], [14, 4], [22, 8]);
const selectedWidth = fromZoom([5, 4], [14, 8]);

const satelliteViews = new Set([MapStyle.SATELLITE, MapStyle.HYBRID]);

const colorsForStyle = (style: MapStyle): Record<'lines' | 'medium' | 'hot', RGB> => {
  const F = 255;
  if (satelliteViews.has(style)) {
    return { lines: [F, 0, F], medium: [F, 0, F], hot: [F, 0, F] };
  } else if (style === MapStyle.DARK) {
    return { lines: [0xb2, 0xb2, F], medium: [0xf8, 0, 0], hot: [0x2f, 0x2f, 0] };
  } else {
    return { lines: [0, 0, F], medium: [F, 0, 0], hot: [F, F, 0] };
  }
};

export const getLayersForStyle = (
  style: MapStyle,
): Record<'lines' | 'medium' | 'hot' | 'selected', LayerDef> => ({
  lines: {
    source: MapSourceLayer.LINES,
    color: colorOpacityFromZoom(colorsForStyle(style).lines, [5, 0.75], [10, 0.35]),
    width: lineWidth,
  },
  medium: {
    source: MapSourceLayer.LINES,
    color: colorOpacityFromZoom(colorsForStyle(style).medium, [5, 0.2], [10, 0.08]),
    width: lineWidth,
  },
  hot: {
    source: MapSourceLayer.LINES,
    color: colorOpacityFromZoom(colorsForStyle(style).hot, [5, 0.1], [10, 0.04]),
    width: lineWidth,
  },
  selected: {
    source: MapSourceLayer.SELECTED,
    color: '#0CF',
    width: selectedWidth,
  },
});

const buildLineLayer = (id: string, layer: LayerDef): AnyLayer => ({
  id,
  type: 'line',
  source: layer.source,
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': layer.color,
    'line-width': layer.width,
  },
});

export const addLayersToMap = (map: MapboxMap, style: MapStyle) => {
  Object.values(MapSourceLayer).forEach(
    (id) => map.getSource(id) || map.addSource(id, makeGeoJson()),
  );

  Object.entries(getLayersForStyle(style)).forEach(([id, layer]) => {
    if (map.getLayer(id)) map.removeLayer(id);
    map.addLayer(buildLineLayer(id, layer));
  });
};

export const applyMapItems = (
  map: MapboxMap,
  next: readonly MapItem[],
  sourceID: MapSourceLayer,
): void => {
  const source = map.getSource(sourceID) as GeoJSONSource | undefined;
  source?.setData(makeGeoJsonData(next));
};

const surround = (point: Point, offset: number): [PointLike, PointLike] => [
  [point.x - offset, point.y + offset],
  [point.x + offset, point.y - offset],
];

interface UseMapSelectionConfig {
  getExternalSelection: () => string[];
  flyToSelection: () => void;
  emitUpdate: (newSelection: string[]) => void;
}

interface UseMapSelection {
  click: (e: MapMouseEvent) => void;
}

export const useMapSelection = ({
  getExternalSelection,
  flyToSelection,
  emitUpdate,
}: UseMapSelectionConfig): UseMapSelection => {
  const localSelected = ref<string[]>([]);

  watch(getExternalSelection, () => {
    nextTick(() => {
      if (getExternalSelection() !== localSelected.value) {
        localSelected.value = getExternalSelection();
        flyToSelection();
      }
    });
  });

  function toggleSelect(id: string | undefined): void {
    if (!id) return;

    const index = localSelected.value.indexOf(id);
    if (index !== -1) {
      localSelected.value = localSelected.value.slice().toSpliced(index, 1);
    } else {
      localSelected.value = localSelected.value.concat(id);
    }

    emitUpdate(localSelected.value);
  }

  function select(id: string | undefined, toggle: boolean): void {
    if (toggle) {
      toggleSelect(id);
      return;
    }
    localSelected.value = id ? [id] : [];

    emitUpdate(localSelected.value);
  }

  const click = (e: MapMouseEvent): void => {
    const map = e.target;
    const originalEvent = e.originalEvent;
    // Ignore duplicate clicks
    if (originalEvent.detail > 1) return;

    const keepExisting = originalEvent.metaKey || originalEvent.ctrlKey;

    for (let i = 0; i < 5; i += 1) {
      const neighbours = map.queryRenderedFeatures(surround(e.point, i), {
        layers: [MapSourceLayer.LINES, MapSourceLayer.SELECTED],
      });
      if (neighbours.length > 0) {
        select((neighbours[0].properties as MapProperties).id, keepExisting);
        return;
      }
    }
    select(undefined, keepExisting);
  };

  return { click };
};
