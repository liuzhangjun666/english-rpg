import * as THREE from 'three';
import bgHall from '../../assets/images/bg_hall.png';
import clickRingGold from '../../assets/images/custom/click_ring_gold.png';
import { isLowPowerDevice, sceneFxProfiles } from './sceneConfig.js';
import { buildHallStoryGuide } from '../core/StoryState.js';

export class HallScene {
    build(scene, camera, renderer) {
        this.sceneRef = scene;
        this.cameraRef = camera;
        this.rendererRef = renderer;

        const loader = new THREE.TextureLoader();
        const effectTexture = loader.load(clickRingGold);
        effectTexture.colorSpace = THREE.SRGBColorSpace;

        loader.load(bgHall, (tex) => {
            if (!this.sceneRef) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            this.bgTexture = tex;
            this.sceneRef.background = tex;
            this.updateBackgroundTextureFit();
        });

        const ambient = new THREE.AmbientLight(0x4466aa, 0.55);
        scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.3);
        dirLight.position.set(8, 15, 10);
        scene.add(dirLight);
        const centerGlow = new THREE.PointLight(0xc9a846, 0.9, 20);
        centerGlow.position.set(0, 3, 0);
        scene.add(centerGlow);

        const lowPower = isLowPowerDevice();
        this.fxBudget = lowPower ? sceneFxProfiles.hall.low : sceneFxProfiles.hall.normal;

        const starCount = this.fxBudget.starCount;
        const starGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(starCount * 3);
        const col = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 30 + Math.random() * 50;
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = Math.abs(r * Math.cos(phi));
            pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
            const gold = Math.random() > 0.7;
            col[i * 3] = gold ? 0.85 : 0.3 + Math.random() * 0.3;
            col[i * 3 + 1] = gold ? 0.65 : 0.3 + Math.random() * 0.2;
            col[i * 3 + 2] = gold ? 0.35 : 0.4 + Math.random() * 0.3;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const stars = new THREE.Points(
            starGeo,
            new THREE.PointsMaterial({
                size: lowPower ? 0.14 : 0.18,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true,
            })
        );
        scene.add(stars);
        this.stars = stars;

        for (let layer = 0; layer < this.fxBudget.ringLayers; layer++) {
            const ringR = 5.8 + layer * 0.5;
            const ring = new THREE.Mesh(
                new THREE.PlaneGeometry((ringR + 0.15) * 2, (ringR + 0.15) * 2),
                new THREE.MeshBasicMaterial({
                    map: effectTexture,
                    color: layer === 0 ? 0xffe4a8 : 0xffd892,
                    transparent: true,
                    opacity: lowPower ? 0.2 : 0.2 + layer * 0.06,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.06 + layer * 0.02;
            ring.userData.spinSpeed = 0.001 + layer * 0.001;
            scene.add(ring);
        }

        const pillarPositions = [
            [-4, 0, -3.5],
            [4, 0, -3.5],
            [-4, 0, 3.5],
            [4, 0, 3.5],
        ];
        const colors = [0xffd486, 0xffe3a1, 0xffc56f, 0xffeec9];
        this.pillarGems = [];
        pillarPositions.slice(0, this.fxBudget.pillarGemCount).forEach(([x, _, z], i) => {
            const gem = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: effectTexture,
                    color: colors[i],
                    transparent: true,
                    opacity: this.fxBudget.baseOpacity,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            gem.position.set(x, 3.8, z);
            gem.scale.set(0.95, 0.95, 1);
            gem.userData = { floatSpeed: 0.8 + i * 0.2, floatOffset: i * 1.5 };
            scene.add(gem);
            this.pillarGems.push(gem);
        });

        // --- 核心：创建代表四大模块的 3D 建筑物高亮 Mesh ---
        this.buildingMarkers = [];
        const buildingModules = ['reading', 'practice', 'shilianchang', 'mijing'];
        // 沿用 pillarPositions 作为各大模块在 3D 场景中的轴向节点基础坐标
        pillarPositions.forEach(([x, y, z], i) => {
            const moduleId = buildingModules[i];
            const markerGeo = new THREE.SphereGeometry(1.5, 32, 32);
            const markerMat = new THREE.MeshStandardMaterial({
                color: 0xffd486,
                emissive: new THREE.Color(0xc9a846),
                emissiveIntensity: 0,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.position.set(x, 3.8, z); // 包裹在 pillarGem 附近
            marker.userData = { id: moduleId, baseY: 3.8 };
            marker.visible = false;
            scene.add(marker);
            this.buildingMarkers.push(marker);
        });
        this._lastGuideUpdate = 0;
        this.currentRecommendModule = 'reading';

        this.orbs = [];
        this.orbGlows = [];
        const orbColors = [0xffd68c, 0xffe6b5, 0xffc977, 0xffdb9f, 0xfff0d0, 0xffbf62];
        for (let i = 0; i < this.fxBudget.orbCount; i++) {
            const orb = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: effectTexture,
                    color: orbColors[i],
                    transparent: true,
                    opacity: this.fxBudget.baseOpacity,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            const angle = (i / this.fxBudget.orbCount) * Math.PI * 2;
            const radius = 3.2 + Math.random() * 0.8;
            orb.position.set(Math.cos(angle) * radius, 1.5 + Math.random(), Math.sin(angle) * radius);
            orb.scale.set(1.05, 1.05, 1);
            orb.userData = {
                angle,
                radius,
                baseY: orb.position.y,
                speed: 0.25 + Math.random() * 0.15,
                floatSpeed: 1.2 + Math.random() * 0.5,
                floatOffset: Math.random() * 100,
            };
            scene.add(orb);
            this.orbs.push(orb);

            const glow = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: effectTexture,
                    color: orbColors[i],
                    transparent: true,
                    opacity: lowPower ? 0.12 : 0.18,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            glow.position.copy(orb.position);
            glow.scale.set(this.fxBudget.glowScale, this.fxBudget.glowScale, 1);
            scene.add(glow);
            this.orbGlows.push(glow);
        }
    }

    animate(time) {
        if (this.stars) {
            this.stars.rotation.y += 0.0003;
            this.stars.rotation.x += 0.00012;
        }

        if (this.orbs) {
            this.orbs.forEach((orb, index) => {
                const d = orb.userData;
                const a = d.angle + time * d.speed;
                orb.position.x = Math.cos(a) * d.radius;
                orb.position.z = Math.sin(a) * d.radius;
                orb.position.y = d.baseY + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.4;
                const s = 1 + Math.sin(time * 2.5) * 0.12;
                orb.scale.set(s, s, s);
                const glow = this.orbGlows?.[index];
                if (glow) {
                    glow.position.copy(orb.position);
                    const gs = s * this.fxBudget.glowScale;
                    glow.scale.set(gs, gs, 1);
                }
            });
        }

        if (this.pillarGems) {
            this.pillarGems.forEach((gem) => {
                const d = gem.userData;
                gem.position.y = 3.8 + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.2;
            });
        }

        // 动态获取当前推荐场景模块并应用视觉高亮联动
        if (time - this._lastGuideUpdate > 1.0) { // 每秒更新一次，避免性能浪费
            this._lastGuideUpdate = time;
            if (window.game?.store) {
                const storeState = window.game.store.getState();
                const storyProgress = storeState.story?.progress || {};
                const progressCurrency = storeState.story?.currencies || {};
                const guide = buildHallStoryGuide(storyProgress, progressCurrency);
                this.currentRecommendModule = guide.recommendedModule || 'reading';
            }
        }

        if (this.buildingMarkers) {
            this.buildingMarkers.forEach((marker) => {
                if (marker.userData.id === this.currentRecommendModule) {
                    marker.visible = true;
                    // 呼吸灯高亮光晕效果：材质的 emissive / emissiveIntensity 随时间做正弦波动
                    // 也可以使用 marker.material.emissive.setScalar(Math.sin(time * 2) * 0.5 + 0.5) 
                    const intensity = Math.sin(time * 2.5) * 0.5 + 0.5;
                    marker.material.emissiveIntensity = intensity * 1.5;
                    marker.material.opacity = 0.2 + intensity * 0.6;
                    
                    // 增加轻微浮动
                    marker.position.y = marker.userData.baseY + Math.sin(time * 1.5) * 0.3;
                    
                    // 让内部包含的几何体微微缩放呼吸
                    const scale = 1 + intensity * 0.15;
                    marker.scale.set(scale, scale, scale);
                } else {
                    marker.visible = false;
                }
            });
        }
    }

    updateBackgroundTextureFit() {
        if (!this.sceneRef || !this.cameraRef) return;
        const tex = this.sceneRef.background;
        if (!tex?.isTexture) return;
        const image = tex.image;
        if (!image) return;
        const iw = image.videoWidth || image.naturalWidth || image.width || 1;
        const ih = image.videoHeight || image.naturalHeight || image.height || 1;
        if (!iw || !ih) return;

        const canvasAspect = this.cameraRef.aspect || (window.innerWidth / window.innerHeight);
        const imageAspect = iw / ih;
        const aspect = imageAspect / canvasAspect;

        tex.offset.x = aspect > 1 ? (1 - 1 / aspect) / 2 : 0;
        tex.repeat.x = aspect > 1 ? 1 / aspect : 1;
        tex.offset.y = aspect > 1 ? 0 : (1 - aspect) / 2;
        tex.repeat.y = aspect > 1 ? 1 : aspect;
        tex.needsUpdate = true;
    }

    onResize() {
        this.updateBackgroundTextureFit();
    }

    destroy() {
        if (this.bgTexture) {
            this.bgTexture.dispose();
            this.bgTexture = null;
        }
        if (this.sceneRef) this.sceneRef.background = null;
        this.sceneRef = null;
        this.cameraRef = null;
        this.rendererRef = null;
    }
}
