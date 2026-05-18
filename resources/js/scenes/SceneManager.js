import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;
        this.currentSceneName = null;
        this.currentSceneObj = null;
        this.currentSceneOptionsKey = '';
        this.isPaused = false;
        this.currentLoadId = 0;
        this._backgroundFitCacheKey = '';

        this.sceneLoaders = {
            hall: () => import('./HallScene.js').then((m) => m.HallScene),
            practice: () => import('./PracticeScene.js').then((m) => m.PracticeScene),
            grammar: () => import('./GrammarScene.js').then((m) => m.GrammarScene),
            shilianchang: () => import('./ShilianchangScene.js').then((m) => m.ShilianchangScene),
            mijing: () => import('./MijingScene.js').then((m) => m.MijingScene),
            cangjingge: () => import('./CangjinggeScene.js').then((m) => m.CangjinggeScene),
            initiation: () => import('./InitiationScene.js').then((m) => m.InitiationScene),
            breakthrough: () => import('./BreakthroughScene.js').then((m) => m.BreakthroughScene),
        };
    }

    init(container) {
        if (this.renderer) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 12);

        const lowPower =
            (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
            (navigator.deviceMemory && navigator.deviceMemory <= 4);

        this.renderer = new THREE.WebGLRenderer({
            antialias: !lowPower,
            alpha: false,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.5));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', (this._onResizeBound ??= () => this.onResize()));
        document.addEventListener(
            'visibilitychange',
            (this._onVisibilityChangeBound ??= () => {
                this.isPaused = document.hidden;
            })
        );
        this.animate();
    }

    async switchTo(name, options = {}) {
        if (!this.scene || !this.camera) return;
        if (!this.sceneLoaders[name]) return;
        const optionsKey = JSON.stringify(options || {});
        if (name === this.currentSceneName && optionsKey === this.currentSceneOptionsKey) return;

        this.currentSceneName = name;
        this.currentSceneOptionsKey = optionsKey;
        this.clearScene();

        const loadId = ++this.currentLoadId;
        try {
            const SceneClass = await this.sceneLoaders[name]();
            if (loadId !== this.currentLoadId) return;

            const sceneObj = new SceneClass();
            sceneObj.build(this.scene, this.camera, null, options);
            this.currentSceneObj = sceneObj;
        } catch (error) {
            console.error(`[SceneManager] Failed to load scene: ${name}`, error);
        }
    }

    clearScene() {
        if (!this.scene) return;
        const disposeMaterial = (material) => {
            if (!material) return;
            if (material.map) material.map.dispose();
            if (material.alphaMap) material.alphaMap.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.roughnessMap) material.roughnessMap.dispose();
            if (material.metalnessMap) material.metalnessMap.dispose();
            if (material.emissiveMap) material.emissiveMap.dispose();
            material.dispose?.();
        };
        const disposeObject = (obj) => {
            if (!obj) return;
            if (obj.geometry) obj.geometry.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => disposeMaterial(m));
            else disposeMaterial(obj.material);
        };

        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const child = this.scene.children[i];
            child.traverse((node) => disposeObject(node));
            this.scene.remove(child);
        }

        if (this.scene.background?.isTexture) {
            this.scene.background.dispose();
        }
        this.scene.background = null;
        this.currentSceneObj = null;
        this._backgroundFitCacheKey = '';
    }

    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;

        const time = Date.now() * 0.001;
        if (!this.isPaused) {
            this.fitBackgroundToViewport();
            if (this.currentSceneObj?.animate) this.currentSceneObj.animate(time);
            this.renderer.render(this.scene, this.camera);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this._backgroundFitCacheKey = '';
        this.fitBackgroundToViewport();
    }

    fitBackgroundToViewport() {
        const bg = this.scene?.background;
        if (!bg?.isTexture || !this.renderer) return;

        const image = bg.image;
        const imageW = image?.videoWidth || image?.naturalWidth || image?.width;
        const imageH = image?.videoHeight || image?.naturalHeight || image?.height;
        if (!imageW || !imageH) return;

        const size = this.renderer.getSize(new THREE.Vector2());
        const viewW = size.width;
        const viewH = size.height;
        if (!viewW || !viewH) return;

        const cacheKey = `${bg.uuid}:${imageW}x${imageH}:${viewW}x${viewH}`;
        if (cacheKey === this._backgroundFitCacheKey) return;
        this._backgroundFitCacheKey = cacheKey;

        const imageAspect = imageW / imageH;
        const viewAspect = viewW / viewH;

        bg.wrapS = THREE.ClampToEdgeWrapping;
        bg.wrapT = THREE.ClampToEdgeWrapping;
        bg.center.set(0.5, 0.5);
        bg.repeat.set(1, 1);
        bg.offset.set(0, 0);

        // Keep scene backgrounds visually natural on mobile: cover + centered crop.
        if (viewAspect > imageAspect) {
            const repeatY = imageAspect / viewAspect;
            bg.repeat.set(1, repeatY);
            bg.offset.set(0, (1 - repeatY) * 0.5);
        } else {
            const repeatX = viewAspect / imageAspect;
            bg.repeat.set(repeatX, 1);
            bg.offset.set((1 - repeatX) * 0.5, 0);
        }

        bg.needsUpdate = true;
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.animationId = null;

        this.clearScene();

        if (this._onResizeBound) window.removeEventListener('resize', this._onResizeBound);
        if (this._onVisibilityChangeBound) {
            document.removeEventListener('visibilitychange', this._onVisibilityChangeBound);
        }

        if (this.renderer) {
            this.renderer.domElement.remove();
            this.renderer.dispose();
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentSceneName = null;
        this.currentSceneOptionsKey = '';
    }
}
