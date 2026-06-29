import type { Router } from 'vue-router';
import { useUiStore } from '../stores/ui';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import {
  preloadHallEssentials,
  hallPreloadProgress,
  areHallAssetsReady,
} from './assetPreloader';
import { preloadImages } from './imagePreloader';
import { getSceneBuildingImages } from '../composables/useMapBuildings';

const HALL_READY_EVENT = 'app:hall-ready';
const HALL_READY_TIMEOUT_MS = 90_000;

let hallSceneReady = false;
let hallReturnRunning = false;

export function beginHallMount() {
  hallSceneReady = false;
}

export function markHallReady() {
  hallSceneReady = true;
  window.dispatchEvent(new CustomEvent(HALL_READY_EVENT));
}

export function resetHallReady() {
  hallSceneReady = false;
}

export function isHallSceneReady() {
  return hallSceneReady;
}

function getHallUiAssets(): string[] {
  return Object.values(getSceneBuildingImages());
}

async function preloadHallReturnAssets(onProgress: (progress: number) => void): Promise<void> {
  const glbWeight = 0.85;
  const imgWeight = 0.15;

  const report = (glbProgress: number, imgProgress: number) => {
    onProgress(glbProgress * glbWeight + imgProgress * imgWeight);
  };

  if (!areHallAssetsReady()) {
    await preloadHallEssentials();
  }
  report(1, 0);

  await preloadImages(getHallUiAssets(), (done, total) => {
    const imgProgress = total > 0 ? done / total : 1;
    report(1, imgProgress);
  });
}

export function waitForHallReady(timeoutMs = HALL_READY_TIMEOUT_MS): Promise<void> {
  if (hallSceneReady) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const onEvent = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener(HALL_READY_EVENT, onEvent);
    };

    window.addEventListener(HALL_READY_EVENT, onEvent, { once: true });
  });
}

export type ReturnToHallOptions = {
  beforeNavigate?: () => void | Promise<void>;
  replace?: boolean;
  loadingText?: string;
};

/**
 * 从子功能返回宗门地图：展示加载动画，预热 GLB/图标，切换 legacy 场景，等待 HallView 3D 就绪后再收起遮罩。
 */
export async function returnToHall(
  router: Router,
  options: ReturnToHallOptions = {},
): Promise<void> {
  if (hallReturnRunning) return;

  const currentPath = router.currentRoute.value.path;
  if (currentPath === '/hall') {
    useUiStore().hideMapOverlay();
    return;
  }

  hallReturnRunning = true;
  const ui = useUiStore();
  const bridge = useLegacyBridge();
  const loadingText = options.loadingText ?? '返回宗门...';

  beginHallMount();
  ui.showLoading(loadingText);

  let progressTimer: number | null = null;

  try {
    await options.beforeNavigate?.();

    await bridge.closeLegacyPanels();
    ui.hideMapOverlay();

    progressTimer = window.setInterval(() => {
      if (!areHallAssetsReady()) {
        ui.setLoadingProgress(hallPreloadProgress.value * 0.85);
      }
    }, 100);

    await preloadHallReturnAssets((progress) => ui.setLoadingProgress(progress));

    await bridge.switchToHall();

    const readyWait = waitForHallReady();

    if (options.replace) {
      await router.replace('/hall');
    } else {
      await router.push('/hall');
    }

    await readyWait;
  } catch (err) {
    console.warn('[hallNavigation] 返回宗门失败', err);
  } finally {
    if (progressTimer !== null) window.clearInterval(progressTimer);
    ui.hideLoading();
    hallReturnRunning = false;
  }
}
