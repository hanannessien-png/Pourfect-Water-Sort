import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * Web dev preview only (the shipped game is Android, where Skia is native and fully offline).
 * Skia on web needs CanvasKit's WebAssembly loaded before any module touches the Skia API,
 * so Expo Router is started only after it resolves. The .wasm comes from the CDN pinned to
 * the exact canvaskit-wasm version @shopify/react-native-skia depends on.
 */
const CANVASKIT_VERSION = '0.41.0';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Browsers without WebGL (some headless/VM setups) fall back to CanvasKit's CPU raster. */
function enableSoftwareFallback(): void {
  if (hasWebGL()) return;
  const ck = globalThis.CanvasKit;
  ck.MakeWebGLCanvasSurface = ((canvas: HTMLCanvasElement | string) => ck.MakeSWCanvasSurface(canvas)) as typeof ck.MakeWebGLCanvasSurface;
  // Offscreen surfaces (particle sprite atlas) use CPU surfaces when OffscreenCanvas is absent.
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = undefined;
}

LoadSkiaWeb({
  locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/${file}`,
})
  .then(() => {
    enableSoftwareFallback();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-router/entry');
  })
  .catch((e: unknown) => {
    console.error('Failed to load Skia for web', e);
  });
