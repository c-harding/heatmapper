import { type InjectionKey, type MaybeRef, type Ref } from 'vue';

export interface StickyHeaderValues {
  height: Readonly<Ref<number>>;
  heightPx: Readonly<Ref<string>>;
}
export interface StickyHeader extends StickyHeaderValues {
  registerHeader(height: MaybeRef<number>, debugLabel?: string): void;
}

export const stickyHeaderToken: InjectionKey<StickyHeader> = Symbol('StickyHeader');
