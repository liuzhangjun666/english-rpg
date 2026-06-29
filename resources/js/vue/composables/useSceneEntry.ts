import { ref } from 'vue';
import { useUiStore } from '../stores/ui';
import { preloadImages } from '../services/imagePreloader';

/**
 * 子功能场景进入：先展示全局加载动画，预加载场景图片后再渲染页面内容。
 */
export function useSceneEntry() {
  const ui = useUiStore();
  const sceneReady = ref(false);

  async function runSceneEntry(options: {
    text: string;
    assets?: string[];
    bootstrap: () => Promise<void>;
  }): Promise<void> {
    sceneReady.value = false;
    ui.showLoading(options.text);

    try {
      const assets = options.assets ?? [];
      if (assets.length > 0) {
        await preloadImages(assets, (done, total) => {
          if (total > 0) ui.setLoadingProgress(done / total);
        });
      }
      await options.bootstrap();
      sceneReady.value = true;
    } catch (err) {
      sceneReady.value = true;
      throw err;
    } finally {
      ui.hideLoading();
    }
  }

  return { sceneReady, runSceneEntry };
}
