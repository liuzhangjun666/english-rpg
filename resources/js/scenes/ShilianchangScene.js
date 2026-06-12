// 试炼场 3D 场景（渡劫检测 - 九天雷劫 / 登仙祭坛）
import * as THREE from 'three';

export class ShilianchangScene {
    constructor() {
        this.group = new THREE.Group();
        this.debrisList = [];
        this.orbs = [];
        this.lightningBolts = [];
        this.timeouts = new Set();
        this.tempEffects = new Set();
        this.time = 0;
        this.nextLightningTime = 0;

        // 劫云血色环境光
        this.ambientLight = new THREE.AmbientLight(0x2a0808, 1.5);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xff4444, 1.0);
        this.dirLight.position.set(5, 20, -5);
        this.group.add(this.dirLight);
    }

    build(scene) {
        this.sceneRef = scene;

        // 1. 深渊雷云背景
        scene.background = new THREE.Color(0x0a0202);
        scene.fog = new THREE.FogExp2(0x0a0202, 0.025);

        // 2. 登仙黑石祭坛
        this.createAltar();

        // 3. 悬浮的远古残骸
        this.createDebris();

        // 4. 雷云粒子
        this.createStormClouds();

        // 5. 环绕的灵气球 (保留原版机制，优化视觉)
        this.createSpiritOrbs();

        scene.add(this.group);
    }

    createAltar() {
        this.altarGroup = new THREE.Group();
        this.altarGroup.position.y = -2.0;

        // 主祭坛黑石盘
        const baseGeo = new THREE.CylinderGeometry(4.5, 5.0, 0.8, 8); // 八卦形基座
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.9,
            metalness: 0.2
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        this.altarGroup.add(base);

        // 祭坛血色裂纹发光边
        const edgesGeo = new THREE.EdgesGeometry(baseGeo);
        const edgesMat = new THREE.LineBasicMaterial({
            color: 0xff1111,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const edges = new THREE.LineSegments(edgesGeo, edgesMat);
        this.altarGroup.add(edges);

        // 内侧阵法环
        const ringGeo = new THREE.RingGeometry(3.0, 3.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.magicRing = new THREE.Mesh(ringGeo, ringMat);
        this.magicRing.rotation.x = -Math.PI / 2;
        this.magicRing.position.y = 0.42;
        this.altarGroup.add(this.magicRing);

        this.group.add(this.altarGroup);
    }

    createDebris() {
        const numDebris = 25;
        const debrisGeo = new THREE.DodecahedronGeometry(1.0, 0); // 不规则陨石块
        
        for (let i = 0; i < numDebris; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.8,
                metalness: 0.5
            });

            const mesh = new THREE.Mesh(debrisGeo, mat);
            
            // 随机分布在祭坛外围
            const angle = Math.random() * Math.PI * 2;
            const radius = 6 + Math.random() * 15;
            const y = -8 + Math.random() * 16;
            mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            
            const scale = 0.2 + Math.random() * 0.8;
            mesh.scale.set(scale, scale * (0.5 + Math.random()), scale);
            
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            mesh.userData = {
                baseY: y,
                floatSpeed: 0.5 + Math.random() * 1.5,
                floatOffset: Math.random() * Math.PI * 2,
                rotSpeedX: (Math.random() - 0.5) * 0.02,
                rotSpeedY: (Math.random() - 0.5) * 0.02
            };

            this.group.add(mesh);
            this.debrisList.push(mesh);
        }
    }

    createStormClouds() {
        const cloudGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(800 * 3);
        const sizes = new Float32Array(800);

        for (let i = 0; i < 800; i++) {
            pos[i*3] = (Math.random() - 0.5) * 60;
            pos[i*3+1] = 12 + Math.random() * 10; // 聚集在高空
            pos[i*3+2] = (Math.random() - 0.5) * 60;
            sizes[i] = Math.random();
        }

        cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        cloudGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0x330000) } // 暗红劫云
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (35.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.1, dist);
                    gl_FragColor = vec4(color, alpha * 0.5);
                }
            `,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false
        };

        this.stormCloud = new THREE.Points(cloudGeo, new THREE.ShaderMaterial(shader));
        this.group.add(this.stormCloud);
    }

    createSpiritOrbs() {
        const colors = [0xd4af37, 0x4a90d9, 0x4ec07a, 0x9b59b6];
        const sharedOrbGeo = new THREE.SphereGeometry(1.0, 16, 16);
        const sharedGlowGeo = new THREE.SphereGeometry(1.0, 16, 16);
        
        const orbMats = colors.map(c => new THREE.MeshBasicMaterial({
            color: c,
            transparent: true, 
            opacity: 0.8
        }));
        
        const glowMats = colors.map(c => new THREE.MeshBasicMaterial({
            color: c,
            transparent: true, 
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));

        for (let i = 0; i < 12; i++) {
            const radius = 0.2 + Math.random()*0.1;
            
            // 核心发光体
            const orb = new THREE.Mesh(sharedOrbGeo, orbMats[i % 4]);
            orb.scale.setScalar(radius);

            // 外围光晕
            const glow = new THREE.Mesh(sharedGlowGeo, glowMats[i % 4]);
            const glowScale = 0.35 / radius;
            glow.scale.setScalar(glowScale);
            orb.add(glow);

            const angle = (i/12) * Math.PI * 2 + Math.random() * 0.3;
            const rad = 2.5 + Math.random() * 2.0;
            const baseY = -1.0 + Math.random() * 4.0;
            
            orb.position.set(Math.cos(angle)*rad, baseY, Math.sin(angle)*rad - 2);
            orb.userData = { 
                angle: angle, 
                rad: rad, 
                baseY: baseY,
                speed: 0.3 + Math.random()*0.4, 
                floatOff: Math.random()*Math.PI*2 
            };
            
            this.group.add(orb);
            this.orbs.push(orb);
        }
    }

    spawnLightning() {
        // 创建一条折线雷电
        const points = [];
        let startX = (Math.random() - 0.5) * 20;
        let startZ = (Math.random() - 0.5) * 20 - 5;
        let currentPoint = new THREE.Vector3(startX, 15, startZ);
        points.push(currentPoint);

        const segments = 6 + Math.floor(Math.random() * 6);
        for(let i=0; i<segments; i++) {
            currentPoint = currentPoint.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                - (15 / segments) - Math.random() * 2,
                (Math.random() - 0.5) * 4
            ));
            points.push(currentPoint);
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xaaaaff,
            linewidth: 2,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const bolt = new THREE.Line(geo, mat);
        bolt.userData = { bornAt: performance.now(), ttl: 150 + Math.random() * 200 };
        this.group.add(bolt);
        this.lightningBolts.push(bolt);

        // 伴随一次全场景闪烁
        this.ambientLight.color.setHex(0x5555ff);
        this.ambientLight.intensity = 3.0;
        
        setTimeout(() => {
            this.ambientLight.color.setHex(0x2a0808);
            this.ambientLight.intensity = 1.5;
        }, 100);
    }

    /** 天道降临评级特效 */
    showGradeEffect(grade, scene = this.sceneRef) {
        if (!scene) return;
        
        const gradeColors = { 
            S: 0xffd700, // 纯金
            A: 0x9b59b6, // 紫极
            B: 0x3498db, // 湛蓝
            C: 0x2ecc71, // 碧绿
            D: 0xe74c3c  // 猩红
        };
        const colorHex = gradeColors[grade] || 0x95a5a6;

        // 1. 降临神柱 (天道光柱)
        const beamGroup = new THREE.Group();
        
        const coreBeam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 30, 32, 1, true),
            new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.9, 
                side: THREE.DoubleSide, 
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        beamGroup.add(coreBeam);

        const outerBeam = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 30, 32, 1, true),
            new THREE.MeshBasicMaterial({ 
                color: colorHex, 
                transparent: true, 
                opacity: 0.4, 
                side: THREE.DoubleSide, 
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        beamGroup.add(outerBeam);

        beamGroup.position.set(0, 5, -2);
        
        // 神柱动画属性
        beamGroup.scale.set(0.1, 1, 0.1);
        beamGroup.userData = { phase: 'expand', tick: 0 };
        
        scene.add(beamGroup);
        this.tempEffects.add(beamGroup);

        // 2. 地面冲击波
        const shockwave = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 1.0, 64),
            new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 1.0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        shockwave.rotation.x = -Math.PI / 2;
        shockwave.position.set(0, -1.8, -2);
        shockwave.userData = { expand: true, scale: 1, opacity: 1 };
        
        scene.add(shockwave);
        this.tempEffects.add(shockwave);

        // 动画控制
        const animInterval = setInterval(() => {
            // 光柱动画
            if (beamGroup.userData.phase === 'expand') {
                beamGroup.scale.x += 0.2;
                beamGroup.scale.z += 0.2;
                if (beamGroup.scale.x >= 2.0) beamGroup.userData.phase = 'fade';
            } else {
                coreBeam.material.opacity -= 0.05;
                outerBeam.material.opacity -= 0.02;
            }

            // 冲击波动画
            shockwave.userData.scale += 0.5;
            shockwave.userData.opacity -= 0.03;
            shockwave.scale.setScalar(shockwave.userData.scale);
            shockwave.material.opacity = Math.max(0, shockwave.userData.opacity);

        }, 16);

        // 彻底清理
        this.setSceneTimeout(() => {
            clearInterval(animInterval);
            this.removeTempEffect(beamGroup);
            this.removeTempEffect(shockwave);
        }, 3000);
    }

    animate(time) {
        this.time = time;
        const now = performance.now();

        // 雷电随机生成
        if (now > this.nextLightningTime) {
            this.spawnLightning();
            this.nextLightningTime = now + 1000 + Math.random() * 3000; // 1-4秒触发一次
        }

        // 闪电消散逻辑
        this.lightningBolts = this.lightningBolts.filter(bolt => {
            const life = now - bolt.userData.bornAt;
            if (life > bolt.userData.ttl) {
                bolt.geometry.dispose();
                bolt.material.dispose();
                this.group.remove(bolt);
                return false;
            }
            // 快速衰减
            bolt.material.opacity = 1.0 - (life / bolt.userData.ttl);
            return true;
        });

        // 祭坛法阵旋转
        if (this.magicRing) {
            this.magicRing.rotation.z = time * 0.5;
        }

        // 劫云翻滚
        if (this.stormCloud) {
            this.stormCloud.rotation.y = time * 0.02;
            const p = this.stormCloud.geometry.attributes.position;
            for(let i=0; i<p.count; i++) {
                let y = p.getY(i);
                y += Math.sin(time + i) * 0.01;
                p.setY(i, y);
            }
            p.needsUpdate = true;
        }

        // 陨石漂浮
        this.debrisList.forEach((debris, i) => {
            const d = debris.userData;
            debris.position.y = d.baseY + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.8;
            debris.rotation.x += d.rotSpeedX;
            debris.rotation.y += d.rotSpeedY;
        });

        // 灵气球环绕
        this.orbs.forEach(orb => {
            const d = orb.userData;
            d.angle += d.speed * 0.01;
            orb.position.x = Math.cos(d.angle) * d.rad;
            orb.position.z = Math.sin(d.angle) * d.rad - 2;
            orb.position.y = d.baseY + Math.sin(time * 2 + d.floatOff) * 0.5;
        });
    }

    setSceneTimeout(callback, delay) {
        const timer = setTimeout(() => {
            this.timeouts.delete(timer);
            callback();
        }, delay);
        this.timeouts.add(timer);
        return timer;
    }

    removeTempEffect(object) {
        if (!object) return;
        this.sceneRef?.remove(object);
        this.tempEffects.delete(object);
        
        object.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    destroy() {
        this.timeouts.forEach((timer) => clearTimeout(timer));
        this.timeouts.clear();
        Array.from(this.tempEffects).forEach((object) => this.removeTempEffect(object));
        
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
        this.sceneRef = null;
    }
}
