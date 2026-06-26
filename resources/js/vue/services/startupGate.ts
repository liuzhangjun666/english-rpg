import { ref } from 'vue';

const essentialsReady = ref(false);
const sceneReady = ref(false);
let requiresSceneReady = false;

/** 登录后根据目标路由决定 splash 是否要等 3D 场景首帧 */
export function configureStartupGate(routePath: string) {
  requiresSceneReady = routePath === '/hall';
  sceneReady.value = !requiresSceneReady;
}

export function markEssentialsReady() {
  essentialsReady.value = true;
}

export function markSceneReady() {
  sceneReady.value = true;
}

export function canDismissSplash() {
  return essentialsReady.value && sceneReady.value;
}

export function resetStartupGate() {
  essentialsReady.value = false;
  sceneReady.value = false;
  requiresSceneReady = false;
}
