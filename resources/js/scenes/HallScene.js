// 宗门大厅 3D 场景（云海凌霄）
import * as THREE from 'three';
import { buildHallStoryGuide } from '../core/StoryState.js';

export class HallScene {
    constructor() {
        this.group = new THREE.Group();
        this.buildingMarkers = [];
        this.swords = [];
        this.lastSwordCount = 0;
        this.particles = [];
        this.clouds = [];
        this.time = 0;
        
        // 环境光照 (清晨/凌霄金光)
        this.ambientLight = new THREE.AmbientLight(0xfff0dd, 0.8);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffeedd, 1.5);
        this.dirLight.position.set(10, 20, 15);
        this.group.add(this.dirLight);

        // 中心法阵与剑阵组
        this.centerGroup = new THREE.Group();
        this.group.add(this.centerGroup);
        
        this.swordGroup = new THREE.Group();
        this.swordGroup.position.set(0, 2.5, 0); // 剑阵悬浮于中心
        this.centerGroup.add(this.swordGroup);

        this._lastGuideUpdate = 0;
        this.currentRecommendModule = 'reading';
    }

    build(scene, camera, renderer) {
        this.sceneRef = scene;
        this.cameraRef = camera;
        
        // 1. 无尽虚空与云海雾效 (白昼/晨曦风格)
        scene.background = new THREE.Color(0xd8e8ff);
        scene.fog = new THREE.FogExp2(0xd8e8ff, 0.02);

        // 2. 构建白玉悬空广场
        this.createJadePlaza();

        // 3. 构建翻滚的云海粒子
        this.createCloudSea();

        // 4. 构建中心太极法阵
        this.createCenterArray();

        // 5. 构建四周的四大模块入口 (水晶传送阵)
        this.createModulePortals();

        // 6. 空气中飘散的金辉微尘
        this.createDustParticles();

        // 初始化飞剑 (读取 store 或者默认 5 把)
        this.rebuildSwordArray(5);

        scene.add(this.group);
    }

    createJadePlaza() {
        // 白玉广场主体
        const geo = new THREE.CylinderGeometry(18, 16, 1.5, 64);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xf5f7fa, // 纯净的汉白玉色
            roughness: 0.15, // 比较光滑，有倒影
            metalness: 0.1
        });
        const plaza = new THREE.Mesh(geo, mat);
        plaza.position.y = -0.75;
        this.group.add(plaza);

        // 广场边缘的金色镶边
        const edgeGeo = new THREE.TorusGeometry(18, 0.15, 16, 100);
        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.2,
            metalness: 0.8
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.x = -Math.PI / 2;
        this.group.add(edge);
    }

    createCloudSea() {
        // 使用非常大的粒子模拟云海，位于广场下方
        const cloudGeo = new THREE.BufferGeometry();
        const numClouds = 600;
        const pos = new Float32Array(numClouds * 3);
        const sizes = new Float32Array(numClouds);
        
        for (let i = 0; i < numClouds; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 80;
            pos[i*3] = Math.cos(angle) * radius;
            pos[i*3+1] = -5 - Math.random() * 10; // 云海在脚底翻腾
            pos[i*3+2] = Math.sin(angle) * radius;
            sizes[i] = Math.random();
        }
        cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        cloudGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        // 简易的纯代码云朵 (白色软发光)
        const cloudMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 8,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.cloudPoints = new THREE.Points(cloudGeo, cloudMat);
        this.group.add(this.cloudPoints);
    }

    createCenterArray() {
        const outerGeo = new THREE.RingGeometry(6, 6.5, 64);
        const innerGeo = new THREE.RingGeometry(4.5, 4.8, 64);
        
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xffd700, 
            transparent: true, 
            opacity: 0.8, 
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.outerRing = new THREE.Mesh(outerGeo, mat);
        this.outerRing.rotation.x = -Math.PI / 2;
        this.outerRing.position.y = 0.02;

        this.innerRing = new THREE.Mesh(innerGeo, mat);
        this.innerRing.rotation.x = -Math.PI / 2;
        this.innerRing.position.y = 0.02;

        this.centerGroup.add(this.outerRing);
        this.centerGroup.add(this.innerRing);
    }

    createModulePortals() {
        // 四大模块的位置
        const portalConfigs = [
            { id: 'reading', label: '藏经阁', pos: [-8, 0, -6], color: 0x00e5ff },
            { id: 'practice', label: '练功房', pos: [8, 0, -6], color: 0x39ff14 },
            { id: 'shilianchang', label: '试炼场', pos: [-8, 0, 6], color: 0xff4757 },
            { id: 'mijing', label: '秘  境', pos: [8, 0, 6], color: 0xa29bfe }
        ];

        portalConfigs.forEach(cfg => {
            const portalGroup = new THREE.Group();
            portalGroup.position.set(cfg.pos[0], 2.5, cfg.pos[2]);

            // 1. 水晶方碑
            const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
            crystalGeo.scale(1, 2.5, 1);
            const crystalMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: cfg.color,
                emissiveIntensity: 0.5,
                roughness: 0.1,
                metalness: 0.8,
                transparent: true,
                opacity: 0.85
            });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            
            // 为水晶添加发光轮廓
            const edgesGeo = new THREE.EdgesGeometry(crystalGeo);
            const lineMat = new THREE.LineBasicMaterial({ 
                color: cfg.color,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.9
            });
            crystal.add(new THREE.LineSegments(edgesGeo, lineMat));
            portalGroup.add(crystal);

            // 2. 底部法阵
            const baseGeo = new THREE.RingGeometry(1.5, 2.0, 32);
            const baseMat = new THREE.MeshBasicMaterial({
                color: cfg.color,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const baseRing = new THREE.Mesh(baseGeo, baseMat);
            baseRing.rotation.x = -Math.PI / 2;
            baseRing.position.y = -2.48; // 贴近地面
            portalGroup.add(baseRing);

            // 3. 悬浮的 3D 中文招牌文字
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.font = 'bold 64px "Microsoft YaHei", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#' + cfg.color.toString(16).padStart(6, '0');
            ctx.shadowBlur = 15;
            ctx.fillText(cfg.label, 128, 64);

            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
            const labelSprite = new THREE.Sprite(spriteMat);
            labelSprite.scale.set(4, 2, 1);
            labelSprite.position.y = 4.0; // 悬浮在水晶上方
            portalGroup.add(labelSprite);

            // 记录到 buildingMarkers 供动画调度使用
            portalGroup.userData = { 
                id: cfg.id, 
                baseY: 2.5,
                crystal: crystal,
                baseRing: baseRing,
                defaultEmissive: cfg.color
            };
            this.group.add(portalGroup);
            this.buildingMarkers.push(portalGroup);
        });
    }

    createDustParticles() {
        const geo = new THREE.BufferGeometry();
        const numParticles = 400;
        const pos = new Float32Array(numParticles * 3);
        
        for (let i = 0; i < numParticles; i++) {
            pos[i*3] = (Math.random() - 0.5) * 40;
            pos[i*3+1] = Math.random() * 20; // 广场上方
            pos[i*3+2] = (Math.random() - 0.5) * 40;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        
        const mat = new THREE.PointsMaterial({
            color: 0xffeab5, // 晨星金光
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.dustPoints = new THREE.Points(geo, mat);
        this.group.add(this.dustPoints);
    }

    rebuildSwordArray(count) {
        while(this.swordGroup.children.length > 0){ 
            const child = this.swordGroup.children[0];
            this.swordGroup.remove(child);
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
        this.swords = [];

        // 重新构建精致的飞剑环绕阵
        const radius = 3.5;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            
            const swordGeo = new THREE.ConeGeometry(0.15, 2.0, 4);
            const swordMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9,
            });
            const sword = new THREE.Mesh(swordGeo, swordMat);
            
            // 剑气外发光
            const edgesGeo = new THREE.EdgesGeometry(swordGeo);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
            sword.add(new THREE.LineSegments(edgesGeo, lineMat));

            sword.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            sword.rotation.x = Math.PI; // 剑尖朝下
            sword.rotation.z = Math.PI / 12; // 微微向外倾斜
            sword.rotation.y = -angle;

            // 每把剑自带上下浮动相位
            sword.userData = { phaseOffset: i * 0.5 };

            this.swordGroup.add(sword);
            this.swords.push(sword);
        }
    }

    animate(time) {
        this.time = time;

        // 云海翻腾
        if (this.cloudPoints) {
            this.cloudPoints.rotation.y = time * 0.02;
            const pos = this.cloudPoints.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i);
                // 简单的波浪扰动
                y += Math.sin(time + pos.getX(i)) * 0.01;
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
        }

        // 金色微尘缓缓飘落/上升
        if (this.dustPoints) {
            this.dustPoints.rotation.y = time * 0.05;
            const pos = this.dustPoints.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i);
                y += Math.sin(time + i) * 0.01;
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
        }

        // 中心法阵旋转
        if (this.outerRing && this.innerRing) {
            this.outerRing.rotation.z = time * 0.2;
            this.innerRing.rotation.z = -time * 0.3;
        }

        // 剑阵公转与自转浮动
        if (this.swordGroup) {
            this.swordGroup.rotation.y = time * 0.3;
            this.swords.forEach(sword => {
                sword.position.y = Math.sin(time * 2.0 + sword.userData.phaseOffset) * 0.3;
            });
        }

        // 定期检测推荐模块更新（同步剧情任务）
        if (time - this._lastGuideUpdate > 1.0) {
            this._lastGuideUpdate = time;
            if (window.game?.store) {
                const storeState = window.game.store.getState();
                const storyProgress = storeState.story?.progress || {};
                const progressCurrency = storeState.story?.currencies || {};
                const guide = buildHallStoryGuide(storyProgress, progressCurrency);
                this.currentRecommendModule = guide.recommendedModule || 'reading';
                
                // 同步剑阵数量
                const user = window.game?.store?.getState()?.user || {};
                let vocab = user.vocabulary || user.profile?.vocabulary || 0;
                let stage = user.realm_stage || user.profile?.realm_stage || 1;
                let targetSwordCount = Math.min(18, Math.max(5, Math.floor(vocab / 20)));
                if (vocab === 0) targetSwordCount = Math.max(5, stage);

                if (this.lastSwordCount !== targetSwordCount && targetSwordCount > 0) {
                    this.lastSwordCount = targetSwordCount;
                    this.rebuildSwordArray(targetSwordCount);
                }
            }
        }

        // 水晶传送阵呼吸效果
        this.buildingMarkers.forEach(portal => {
            const isRecommended = portal.userData.id === this.currentRecommendModule;
            const crystal = portal.userData.crystal;
            const baseRing = portal.userData.baseRing;
            
            // 水晶自身旋转与浮动
            crystal.rotation.y = time * 0.5;
            portal.position.y = portal.userData.baseY + Math.sin(time * 2 + portal.userData.id.length) * 0.2;
            
            // 底部光环自转
            baseRing.rotation.z = time * 0.8;

            if (isRecommended) {
                // 推荐状态：剧烈呼吸，材质增亮，环变大
                const intensity = Math.sin(time * 4) * 0.5 + 0.5;
                crystal.material.emissiveIntensity = 1.0 + intensity;
                crystal.scale.set(1.2, 1.2, 1.2);
                baseRing.scale.set(1.5, 1.5, 1);
                baseRing.material.opacity = 0.8;
            } else {
                // 待机状态：平静
                crystal.material.emissiveIntensity = 0.5;
                crystal.scale.set(1.0, 1.0, 1.0);
                baseRing.scale.set(1.0, 1.0, 1);
                baseRing.material.opacity = 0.4;
            }
        });
    }

    destroy() {
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
        this.sceneRef = null;
        this.cameraRef = null;
    }
}
