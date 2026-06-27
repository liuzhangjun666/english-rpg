import { ref, computed } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * 全局 GLB 资源缓存 + 进度追踪。
 *
 * - 同一路径的 GLB 只解码一次，调用方拿到缓存场景的克隆。
 * - 登录首屏预热（bootstrap）与宗门建筑预热（hall）分开，避免练功房登录后跳过大厅模型。
 */

/** 宗门地图 / 大厅 3D 场景所需的核心建筑 */
export const HALL_ESSENTIAL_ASSETS: string[] = [
  '/models/sectHall.glb',
  '/models/swordHall.glb',
  '/models/scriptureHall.glb',
  '/models/alchemyHall.glb',
  '/models/innerDemonHall.glb',
  '/models/beastGarden.glb',
  '/models/farm.glb',
  '/models/wanyaoTower.glb',
];

const BACKGROUND_ASSETS: string[] = [
  '/models/fuyan.glb',
  '/models/shucong.glb',
  '/models/liangting.glb',
  '/models/lingjing.glb',
  '/models/jianxiu.glb',
  '/models/xianmen.glb',
];

const LOAD_TIMEOUT_MS = 45_000;

const _glbCache = new Map<string, Promise<THREE.Group>>();
const _bytesPerPath = new Map<string, { loaded: number; total: number }>();
const _tick = ref(0);
/** 登录首屏 bootstrap 完成（legacy 游戏 + 当前路由必要资源），不等于宗门 GLB 已就绪 */
const _bootstrapDone = ref(false);
let _hallPreloadPromise: Promise<void> | null = null;

let _sharedDraco: DRACOLoader | null = null;
function getSharedDraco(): DRACOLoader {
  if (!_sharedDraco) {
    _sharedDraco = new DRACOLoader();
    _sharedDraco.setDecoderPath('/draco/gltf/');
  }
  return _sharedDraco;
}

function withLoadTimeout<T>(promise: Promise<T>, path: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`GLB load timeout: ${path}`));
    }, LOAD_TIMEOUT_MS);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

function registerProgressSlot(path: string) {
  if (!_bytesPerPath.has(path)) {
    _bytesPerPath.set(path, { loaded: 0, total: 1 });
  }
}

function isPathLoaded(path: string): boolean {
  const entry = _bytesPerPath.get(path);
  if (!entry) return false;
  if (entry.total > 0 && entry.loaded >= entry.total) return true;
  return entry.total === 1 && entry.loaded === 1;
}

/** 按首屏路由决定登录时是否同步预热宗门 GLB */
export function resolveEssentialAssetsForRoute(routePath: string): string[] {
  const path = String(routePath || '').trim();
  if (path === '/hall' || path.startsWith('/hall/')) {
    return HALL_ESSENTIAL_ASSETS;
  }
  return [];
}

/** 加载 GLB（带缓存）；返回克隆，可独立变换 */
export function loadGLB(path: string): Promise<THREE.Group> {
  let p = _glbCache.get(path);
  if (!p) {
    registerProgressSlot(path);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(getSharedDraco());
    p = new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          const entry = _bytesPerPath.get(path);
          if (entry && entry.total > 0) {
            entry.loaded = entry.total;
          } else {
            _bytesPerPath.set(path, { loaded: 1, total: 1 });
          }
          _tick.value++;
          resolve(gltf.scene);
        },
        (xhr) => {
          _bytesPerPath.set(path, {
            loaded: xhr.loaded || 0,
            total: xhr.total || 0,
          });
          _tick.value++;
        },
        (err) => {
          _bytesPerPath.set(path, { loaded: 1, total: 1 });
          _tick.value++;
          _glbCache.delete(path);
          reject(err);
        },
      );
    });
    _glbCache.set(path, p);
  }
  return p.then((scene) => scene.clone(true));
}

export const preloadProgress = computed(() => {
  void _tick.value;
  let loaded = 0;
  let total = 0;
  _bytesPerPath.forEach((v) => {
    loaded += v.loaded;
    total += v.total;
  });
  return total > 0 ? Math.min(1, loaded / total) : 0;
});

export const preloadCounts = computed(() => {
  void _tick.value;
  const total = _bytesPerPath.size;
  let done = 0;
  _bytesPerPath.forEach((v) => {
    if (v.total > 0 && v.loaded >= v.total) done += 1;
    else if (v.total === 1 && v.loaded === 1) done += 1;
  });
  return { done, total };
});

/** 宗门建筑加载进度（大厅 / 地图专用） */
export const hallPreloadProgress = computed(() => {
  void _tick.value;
  let loaded = 0;
  let total = 0;
  for (const path of HALL_ESSENTIAL_ASSETS) {
    const entry = _bytesPerPath.get(path);
    if (!entry) {
      total += 1;
      continue;
    }
    loaded += entry.loaded;
    total += entry.total > 0 ? entry.total : 1;
  }
  return total > 0 ? Math.min(1, loaded / total) : 0;
});

export const hallPreloadCounts = computed(() => {
  void _tick.value;
  let done = 0;
  for (const path of HALL_ESSENTIAL_ASSETS) {
    if (isPathLoaded(path)) done += 1;
  }
  return { done, total: HALL_ESSENTIAL_ASSETS.length };
});

export function areHallAssetsReady(): boolean {
  return HALL_ESSENTIAL_ASSETS.every((path) => isPathLoaded(path));
}

/** @deprecated 使用 bootstrapDone */
export const essentialDone = computed(() => _bootstrapDone.value);
export const bootstrapDone = computed(() => _bootstrapDone.value);

/**
 * 登录首屏预热：练功房不拉宗门 GLB；直接进 /hall 时同步拉取。
 */
export async function preloadEssentialsForRoute(routePath = '/practice'): Promise<void> {
  const assets = resolveEssentialAssetsForRoute(routePath);
  if (assets.length > 0) {
    await preloadHallEssentials();
  }
  _bootstrapDone.value = true;
  _tick.value++;
}

/** @deprecated */
export async function preloadEssentials(): Promise<void> {
  return preloadEssentialsForRoute('/hall');
}

/**
 * 进入宗门地图前必须调用：确保 7 座核心建筑 GLB 已下载并解码（可重复调用，幂等）。
 */
export async function preloadHallEssentials(): Promise<void> {
  if (areHallAssetsReady()) return;
  if (_hallPreloadPromise) return _hallPreloadPromise;

  _hallPreloadPromise = (async () => {
    HALL_ESSENTIAL_ASSETS.forEach(registerProgressSlot);
    _tick.value++;

    const results = await Promise.all(
      HALL_ESSENTIAL_ASSETS.map(async (path) => {
        try {
          await withLoadTimeout(loadGLB(path), path);
          return true;
        } catch (err) {
          console.warn('[assetPreloader] 宗门模型加载失败', path, err);
          return false;
        }
      }),
    );

    const ok = results.filter(Boolean).length;
    if (ok === 0) {
      console.error(
        '[assetPreloader] 宗门建筑全部加载失败，请确认服务器已部署 public/models 与 public/draco',
      );
    }

    setTimeout(() => {
      BACKGROUND_ASSETS.forEach((path) => {
        loadGLB(path).catch(() => {});
      });
    }, 400);
  })();

  try {
    await _hallPreloadPromise;
  } finally {
    _hallPreloadPromise = null;
  }
}

export function _resetForTest() {
  _glbCache.clear();
  _bytesPerPath.clear();
  _tick.value = 0;
  _bootstrapDone.value = false;
  _hallPreloadPromise = null;
}
