import { ref, computed } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * 全局 GLB 资源缓存 + 进度追踪。
 *
 * 设计：
 * - 同一路径的 GLB 只解码一次，所有调用方拿到的是 cached scene 的克隆（独立变换，互不影响）。
 * - 通过 GLTFLoader 的 onProgress 回调累计字节数，暴露 0-1 的全局进度供 LoadingSplash 订阅。
 * - 分两个池：essential（必须加载完才放行进游戏）+ background（地图渲染同时后台拉取）。
 *
 * 注意：浏览器 HTTP 缓存能避免重复下载，但 Three.js 的 BufferGeometry / DRACO 解码结果存在内存，
 * 刷新页面后必须重新解码——这正是 splash 真正在承载的耗时（不是下载，是 GPU 上传 + 解码）。
 */

const ESSENTIAL_ASSETS: string[] = [
  '/models/sectHall.glb',
  '/models/swordHall.glb',
  '/models/scriptureHall.glb',
  '/models/alchemyHall.glb',
  '/models/innerDemonHall.glb',
  '/models/beastGarden.glb',
  '/models/farm.glb',
];

const BACKGROUND_ASSETS: string[] = [
  '/models/fuyan.glb',
  '/models/shucong.glb',
  '/models/liangting.glb',
  '/models/lingjing.glb',
  '/models/jianxiu.glb',
  '/models/xianmen.glb',
];

const _glbCache = new Map<string, Promise<THREE.Group>>();
const _bytesPerPath = new Map<string, { loaded: number; total: number }>();
const _tick = ref(0);
const _essentialDone = ref(false);

// 共享 Draco 解码器：worker pool 复用，避免每次新建。
let _sharedDraco: DRACOLoader | null = null;
function getSharedDraco(): DRACOLoader {
  if (!_sharedDraco) {
    _sharedDraco = new DRACOLoader();
    _sharedDraco.setDecoderPath('/draco/gltf/');
  }
  return _sharedDraco;
}

/** 加载 GLB（带缓存）；返回的是缓存场景的克隆，可安全独立变换。 */
export function loadGLB(path: string): Promise<THREE.Group> {
  let p = _glbCache.get(path);
  if (!p) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(getSharedDraco());
    p = new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          // 加载完成时强制标 100%（onProgress 末次可能没触发或 total=0）
          const entry = _bytesPerPath.get(path);
          if (entry && entry.total > 0) {
            entry.loaded = entry.total;
          } else {
            // 没有 Content-Length 时用占位字节，让进度条仍能前进
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
          // 失败也标记完成，避免进度条卡在 99%
          _bytesPerPath.set(path, { loaded: 1, total: 1 });
          _tick.value++;
          reject(err);
        },
      );
    });
    _glbCache.set(path, p);
  }
  return p.then((scene) => scene.clone(true));
}

/** 0-1 的全局加载进度。仅统计已注册（开始加载过的）资源。 */
export const preloadProgress = computed(() => {
  void _tick.value; // 触发依赖
  let loaded = 0;
  let total = 0;
  _bytesPerPath.forEach((v) => {
    loaded += v.loaded;
    total += v.total;
  });
  return total > 0 ? Math.min(1, loaded / total) : 0;
});

/** 已加载数量 / 已知总数（供 UI 展示 "3/7" 这种文本） */
export const preloadCounts = computed(() => {
  void _tick.value;
  const total = _bytesPerPath.size;
  let done = 0;
  _bytesPerPath.forEach((v) => {
    if (v.total > 0 && v.loaded >= v.total) done += 1;
    else if (v.total === 1 && v.loaded === 1) done += 1; // 已完成的占位
  });
  return { done, total };
});

export const essentialDone = computed(() => _essentialDone.value);

/**
 * 加载所有核心资源（7 座宗门建筑）。返回的 Promise 在全部就绪后 resolve。
 * 单个资源失败不会阻塞整体；失败的会回落到 WorldSceneManager 内的几何占位。
 */
export async function preloadEssentials(): Promise<void> {
  // 预先在 _bytesPerPath 里登记一条占位，让进度条不会从 100% 倒退到部分
  ESSENTIAL_ASSETS.forEach((p) => {
    if (!_bytesPerPath.has(p)) _bytesPerPath.set(p, { loaded: 0, total: 1 });
  });
  _tick.value++;

  await Promise.all(
    ESSENTIAL_ASSETS.map((path) => loadGLB(path).catch(() => null)),
  );
  _essentialDone.value = true;

  // 核心就绪后稍等一拍，再后台拉取装饰资源——不阻塞游戏渲染
  setTimeout(() => {
    BACKGROUND_ASSETS.forEach((path) => {
      loadGLB(path).catch(() => {});
    });
  }, 800);
}

/** 测试 / 故障排查时清缓存用，正常流程不应调用 */
export function _resetForTest() {
  _glbCache.clear();
  _bytesPerPath.clear();
  _tick.value = 0;
  _essentialDone.value = false;
}
