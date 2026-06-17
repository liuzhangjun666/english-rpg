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
        
        // 环境光照
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
        this.dirLight.position.set(10, 20, 15);
        this.group.add(this.dirLight);

        // 中心法阵与剑阵组 (剑阵在聚灵阵(z=3)上方)
        this.centerGroup = new THREE.Group();
        this.group.add(this.centerGroup);
        
        this.swordGroup = new THREE.Group();
        this.swordGroup.position.set(0, 2.5, 3);
        this.centerGroup.add(this.swordGroup);

        this._lastGuideUpdate = 0;
        this.currentRecommendModule = 'reading';

        // 视差交互状态
        this.targetLookAt = new THREE.Vector3(0, 0, 1);
        this.currentLookAt = new THREE.Vector3(0, 0, 1);
        this.targetHeight = 11;
        this.currentHeight = 11;

        this.isDragging = false;
        this.previousPointer = { x: 0, y: 0 };
        this.domElement = null;

        // 投影节点
        this.buildingNodes = [];
        this._onPointerDownBound = null;
        this._onPointerMoveBound = null;
        this._onPointerUpBound = null;
        this._onWheelBound = null;
    }

    build(scene, camera, renderer) {
        this.sceneRef = scene;
        this.cameraRef = camera;
        // 规避 SceneManager 传入 renderer 为 null 的问题，直接从 DOM 中寻找大厅的 canvas
        this.domElement = document.querySelector('.hall-scene canvas') || document.querySelector('canvas');
        if (this.domElement) {
            this.domElement.style.cursor = 'grab';
        }
        
        // 1. 背景恢复为深蓝紫色，提供大地图边缘外的自然过渡
        scene.background = new THREE.Color(0x0c0f24);
        scene.fog = new THREE.FogExp2(0x0c0f24, 0.012); 

        // 2. 载入 3D 实体大地图平面
        const textureLoader = new THREE.TextureLoader();
        const bgTexture = textureLoader.load('/images/bg_hall_map.png');
        bgTexture.colorSpace = THREE.SRGBColorSpace;
        
        const mapW = 50;
        const mapH = 28.125;
        const mapGeo = new THREE.PlaneGeometry(mapW, mapH);
        const mapMat = new THREE.MeshBasicMaterial({
            map: bgTexture,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });
        const mapMesh = new THREE.Mesh(mapGeo, mapMat);
        mapMesh.rotation.x = -Math.PI / 2;
        mapMesh.position.set(0, -0.05, 0);
        this.group.add(mapMesh);

        // 3. 构建 3D 节点投影坐标映射 (根据 Vue 原生百分比映射到 3D 平面)
        const nodeConfigs = [
            { key: 'exam', pctX: 0.5, pctY: 0.15 },
            { key: 'demons', pctX: 0.5, pctY: 0.38 },
            { key: 'practice', pctX: 0.5, pctY: 0.60 },
            { key: 'profile', pctX: 0.5, pctY: 0.85 },
            { key: 'reading', pctX: 0.3, pctY: 0.55 },
            { key: 'practice-grammar', pctX: 0.3, pctY: 0.68 },
            { key: 'practice-listening', pctX: 0.3, pctY: 0.81 },
            { key: 'practice-speaking', pctX: 0.7, pctY: 0.55 },
            { key: 'practice-writing', pctX: 0.7, pctY: 0.68 },
            { key: 'achievements', pctX: 0.15, pctY: 0.85 },
            { key: 'zhenmo', pctX: 0.85, pctY: 0.85 },
            { key: 'mijing', pctX: 0.85, pctY: 0.30 },
            { key: 'mall', pctX: 0.15, pctY: 0.30 },
            { key: 'leaderboard', pctX: 0.15, pctY: 0.15 }
        ];
        this.buildingNodes = nodeConfigs.map(cfg => ({
            key: cfg.key,
            worldPos: new THREE.Vector3(
                (cfg.pctX - 0.5) * mapW,
                0,
                (cfg.pctY - 0.5) * mapH
            )
        }));

        // 4. 构建中心太极法阵 (移至聚灵阵上方 z=3)
        this.createCenterArray();
        if (this.outerRing && this.innerRing) {
            this.outerRing.position.set(0, 0.05, 3);
            this.innerRing.position.set(0, 0.05, 3);
        }

        // 5. 空气中飘散的金辉微尘
        this.createDustParticles();

        // 6. 初始化飞剑
        this.rebuildSwordArray(5);

        // 7. 绑定拖拽平移与滚轮缩放事件
        this.bindEvents();

        scene.add(this.group);
    }

    createJadePlaza() {
        // 白玉广场主体
        const geo = new THREE.CylinderGeometry(18, 16, 1.5, 64);
        
        // 加载太极八卦贴图
        const textureLoader = new THREE.TextureLoader();
        const topTexture = textureLoader.load('/images/textures/bagua_base.png');
        topTexture.colorSpace = THREE.SRGBColorSpace;
        
        const sideMat = new THREE.MeshStandardMaterial({
            color: 0xf5f7fa, // 纯净的汉白玉色
            roughness: 0.15, // 比较光滑，有倒影
            metalness: 0.1,
            transparent: true,
            opacity: 0.1
        });
        
        const topMat = new THREE.MeshStandardMaterial({
            map: topTexture,
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1,
            transparent: true,
            opacity: 0.05, // 彻底弱化为透明大阵背景
            blending: THREE.AdditiveBlending // 增加发光感，类似灵气阵法
        });
        
        // CylinderGeometry 材质顺序: [侧面, 顶面, 底面]
        const materials = [sideMat, topMat, sideMat];

        const plaza = new THREE.Mesh(geo, materials);
        plaza.position.y = -0.75;
        plaza.rotation.y = Math.PI / 2; // 微调方向让八卦图正对镜头
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
            opacity: 0.1, // 减弱金环的亮度
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
        const portalConfigs = [];

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

    createProceduralSword() {
        const group = new THREE.Group();
        
        // 剑身 (发光冷色调冰蓝剑刃)
        const bladeGeo = new THREE.ConeGeometry(0.15, 2.5, 4);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xe0f7fa,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x0088ff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.95
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.scale.set(1, 1, 0.15); // 将 4 棱锥压扁变成剑刃
        blade.position.y = 1.25;

        // 剑刃的外发光线框
        const edgesGeo = new THREE.EdgesGeometry(bladeGeo);
        const lineMat = new THREE.LineBasicMaterial({ 
            color: 0x00e5ff, 
            transparent: true, 
            opacity: 0.8, 
            blending: THREE.AdditiveBlending 
        });
        const bladeOutline = new THREE.LineSegments(edgesGeo, lineMat);
        blade.add(bladeOutline);

        // 剑格 (金色的护手 Guard)
        const guardGeo = new THREE.BoxGeometry(0.8, 0.15, 0.2);
        const guardMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, 
            metalness: 0.9, 
            roughness: 0.3 
        });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0;

        // 剑柄 (深色 Hilt)
        const hiltGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.6, 8);
        const hiltMat = new THREE.MeshStandardMaterial({ 
            color: 0x2c3e50, 
            metalness: 0.3, 
            roughness: 0.7 
        });
        const hilt = new THREE.Mesh(hiltGeo, hiltMat);
        hilt.position.y = -0.3;

        // 剑首 (金色的底部圆球 Pommel)
        const pommelGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const pommel = new THREE.Mesh(pommelGeo, guardMat);
        pommel.position.y = -0.65;

        group.add(blade);
        group.add(guard);
        group.add(hilt);
        group.add(pommel);

        return group;
    }

    rebuildSwordArray(count) {
        while(this.swordGroup.children.length > 0){ 
            const child = this.swordGroup.children[0];
            this.swordGroup.remove(child);
            // 只有当材质和几何体没有复用时才销毁
            // 这里修改为外部共享，所以不再在此处 dispose geometry 和 material，
            // 或者我们可以判断是否是共享的。简单起见，既然改为共享了，旧的逻辑可能会报错，
            // 但因为每次调用 rebuildSwordArray 前我们都是清空重建，
            // 我们可以直接让 SceneManager 在 clearScene 时统一清理。
            // 为了安全起见，这里不再手动 dispose child.geometry，因为它们是共享的。
        }
        this.swords = [];

        // 重新构建精致的飞剑环绕阵
        const radius = 3.5;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            
            const sword = this.createProceduralSword();

            sword.position.set(Math.cos(angle) * radius, 1.5, Math.sin(angle) * radius);
            sword.rotation.x = Math.PI; // 剑尖朝下
            sword.rotation.z = Math.PI / 12; // 微微向外倾斜
            sword.rotation.y = -angle; // 剑刃的宽面正对圆心

            // 每把剑自带上下浮动相位
            sword.userData = { phaseOffset: i * 0.5 };

            this.swordGroup.add(sword);
            this.swords.push(sword);
        }
    }

    bindEvents() {
        this._onPointerDownBound = (e) => this.onPointerDown(e);
        this._onPointerMoveBound = (e) => this.onPointerMove(e);
        this._onPointerUpBound = (e) => this.onPointerUp(e);
        this._onWheelBound = (e) => this.onWheel(e);

        // 绑定 pointerdown 到全局 window，防止上层 z-index 较高的透明层拦截点击穿透
        window.addEventListener('pointerdown', this._onPointerDownBound);
        window.addEventListener('pointermove', this._onPointerMoveBound);
        window.addEventListener('pointerup', this._onPointerUpBound);
        if (this.domElement) {
            this.domElement.addEventListener('wheel', this._onWheelBound, { passive: true });
        }
    }

    unbindEvents() {
        window.removeEventListener('pointerdown', this._onPointerDownBound);
        window.removeEventListener('pointermove', this._onPointerMoveBound);
        window.removeEventListener('pointerup', this._onPointerUpBound);
        if (this.domElement) {
            this.domElement.removeEventListener('wheel', this._onWheelBound);
        }
    }

    onPointerDown(e) {
        if (e.button !== 0) return; // 仅限左键
        
        // 过滤点击大厅弹窗、按钮、每日任务、地标卡片本身，避免打扰正常 UI 操作
        const target = e.target;
        if (target.closest('button') || target.closest('.map-building') || target.closest('.el-dialog') || target.closest('.el-overlay') || target.closest('.daily-quest-fab')) {
            return;
        }

        this.isDragging = true;
        this.previousPointer.x = e.clientX;
        this.previousPointer.y = e.clientY;
        if (this.domElement) {
            this.domElement.style.cursor = 'grabbing';
        }
    }

    onPointerMove(e) {
        if (!this.isDragging) return;
        const deltaX = e.clientX - this.previousPointer.x;
        const deltaY = e.clientY - this.previousPointer.y;
        this.previousPointer.x = e.clientX;
        this.previousPointer.y = e.clientY;

        // 拖拽灵敏度随相机高度自适应
        const factor = 0.0015 * this.currentHeight;
        this.targetLookAt.x -= deltaX * factor;
        this.targetLookAt.z -= deltaY * factor;

        // 限制拖拽边界以防飞出地图
        this.targetLookAt.x = Math.max(-15, Math.min(15, this.targetLookAt.x));
        this.targetLookAt.z = Math.max(-10, Math.min(10, this.targetLookAt.z));
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (this.domElement) {
            this.domElement.style.cursor = 'grab';
        }
    }

    onWheel(e) {
        // 缩放相机高度 (6 ~ 20)
        this.targetHeight += e.deltaY * 0.008;
        this.targetHeight = Math.max(7, Math.min(18, this.targetHeight));
    }

    animate(time) {
        this.time = time;

        // 1. 相机视点与缩放高度的物理 Lerp 平滑更新
        if (this.cameraRef) {
            this.currentLookAt.lerp(this.targetLookAt, 0.15);
            this.currentHeight += (this.targetHeight - this.currentHeight) * 0.15;

            this.cameraRef.position.x = this.currentLookAt.x;
            this.cameraRef.position.y = this.currentLookAt.y + this.currentHeight;
            // 倾斜仰角保持 y 与 z 偏置比例 1.6 倍
            this.cameraRef.position.z = this.currentLookAt.z + this.currentHeight * 1.6;
            this.cameraRef.lookAt(this.currentLookAt);
        }

        // 2. 投影计算 3D 节点到 2D 坐标 (一秒 60 次实时通知 Vue)
        if (this.cameraRef && this.buildingNodes.length > 0) {
            // 克隆相机并将其 aspect ratio 固定设为 16:9，使投影映射完全对齐 Vue 的等比例缩放容器
            const projCamera = this.cameraRef.clone();
            projCamera.aspect = 16 / 9;
            projCamera.updateProjectionMatrix();

            const tempV = new THREE.Vector3();
            const coordsMap = {};
            this.buildingNodes.forEach(node => {
                tempV.copy(node.worldPos);
                tempV.project(projCamera);

                const inFront = tempV.z <= 1;
                const pctX = (tempV.x * 0.5 + 0.5) * 100;
                const pctY = (-tempV.y * 0.5 + 0.5) * 100;

                coordsMap[node.key] = {
                    x: `${pctX.toFixed(2)}%`,
                    y: `${pctY.toFixed(2)}%`,
                    visible: inFront && pctX >= -10 && pctX <= 110 && pctY >= -10 && pctY <= 110
                };
            });

            if (window.updateHallCoords) {
                window.updateHallCoords(coordsMap);
            }
        }

        // 金色微尘缓缓飘落
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

        // 中心法阵旋转 (作为飞剑的起飞法阵)
        if (this.outerRing && this.innerRing) {
            this.outerRing.rotation.z = time * 0.2;
            this.innerRing.rotation.z = -time * 0.3;
        }

        // 飞剑公转自转 (以聚灵阵为中心)
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
                this.currentRecommendModule = guide.recommendedModule || 'shilianchang';
                
                // 同步飞剑数量
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
    }

    destroy() {
        this.unbindEvents();
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
        this.sceneRef = null;
        this.cameraRef = null;
        this.domElement = null;
    }
}
