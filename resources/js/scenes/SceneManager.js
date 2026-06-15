import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

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
        this._viewportSize = new THREE.Vector2();

        this.sceneLoaders = {
            hall: () => import('./HallScene.js').then((m) => m.HallScene),
            practice: () => import('./PracticeScene.js').then((m) => m.PracticeScene),
            grammar: () => import('./GrammarScene.js').then((m) => m.GrammarScene),
            shilianchang: () => import('./ShilianchangScene.js').then((m) => m.ShilianchangScene),
            mijing: () => import('./MijingSceneV2.js').then((m) => m.MijingScene),
            cangjingge: () => import('./CangjinggeScene.js').then((m) => m.CangjinggeScene),
            initiation: () => import('./InitiationScene.js').then((m) => m.InitiationScene),
            breakthrough: () => import('./BreakthroughScene.js').then((m) => m.BreakthroughScene),
            listening: () => import('./ListeningScene.js').then((m) => m.ListeningScene),
            speaking: () => import('./SpeakingScene.js').then((m) => m.SpeakingScene),
            writing: () => import('./WritingScene.js').then((m) => m.WritingScene),
        };
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus || null;
    }

    init(container) {
        if (this.renderer) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 8, 16);
        this.camera.lookAt(0, 0, 0);

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

        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 1.0,
            aperture: 0.025,
            maxblur: 0.0,
            width: window.innerWidth,
            height: window.innerHeight
        });
        this.composer.addPass(this.bokehPass);
        
        this.targetBlur = 0.0;
        this.currentBlur = 0.0;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2(-1, -1);
        container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        container.addEventListener('pointermove', (e) => this.onPointerMove(e));

        window.addEventListener('resize', (this._onResizeBound ??= () => this.onResize()));
        document.addEventListener(
            'visibilitychange',
            (this._onVisibilityChangeBound ??= () => {
                this.isPaused = document.hidden;
            })
        );
        
        this._bodyClassObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const hasModal = document.body.classList.contains('el-popup-parent--hidden');
                    this.setDepthOfField(hasModal);
                }
            });
        });
        this._bodyClassObserver.observe(document.body, { attributes: true });

        this.animate();
    }

    onPointerDown(event) {
        if (!this.camera || !this.scene || this.isPaused) return;
        
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        for (let i = 0; i < intersects.length; i++) {
            const obj = intersects[i].object;
            if (obj.userData && obj.userData.interactable) {
                // 原有 eventBus
                this.eventBus?.emit('scene:interact', {
                    object: obj,
                    action: obj.userData.action,
                    point: intersects[i].point,
                    sceneName: this.currentSceneName
                });
                
                // 新增全局 window 事件抛出，让 Vue 组件可以直接无缝监听
                window.dispatchEvent(new CustomEvent('scene:interact', {
                    detail: {
                        object: obj,
                        action: obj.userData.action,
                        point: intersects[i].point,
                        sceneName: this.currentSceneName
                    }
                }));

                break;
            }
        }
    }

    onPointerMove(event) {
        if (!this.camera || !this.scene || this.isPaused) return;
        
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // 重置所有可交互对象的 hover 状态
        this.scene.traverse((child) => {
            if (child.userData && child.userData.interactable) {
                child.userData.isHovered = false;
            }
        });
        
        // 设置第一个碰到的对象为 hover
        for (let i = 0; i < intersects.length; i++) {
            const obj = intersects[i].object;
            if (obj.userData && obj.userData.interactable) {
                obj.userData.isHovered = true;
                break;
            }
        }
    }

    setDepthOfField(enabled, focus = 1.0) {
        this.targetBlur = enabled ? 0.015 : 0.0;
        if (this.bokehPass) {
            this.bokehPass.uniforms['focus'].value = focus;
        }
    }

    async switchTo(name, options = {}) {
        if (!this.scene || !this.camera) return;
        if (!this.sceneLoaders[name]) return;
        const optionsKey = JSON.stringify(options || {});
        if (name === this.currentSceneName && optionsKey === this.currentSceneOptionsKey) return;

        const prevSceneName = this.currentSceneName;
        this.eventBus?.emit('scene:switch:start', { from: prevSceneName, to: name });

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
            this.fitBackgroundToViewport();
            this.eventBus?.emit('scene:switch:end', { from: prevSceneName, to: name });
        } catch (error) {
            console.error(`[SceneManager] Failed to load scene: ${name}`, error);
            this.eventBus?.emit('scene:switch:error', {
                from: prevSceneName,
                to: name,
                error,
            });
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
            if (this.currentSceneObj?.animate) this.currentSceneObj.animate(time);
            // Some scene backgrounds are loaded asynchronously. Re-try fit here so mobile
            // gets correct cover-crop once the image dimensions become available.
            this.fitBackgroundToViewport();
            
            if (this.bokehPass) {
                this.currentBlur += (this.targetBlur - this.currentBlur) * 0.1;
                this.bokehPass.uniforms['maxblur'].value = this.currentBlur;
                if (this.currentBlur > 0.001) {
                    this.composer.render();
                } else {
                    this.renderer.render(this.scene, this.camera);
                }
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
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

        const size = this.renderer.getSize(this._viewportSize);
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
        if (this._bodyClassObserver) {
            this._bodyClassObserver.disconnect();
            this._bodyClassObserver = null;
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
