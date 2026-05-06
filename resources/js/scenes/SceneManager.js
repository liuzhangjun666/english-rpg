// LevelUp 英语修仙 - 中央场景管理器（Spark 2.0 + Three.js r180）
// 3D 引擎：Spark 2.0（李飞飞 · World Labs 开源 3DGS 渲染引擎）
import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { HallScene } from './HallScene.js';
import { PracticeScene } from './PracticeScene.js';
import { ShilianchangScene } from './ShilianchangScene.js';
import { MijingScene } from './MijingScene.js';
import { CangjinggeScene } from './CangjinggeScene.js';
import { InitiationScene } from './InitiationScene.js';
import { BreakthroughScene } from './BreakthroughScene.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.spark = null;      // Spark 2.0 渲染器
        this.animationId = null;
        this.currentSceneName = null;
        this.currentSceneObj = null;

        this.scenes = {
            hall:         { cls: HallScene,         label: '宗门大厅' },
            practice:     { cls: PracticeScene,      label: '练功房' },
            shilianchang: { cls: ShilianchangScene,  label: '试炼场' },
            mijing:       { cls: MijingScene,        label: '秘境' },
            cangjingge:   { cls: CangjinggeScene,    label: '藏经阁' },
            initiation:   { cls: InitiationScene,    label: '收徒仪式' },
            breakthrough: { cls: BreakthroughScene,  label: '突破天象' },
        };
    }

    init(container) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 12);

        // Three.js WebGL2 渲染器（Spark 2.0 基于此构建）
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, alpha: false,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        container.appendChild(this.renderer.domElement);

        // Spark 2.0 渲染器 — 3DGS 高斯泼溅增强
        this.spark = new SparkRenderer({ renderer: this.renderer });
        this.scene.add(this.spark);

        window.addEventListener('resize', () => this.onResize());
        this.switchTo('hall');
        this.animate();
    }

    switchTo(name) {
        if (!this.scenes[name]) { console.warn(`场景 ${name} 不存在`); return; }
        if (name === this.currentSceneName) return;
        this.currentSceneName = name;
        this.clearScene();
        // 重新添加 Spark 渲染器到场景（clearScene 会移除）
        if (this.spark) this.scene.add(this.spark);
        const sceneObj = new this.scenes[name].cls();
        sceneObj.build(this.scene, this.camera, this.spark);
        this.currentSceneObj = sceneObj;
    }

    clearScene() {
        while (this.scene.children.length > 0) {
            const child = this.scene.children[0];
            // 保留 Spark 渲染器
            if (child === this.spark) { this.scene.children.shift(); continue; }
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            this.scene.remove(child);
        }
        this.scene.background = null;
        this.currentSceneObj = null;
    }

    animate() {
        const time = Date.now() * 0.001;
        if (this.currentSceneObj?.animate) this.currentSceneObj.animate(time);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.clearScene();
        if (this.renderer) { this.renderer.domElement.remove(); this.renderer.dispose(); }
    }
}
