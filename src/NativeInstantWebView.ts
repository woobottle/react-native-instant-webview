import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  detachView(tag: number): void;
  attachView(tag: number, parentTag: number): void;
}

export default TurboModuleRegistry.get<Spec>('InstantWebView');
