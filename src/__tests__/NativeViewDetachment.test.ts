import { isNewArchitecture } from '../native/NativeViewDetachment';

describe('isNewArchitecture', () => {
  const g = global as {
    RN$Bridgeless?: boolean;
    nativeFabricUIManager?: unknown;
  };
  const origBridgeless = g.RN$Bridgeless;
  const origFabric = g.nativeFabricUIManager;

  afterEach(() => {
    g.RN$Bridgeless = origBridgeless;
    g.nativeFabricUIManager = origFabric;
  });

  it('returns false on the legacy architecture', () => {
    g.RN$Bridgeless = false;
    delete g.nativeFabricUIManager;
    expect(isNewArchitecture()).toBe(false);
  });

  it('returns true under bridgeless mode', () => {
    g.RN$Bridgeless = true;
    delete g.nativeFabricUIManager;
    expect(isNewArchitecture()).toBe(true);
  });

  it('returns true when the Fabric UI manager is installed', () => {
    g.RN$Bridgeless = false;
    g.nativeFabricUIManager = {};
    expect(isNewArchitecture()).toBe(true);
  });
});

describe('hasNativeModule (platform-aware new-arch gate)', () => {
  const g = global as { RN$Bridgeless?: boolean; nativeFabricUIManager?: unknown };
  const orig = { b: g.RN$Bridgeless, f: g.nativeFabricUIManager };

  afterEach(() => {
    g.RN$Bridgeless = orig.b;
    g.nativeFabricUIManager = orig.f;
    jest.resetModules();
    jest.dontMock('react-native');
  });

  function loadWith(os: 'ios' | 'android', bridgeless: boolean): boolean {
    let result = false;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        NativeModules: { InstantWebView: {} },
        findNodeHandle: () => 1,
        Platform: { OS: os },
      }));
      g.RN$Bridgeless = bridgeless;
      delete g.nativeFabricUIManager;
      result = require('../native/NativeViewDetachment').hasNativeModule;
    });
    return result;
  }

  it('enables native on iOS under the new architecture', () => {
    expect(loadWith('ios', true)).toBe(true);
  });

  it('disables native on Android under the new architecture', () => {
    expect(loadWith('android', true)).toBe(false);
  });

  it('enables native on both platforms on the legacy architecture', () => {
    expect(loadWith('ios', false)).toBe(true);
    expect(loadWith('android', false)).toBe(true);
  });
});
