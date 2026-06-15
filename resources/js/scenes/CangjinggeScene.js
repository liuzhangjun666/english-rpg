// 藏经阁 3D 场景（语法修炼 - 虚空书海）
import * as THREE from 'three';

export class CangjinggeScene {
    constructor() {
        this.group = new THREE.Group();
        this.scrolls = [];
        this.lampCrystals = [];
        this.burstParticles = [];
        
        this.floorCharge = 0;
        this.time = 0;

        // 环境光与核心光源
        this.ambientLight = new THREE.AmbientLight(0x1a0b2e, 1.2);
        this.group.add(this.ambientLight);

        this.coreLight = new THREE.PointLight(0xd4af37, 2.0, 30);
        this.coreLight.position.set(0, 1.0, 0);
        this.group.add(this.coreLight);
    }

    build(scene) {
        this.sceneRef = scene;

        // 1. 深邃虚空背景与星雾
        scene.background = new THREE.Color(0x080410);
        scene.fog = new THREE.FogExp2(0x080410, 0.025);

        // 2. 构建虚空阵法地台
        this.createVoidPlatform();

        // 3. 构建四周的矩阵书架 (数据巨柱)
        this.createMatrixBookshelves();

        // 4. 构建中心智慧核心与环绕的经卷
        this.createWisdomCore();

        // 5. 构建漫天飞舞的金色星屑
        this.createStarDust();

        scene.add(this.group);
    }

    createVoidPlatform() {
        // 光学地台，带有科技与修仙结合的线框感
        const radius = 12;
        const platformGroup = new THREE.Group();
        platformGroup.position.y = -2.5;

        // 底盘实面
        const baseGeo = new THREE.CylinderGeometry(radius, radius, 0.2, 64);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x0f0720,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        platformGroup.add(base);

        // 阵法刻线 (高亮)
        const ringGeo1 = new THREE.RingGeometry(radius - 0.5, radius, 64);
        const ringGeo2 = new THREE.RingGeometry(radius - 3.5, radius - 3.0, 64);
        const lineMat = new THREE.MeshBasicMaterial({
            color: 0x8a2be2,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const ring1 = new THREE.Mesh(ringGeo1, lineMat);
        ring1.rotation.x = -Math.PI / 2;
        ring1.position.y = 0.12;
        platformGroup.add(ring1);

        const ring2 = new THREE.Mesh(ringGeo2, lineMat);
        ring2.rotation.x = -Math.PI / 2;
        ring2.position.y = 0.12;
        platformGroup.add(ring2);

        this.group.add(platformGroup);
        this.platformGroup = platformGroup;
    }

    createMatrixBookshelves() {
        this.shelvesGroup = new THREE.Group();
        const numPillars = 8;
        const radius = 18;

        const pillarGeo = new THREE.BoxGeometry(2, 40, 2);
        // 使用线框材质模拟虚空数据书架
        const edgesGeo = new THREE.EdgesGeometry(pillarGeo);
        const lineMat = new THREE.LineBasicMaterial({ 
            color: 0x4b0082, 
            transparent: true, 
            opacity: 0.4,
            blending: THREE.AdditiveBlending 
        });

        // 内部微光体
        const solidMat = new THREE.MeshBasicMaterial({
            color: 0x1a0033,
            transparent: true,
            opacity: 0.2
        });

        // 复用书本的几何体和材质
        const sharedBookGeo = new THREE.PlaneGeometry(0.8, 0.2);
        const bookMats = [];
        for (let m = 0; m < 6; m++) {
            bookMats.push(new THREE.MeshBasicMaterial({
                color: m % 2 === 0 ? 0xd4af37 : 0x8a2be2,
                transparent: true,
                opacity: 0.6 + Math.random() * 0.4,
                blending: THREE.AdditiveBlending
            }));
        }

        for (let i = 0; i < numPillars; i++) {
            const angle = (i / numPillars) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const pillar = new THREE.Group();
            pillar.position.set(x, 10, z);
            pillar.rotation.y = -angle;

            const mesh = new THREE.Mesh(pillarGeo, solidMat);
            const lines = new THREE.LineSegments(edgesGeo, lineMat);
            
            pillar.add(mesh);
            pillar.add(lines);

            // 在柱子上添加一些随机发光亮点模拟“藏书”
            for(let j=0; j<20; j++) {
                const bookMat = bookMats[Math.floor(Math.random() * bookMats.length)];
                const book = new THREE.Mesh(sharedBookGeo, bookMat);
                book.position.set(
                    (Math.random() - 0.5) * 1.8,
                    (Math.random() - 0.5) * 38,
                    1.01
                );
                pillar.add(book);
            }

            this.shelvesGroup.add(pillar);
        }
        this.group.add(this.shelvesGroup);
    }

    createWisdomCore() {
        this.coreGroup = new THREE.Group();
        this.coreGroup.position.set(0, 1.0, 0);

        // 核心：多面体智慧晶石
        const coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xd4af37,
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 0.8,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        this.wisdomCore = new THREE.Mesh(coreGeo, coreMat);
        this.coreGroup.add(this.wisdomCore);

        // 内部包裹一个高亮球体
        const innerGlow = new THREE.Mesh(
            new THREE.SphereGeometry(1.0, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0xffe6a0,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            })
        );
        this.coreGroup.add(innerGlow);
        this.innerGlow = innerGlow;

        // 环绕核心的 9 个命灯水晶 (替代原来的 lampNodes)
        for (let i = 0; i < 9; i++) {
            const crystalGeo = new THREE.OctahedronGeometry(0.2, 0);
            crystalGeo.scale(1, 2, 1);
            const crystalMat = new THREE.MeshStandardMaterial({
                color: 0x8a2be2,
                emissive: 0x4b0082,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            
            // 记录初始角度和半径
            crystal.userData = {
                angle: (i / 9) * Math.PI * 2,
                radius: 3.5,
                targetEmissive: 0.2,
                targetOpacity: 0.6,
                baseY: 0
            };
            this.lampCrystals.push(crystal);
            this.coreGroup.add(crystal);
        }

        // 环绕飞舞的金色经卷 (替代原来的 floatRunes)
        const sharedScrollGeo = new THREE.PlaneGeometry(0.4, 0.8);
        const sharedScrollMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        for (let i = 0; i < 24; i++) {
            const scroll = new THREE.Mesh(sharedScrollGeo, sharedScrollMat);
            
            scroll.userData = {
                radius: 4 + Math.random() * 4,
                angle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.0,
                baseY: (Math.random() - 0.5) * 6,
                yPhase: Math.random() * Math.PI * 2,
                rotSpeedX: (Math.random() - 0.5) * 0.05,
                rotSpeedY: (Math.random() - 0.5) * 0.05,
                rotSpeedZ: (Math.random() - 0.5) * 0.05
            };
            this.scrolls.push(scroll);
            this.coreGroup.add(scroll);
        }

        this.group.add(this.coreGroup);
    }

    createStarDust() {
        const geo = new THREE.BufferGeometry();
        const count = 800;
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 40;
            pos[i*3+1] = -5 + Math.random() * 30;
            pos[i*3+2] = (Math.random() - 0.5) * 40;
            sizes[i] = Math.random();
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0xd4af37) } // 金色星光
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (12.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.1, dist);
                    gl_FragColor = vec4(color, alpha * 0.6);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        };

        this.starDust = new THREE.Points(geo, new THREE.ShaderMaterial(shader));
        this.group.add(this.starDust);
    }

    onGrammarAnswer(payload = {}) {
        if (payload.correct) {
            this.floorCharge = Math.min(100, this.floorCharge + 16);
            this.spawnScrollBurst();
            
            // 答对时光芒爆发
            this.wisdomCore.material.emissiveIntensity = 2.0;
            this.innerGlow.material.opacity = 1.0;
            this.coreLight.intensity = 5.0;

            // 更新环绕水晶状态
            const activeCount = Math.min(this.lampCrystals.length, Math.floor(this.floorCharge / 12));
            this.lampCrystals.forEach((crystal, idx) => {
                if (idx < activeCount) {
                    crystal.userData.targetEmissive = 1.5;
                    crystal.userData.targetOpacity = 1.0;
                    crystal.material.color.setHex(0xd4af37); // 变金
                    crystal.material.emissive.setHex(0xffd700);
                }
            });
        } else {
            this.floorCharge = Math.max(0, this.floorCharge - 10);
            
            // 答错时光芒黯淡
            this.wisdomCore.material.emissiveIntensity = 0.2;
            this.coreLight.intensity = 0.5;

            this.lampCrystals.forEach((crystal) => {
                crystal.userData.targetEmissive = Math.max(0.1, crystal.userData.targetEmissive * 0.5);
                crystal.userData.targetOpacity = Math.max(0.3, crystal.userData.targetOpacity * 0.8);
            });
        }
    }

    onFloorUnlock(payload = {}) {
        const floor = Number(payload.floor || 1);
        const count = Math.min(this.lampCrystals.length, floor);
        this.lampCrystals.forEach((crystal, idx) => {
            if (idx < count) {
                crystal.userData.targetEmissive = 1.5;
                crystal.userData.targetOpacity = 1.0;
                crystal.material.color.setHex(0xd4af37);
                crystal.material.emissive.setHex(0xffd700);
            } else {
                crystal.userData.targetEmissive = 0.2;
                crystal.userData.targetOpacity = 0.6;
                crystal.material.color.setHex(0x8a2be2);
                crystal.material.emissive.setHex(0x4b0082);
            }
        });
    }

    spawnScrollBurst() {
        const burstGroup = new THREE.Group();
        burstGroup.position.copy(this.coreGroup.position);
        
        const sharedBurstPageGeo = new THREE.PlaneGeometry(0.3, 0.6);
        const sharedBurstPageMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        for (let i = 0; i < 15; i++) {
            const page = new THREE.Mesh(sharedBurstPageGeo, sharedBurstPageMat);
            
            page.userData = {
                angle: Math.random() * Math.PI * 2,
                speedY: 0.1 + Math.random() * 0.1,
                radius: 0.5,
                expansionSpeed: 0.05 + Math.random() * 0.05,
                rotX: Math.random() * 0.2,
                rotY: Math.random() * 0.2
            };
            burstGroup.add(page);
        }
        
        burstGroup.userData = { bornAt: performance.now(), ttl: 1500 };
        this.group.add(burstGroup);
        this.burstParticles.push(burstGroup);
    }

    animate(time) {
        this.time = time;

        // 星屑缓缓飘落
        if (this.starDust) {
            const p = this.starDust.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let y = p.getY(i);
                y -= 0.02 + Math.sin(time + i) * 0.01;
                if (y < -5) y = 25;
                p.setY(i, y);
            }
            p.needsUpdate = true;
        }

        // 阵法地台缓慢旋转
        if (this.platformGroup) {
            this.platformGroup.rotation.y = time * 0.05;
        }

        // 矩阵书架缓慢反向旋转
        if (this.shelvesGroup) {
            this.shelvesGroup.rotation.y = -time * 0.02;
        }

        // 智慧核心自转与呼吸
        if (this.wisdomCore) {
            this.wisdomCore.rotation.x = time * 0.2;
            this.wisdomCore.rotation.y = time * 0.3;
            
            // 光源强度平滑恢复
            if (this.wisdomCore.material.emissiveIntensity > 0.5) {
                this.wisdomCore.material.emissiveIntensity -= 0.02;
            }
            if (this.innerGlow.material.opacity > 0.6) {
                this.innerGlow.material.opacity -= 0.01;
            }
            if (this.coreLight.intensity > 2.0) {
                this.coreLight.intensity -= 0.05;
            }
        }

        // 命灯水晶环绕
        this.lampCrystals.forEach((crystal, i) => {
            const d = crystal.userData;
            d.angle += 0.5 * 0.02; // 轨道旋转
            crystal.position.x = Math.cos(d.angle) * d.radius;
            crystal.position.z = Math.sin(d.angle) * d.radius;
            crystal.position.y = d.baseY + Math.sin(time * 2 + i) * 0.5;
            
            crystal.rotation.y += 0.05;
            crystal.rotation.x += 0.02;

            // 平滑过渡发光状态
            crystal.material.emissiveIntensity += (d.targetEmissive - crystal.material.emissiveIntensity) * 0.1;
            crystal.material.opacity += (d.targetOpacity - crystal.material.opacity) * 0.1;
        });

        // 经卷飞舞
        this.scrolls.forEach(scroll => {
            const d = scroll.userData;
            d.angle += d.speed * 0.02;
            scroll.position.x = Math.cos(d.angle) * d.radius;
            scroll.position.z = Math.sin(d.angle) * d.radius;
            scroll.position.y = d.baseY + Math.sin(time * 1.5 + d.yPhase) * 2.0;

            scroll.rotation.x += d.rotSpeedX;
            scroll.rotation.y += d.rotSpeedY;
            scroll.rotation.z += d.rotSpeedZ;
        });

        // 爆点粒子 (飞天经书)
        const now = performance.now();
        this.burstParticles = this.burstParticles.filter(burst => {
            const life = now - burst.userData.bornAt;
            const ttl = burst.userData.ttl;
            const alpha = Math.max(0, 1 - life / ttl);

            burst.children.forEach(page => {
                const d = page.userData;
                d.angle += 0.1;
                d.radius += d.expansionSpeed;
                page.position.x = Math.cos(d.angle) * d.radius;
                page.position.z = Math.sin(d.angle) * d.radius;
                page.position.y += d.speedY;
                
                page.rotation.x += d.rotX;
                page.rotation.y += d.rotY;
                
                page.material.opacity = alpha * 0.9;
            });

            if (life >= ttl) {
                burst.children.forEach(page => {
                    page.geometry.dispose();
                    page.material.dispose();
                });
                this.group.remove(burst);
                return false;
            }
            return true;
        });
    }

    destroy() {
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
    }
}
