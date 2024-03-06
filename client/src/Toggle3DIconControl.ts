import type { IControl, Map as MapboxMap } from 'mapbox-gl';
import { type Ref, watch } from 'vue';

export class Toggle3DIconControl implements IControl {
  constructor(private terrain: Ref<boolean>) {}

  disposeCallbacks = new Map<MapboxMap, () => void>();

  onAdd(map: MapboxMap): HTMLElement {
    const element = document.createElement('div');
    element.classList.add('mapboxgl-ctrl');
    element.classList.add('mapboxgl-ctrl-group');
    const button = document.createElement('button');
    button.addEventListener('click', () => {
      this.terrain.value = !this.terrain.value;
    });
    const unwatchTerrain = watch(
      this.terrain,
      (enabled) => {
        button.innerText = enabled ? '2D' : '3D';
      },
      { immediate: true },
    );
    element.append(button);
    this.disposeCallbacks.set(map, () => {
      unwatchTerrain();
    });
    return element;
  }
  onRemove(map: MapboxMap): void {
    this.disposeCallbacks.get(map)?.();
    this.disposeCallbacks.delete(map);
  }
  getDefaultPosition() {
    return 'top-right';
  }
}
