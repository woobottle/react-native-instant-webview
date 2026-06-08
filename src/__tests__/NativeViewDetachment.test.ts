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
