import { createHead } from '@unhead/vue';
import type { IControl, Map as MapboxMap } from 'mapbox-gl';
import type { RenderFunction } from 'vue';
import { createApp, defineComponent } from 'vue';

export class Control implements IControl {
  disposeCallbacks = new Map<MapboxMap, () => void>();

  constructor(private readonly component: () => RenderFunction) {}

  onAdd(map: MapboxMap): HTMLElement {
    const element = document.createElement('div');
    element.classList.add('mapboxgl-ctrl');
    element.classList.add('mapboxgl-ctrl-group');

    const controlApp = createApp(defineComponent(this.component)).use(createHead());

    controlApp.mount(element);
    this.disposeCallbacks.set(map, () => {
      controlApp.unmount();
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
