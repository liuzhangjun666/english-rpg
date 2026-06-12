// 秘境 3D 场景（琉璃剑阵）
import * as THREE from 'three';

export class MijingScene {
    constructor() { 
        this.group = new THREE.Group(); 
        this.optionsGroup = new THREE.Group();
        this.group.add(this.optionsGroup);
        this.effectGroup = new THREE.Group();
        this.group.add(this.effectGroup);
        
        this.particles = [];       // 灵气粒子
        this.swords = [];          // 剑冢剑阵
        
        this.cameraShake = 0;
        this.environmentIntensity = 1.0;
        this.lightningFlashTime = 0;
        
        // 场景光照 (深空幽紫与冷青色调)
        this.baseLight = new THREE.AmbientLight(0x1a0a2e, 0.8); 
        this.group.add(this.baseLight);
        
        // 核心聚光灯，照亮中心区域以产生反射
        this.spotLight = new THREE.SpotLight(0x00e5ff, 2.0, 100, Math.PI / 4, 0.5, 1);
        this.spotLight.position.set(0, 30, 0);
        this.spotLight.target.position.set(0, 0, 0);
        this.group.add(this.spotLight);
        this.group.add(this.spotLight.target);

        // 雷电/惩罚光源 (红色)
        this.lightningLight = new THREE.PointLight(0xff0044, 0, 100);
        this.lightningLight.position.set(0, 15, -10);
        this.group.add(this.lightningLight);

        // 阵法环
        this.magicRings = [];
    }

    build(scene, camera, spark) {
        // 1. 极致深邃的星空/虚空背景
        scene.background = new THREE.Color(0x050210);
        scene.fog = new THREE.FogExp2(0x050210, 0.025);

        // 2. 黑曜石镜面地形
        this.createTerrain();

        // 3. 地面发光阵法
        this.createMagicArray();

        // 4. 生成上古神兵 (灵光勾边)
        this.createSwordGraveyard();

        // 5. 飘散的细腻灵气点
        this.createSpiritParticles();

        scene.add(this.group);
    }

    createTerrain() {
        const geo = new THREE.PlaneGeometry(200, 200);
        
        // 黑曜石材质：极高金属度、极低粗糙度，形成完美的倒影反射
        const mat = new THREE.MeshStandardMaterial({
            color: 0x020108,
            roughness: 0.05, 
            metalness: 0.95
        });

        const terrain = new THREE.Mesh(geo, mat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = -3;
        this.group.add(terrain);

        // 为了增加细节，在地面上加一层极其微弱的网格线
        const grid = new THREE.GridHelper(200, 100, 0x00ffff, 0x00e5ff);
        grid.position.y = -2.99;
        grid.material.opacity = 0.05;
        grid.material.transparent = true;
        this.group.add(grid);
    }

    createMagicArray() {
        // 创建两个重叠但自转方向相反的发光圆环，代表修仙阵法
        const innerGeo = new THREE.RingGeometry(8, 8.5, 64);
        const outerGeo = new THREE.RingGeometry(10, 10.2, 64);
        
        const matCyan = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.6, 
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const matGold = new THREE.MeshBasicMaterial({ 
            color: 0xffd700, 
            transparent: true, 
            opacity: 0.4, 
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const innerRing = new THREE.Mesh(innerGeo, matCyan);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = -2.95; // 贴着地面
        
        const outerRing = new THREE.Mesh(outerGeo, matGold);
        outerRing.rotation.x = -Math.PI / 2;
        outerRing.position.y = -2.95;

        this.group.add(innerRing);
        this.group.add(outerRing);
        
        this.magicRings.push({ mesh: innerRing, speed: 0.005 });
        this.magicRings.push({ mesh: outerRing, speed: -0.003 });
    }

    createSwordGraveyard() {
        const numSwords = 35;
        
        // --- 提前声明并复用剑阵几何体与材质 ---
        const darkMetal = new THREE.MeshStandardMaterial({
            color: 0x111122,
            roughness: 0.3,
            metalness: 0.8
        });
        const lineMat = new THREE.LineBasicMaterial({ 
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        const bladeGeo = new THREE.BoxGeometry(0.8, 5, 0.15);
        const bladeEdgesGeo = new THREE.EdgesGeometry(bladeGeo);
        
        const guardGeo = new THREE.BoxGeometry(2.0, 0.4, 0.4);
        const guardEdgesGeo = new THREE.EdgesGeometry(guardGeo);
        
        const handleGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8);
        const handleEdgesGeo = new THREE.EdgesGeometry(handleGeo);
        
        const pommelGeo = new THREE.OctahedronGeometry(0.3);
        const pommelEdgesGeo = new THREE.EdgesGeometry(pommelGeo);
        
        const parts = [
            { geo: bladeGeo, edgesGeo: bladeEdgesGeo, posY: 2.5 },
            { geo: guardGeo, edgesGeo: guardEdgesGeo, posY: 5.2 },
            { geo: handleGeo, edgesGeo: handleEdgesGeo, posY: 6.15 },
            { geo: pommelGeo, edgesGeo: pommelEdgesGeo, posY: 7.0 }
        ];
        
        for (let i = 0; i < numSwords; i++) {
            let x = (Math.random() - 0.5) * 100;
            let z = (Math.random() - 0.5) * 80 - 15;
            // 避开中心阵法区域
            if (Math.abs(x) < 12 && Math.abs(z) < 12) {
                x += (x > 0 ? 15 : -15);
                z += (z > 0 ? 15 : -15);
            }

            const sword = this.createSingleStylizedSword(parts, darkMetal, lineMat);
            
            const scale = 0.8 + Math.random() * 1.5;
            sword.scale.set(scale, scale, scale);
            sword.position.set(x, -3, z); // 插入地表
            
            // 随机倾斜角度
            sword.rotation.x = Math.random() * 0.6 - 0.3;
            sword.rotation.z = Math.random() * 0.8 - 0.4;
            sword.rotation.y = Math.random() * Math.PI * 2;

            this.group.add(sword);
            this.swords.push(sword);
        }
    }

    createSingleStylizedSword(parts, darkMetal, lineMat) {
        const swordGroup = new THREE.Group();
        
        parts.forEach(part => {
            const mesh = new THREE.Mesh(part.geo, darkMetal);
            mesh.position.y = part.posY;
            
            const line = new THREE.LineSegments(part.edgesGeo, lineMat);
            mesh.add(line);
            
            swordGroup.add(mesh);
        });

        return swordGroup;
    }

    createSpiritParticles() {
        // 使用非常细小的粒子，产生萤火虫/灵气效果
        const geo = new THREE.BufferGeometry();
        const numParticles = 800;
        const pos = new Float32Array(numParticles * 3);
        const colors = new Float32Array(numParticles * 3);
        const velocities = [];
        
        for (let i = 0; i < numParticles; i++) {
            pos[i*3] = (Math.random() - 0.5) * 60;
            pos[i*3+1] = -3 + Math.random() * 30; // 从地面向上
            pos[i*3+2] = (Math.random() - 0.5) * 50 - 5;
            
            // 青色与金色混杂
            const isGold = Math.random() > 0.5;
            const c = new THREE.Color(isGold ? 0xffd700 : 0x00ffff);
            colors[i*3] = c.r;
            colors[i*3+1] = c.g;
            colors[i*3+2] = c.b;

            velocities.push({
                x: (Math.random() - 0.5) * 0.01,
                y: 0.01 + Math.random() * 0.03, // 缓慢上升
                z: (Math.random() - 0.5) * 0.01,
                wobbleSpeed: 0.02 + Math.random() * 0.04,
                wobbleAmp: Math.random() * 0.05
            });
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const mat = new THREE.PointsMaterial({
            size: 0.12, // 尺寸非常小，显得精致
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const spiritPoints = new THREE.Points(geo, mat);
        spiritPoints.userData = { isSpirit: true, velocities };
        this.group.add(spiritPoints);
    }

    spawnOptions(options) {
        // 清除旧选项
        while (this.optionsGroup.children.length > 0) {
            const child = this.optionsGroup.children[0];
            if (child.material && child.material.map) child.material.map.dispose();
            if (child.material) child.material.dispose();
            this.optionsGroup.remove(child);
        }

        if (!options || options.length === 0) return;

        const count = options.length;
        const radius = 6.0; 
        const arcAngle = Math.PI / 2.5; 
        
        for (let i = 0; i < count; i++) {
            const opt = options[i];
            const text = `${opt.label}. ${opt.text}`;
            
            // 选项实体改为发光的钻石状八面体
            const geometry = new THREE.OctahedronGeometry(1.0, 0);
            const material = new THREE.MeshStandardMaterial({
                color: 0x050510,
                emissive: i % 2 === 0 ? 0x0088ff : 0x00ff88,
                emissiveIntensity: 0.8,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.9
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // 选项法印的勾边
            const edgesGeo = new THREE.EdgesGeometry(geometry);
            const lineMat = new THREE.LineBasicMaterial({ 
                color: i % 2 === 0 ? 0x00ffff : 0xffffff,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8
            });
            mesh.add(new THREE.LineSegments(edgesGeo, lineMat));
            
            // 高清文字纹理
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.font = 'bold 56px "Microsoft YaHei", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = i % 2 === 0 ? '#0088ff' : '#00ff88';
            ctx.shadowBlur = 15;
            ctx.fillText(text, 256, 64);

            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(3.5, 0.875, 1);
            sprite.position.set(0, 0, 1.5); 
            mesh.add(sprite);

            const angle = (count > 1) ? (i / (count - 1)) * arcAngle - (arcAngle / 2) : 0;
            const xPos = Math.sin(angle) * radius;
            const zPos = Math.cos(angle) * radius - radius + 1;
            const yPos = 1.0;
            
            mesh.position.set(xPos, yPos, zPos);
            mesh.rotation.y = angle;
            
            mesh.userData = { 
                interactable: true, 
                action: 'answer_option',
                value: opt.value,
                baseY: yPos,
                angleOffset: i * 1.5,
                isHovered: false,
                isDestroyed: false,
                initialEmissive: material.emissive.getHex()
            };
            
            this.optionsGroup.add(mesh);
        }
    }

    triggerCorrectEffect(mesh) {
        if (mesh && !mesh.userData.isDestroyed) {
            mesh.userData.isDestroyed = true;
            mesh.scale.set(0.1, 0.1, 0.1);
            mesh.visible = false;
            
            const origin = mesh.position.clone();
            const colors = [0x00ffff, 0xffffff, 0xffd700];
            
            // 击碎产生的微小纯光晶体碎片
            for (let i = 0; i < 50; i++) {
                const geo = new THREE.OctahedronGeometry(0.1 + Math.random() * 0.15, 0);
                const mat = new THREE.MeshBasicMaterial({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    transparent: true,
                    opacity: 1,
                    blending: THREE.AdditiveBlending
                });
                const p = new THREE.Mesh(geo, mat);
                p.position.copy(origin);
                
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const speed = 0.2 + Math.random() * 0.4;
                
                p.userData = {
                    vx: Math.sin(phi) * Math.cos(theta) * speed,
                    vy: Math.sin(phi) * Math.sin(theta) * speed,
                    vz: Math.cos(phi) * speed,
                    rx: Math.random() * 0.4,
                    ry: Math.random() * 0.4,
                    life: 1.0
                };
                
                this.effectGroup.add(p);
                this.particles.push(p);
            }
            
            // 答对时光柱/光爆
            this.lightningFlashTime = 0.4;
            this.lightningLight.color.setHex(0x00ffff); 
            this.lightningLight.position.copy(origin);
        }
    }

    triggerErrorEffect() {
        this.cameraShake = 1.0;
        this.lightningFlashTime = 0.6;
        this.lightningLight.color.setHex(0xff0044); // 猩红惩罚光
        this.lightningLight.position.set(0, 10, 0);
        
        // 错误时的血色光斑
        for (let i = 0; i < 30; i++) {
            const geo = new THREE.PlaneGeometry(1.0, 1.0);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xff0044,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const p = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 6 + Math.random() * 4;
            p.position.set(Math.cos(angle) * dist, Math.random() * 4 - 2, Math.sin(angle) * dist);
            
            // 让 Plane 始终面朝中心
            p.lookAt(0, 0, 0);

            p.userData = {
                vx: -p.position.x * 0.08,
                vy: -p.position.y * 0.08,
                vz: -p.position.z * 0.08,
                life: 1.0
            };
            
            this.effectGroup.add(p);
            this.particles.push(p);
        }
    }

    updateEnvironment(combo, remainSec) {
        this.environmentIntensity = 1.0 + (combo * 0.1);
        if (remainSec <= 10) {
            this.spotLight.color.setHex(0xff0044);
            this.spotLight.intensity = 4.0;
        } else {
            this.spotLight.color.setHex(0x00e5ff);
            this.spotLight.intensity = 2.0 * this.environmentIntensity;
        }
        
        // 阵法旋转速度随连击数增加
        this.magicRings.forEach(ring => {
            ring.speed = (ring.speed > 0 ? 1 : -1) * (0.005 + combo * 0.002);
        });
    }

    animate(time) {
        // 阵法旋转
        this.magicRings.forEach(ring => {
            if (ring.mesh) ring.mesh.rotation.z += ring.speed;
        });

        // 雷电/强光脉冲逻辑
        if (this.lightningFlashTime > 0) {
            this.lightningFlashTime -= 0.016;
            this.lightningLight.intensity = 100 + Math.random() * 200;
        } else {
            this.lightningLight.intensity = 0;
        }

        // 选项浮动动画 & Hover
        this.optionsGroup.children.forEach(mesh => {
            if (mesh.userData && mesh.userData.baseY !== undefined && !mesh.userData.isDestroyed) {
                mesh.position.y = mesh.userData.baseY + Math.sin(time * 2 + mesh.userData.angleOffset) * 0.2;
                mesh.rotation.y += 0.005;
                mesh.rotation.x = Math.sin(time + mesh.userData.angleOffset) * 0.05;
                
                if (mesh.userData.isHovered) {
                    mesh.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.15);
                    if (mesh.material) {
                        mesh.material.emissiveIntensity = 2.0;
                    }
                } else {
                    mesh.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.1);
                    if (mesh.material) {
                        mesh.material.emissiveIntensity = 0.8;
                    }
                }
            }
        });

        // 细腻灵气粒子的流动
        this.group.children.forEach(child => {
            if (child.userData?.isSpirit && child.geometry) {
                const pos = child.geometry.attributes.position;
                const vels = child.userData.velocities;
                for (let i = 0; i < pos.count; i++) {
                    const v = vels[i];
                    let x = pos.getX(i);
                    let y = pos.getY(i);
                    let z = pos.getZ(i);
                    
                    x += v.x + Math.sin(time * 2 + i) * v.wobbleAmp;
                    y += v.y;
                    z += v.z + Math.cos(time * 2 + i) * v.wobbleAmp;
                    
                    // 飞得太高就重置到阵法中心附近
                    if (y > 20) {
                        y = -3;
                        x = (Math.random() - 0.5) * 20;
                        z = (Math.random() - 0.5) * 20;
                    }
                    
                    pos.setXYZ(i, x, y, z);
                }
                pos.needsUpdate = true;
            }
        });

        // 爆炸/反噬碎片动画
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.x += p.userData.vx;
            p.position.y += p.userData.vy;
            p.position.z += p.userData.vz;
            if (p.userData.rx) p.rotation.x += p.userData.rx;
            if (p.userData.ry) p.rotation.y += p.userData.ry;
            p.userData.life -= 0.02;
            
            if (p.material) {
                p.material.opacity = Math.max(0, p.userData.life);
            }
            p.scale.setScalar(p.userData.life * 1.5);
            
            if (p.userData.life <= 0) {
                this.effectGroup.remove(p);
                if (p.material) p.material.dispose();
                if (p.geometry) p.geometry.dispose();
                this.particles.splice(i, 1);
            }
        }

        if (this.cameraShake > 0) {
            this.cameraShake -= 0.05;
            if (this.cameraShake < 0) this.cameraShake = 0;
        }
    }
}
