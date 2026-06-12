// 听风谷 3D 场景（听力修炼 - 空灵风谷）
import * as THREE from 'three';

export class ListeningScene {
    constructor() {
        this.group = new THREE.Group();
        this.dandelions = [];
        this.chimes = [];
        this.time = 0;

        // 幽谷环境光
        this.ambientLight = new THREE.AmbientLight(0x0a2a2a, 1.2);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0x55ffaa, 0.8);
        this.dirLight.position.set(10, 20, 10);
        this.group.add(this.dirLight);
    }

    build(scene) {
        this.sceneRef = scene;

        // 1. 空灵幽谷背景
        scene.background = new THREE.Color(0x021010);
        scene.fog = new THREE.FogExp2(0x021010, 0.03);

        // 2. 构建风之法阵地台
        this.createWindPlatform();

        // 3. 构建上古风铃
        this.createWindChimes();

        // 4. 构建满天飘散的发光蒲公英 (风粒子)
        this.createWindParticles();

        scene.add(this.group);
    }

    createWindPlatform() {
        this.platformGroup = new THREE.Group();
        this.platformGroup.position.y = -3.0;

        const baseGeo = new THREE.CylinderGeometry(8, 8.5, 0.5, 32);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x051a15,
            roughness: 0.7,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        this.platformGroup.add(base);

        // 风之阵法刻线
        const ringGeo = new THREE.RingGeometry(6.5, 7.5, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.26;
        this.platformGroup.add(ring);

        this.group.add(this.platformGroup);
    }

    createWindChimes() {
        // 在四周悬浮巨大的金属/玉石风铃
        for (let i = 0; i < 6; i++) {
            const chimeGroup = new THREE.Group();
            
            const angle = (i / 6) * Math.PI * 2;
            const radius = 15;
            chimeGroup.position.set(Math.cos(angle) * radius, 10, Math.sin(angle) * radius);
            
            // 风铃顶盖
            const topGeo = new THREE.ConeGeometry(2, 2, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x113333,
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0x002222
            });
            const top = new THREE.Mesh(topGeo, mat);
            chimeGroup.add(top);

            // 风铃坠管
            for (let j = 0; j < 4; j++) {
                const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 6 + Math.random() * 4);
                const pipe = new THREE.Mesh(pipeGeo, mat);
                const pAngle = (j / 4) * Math.PI * 2;
                pipe.position.set(Math.cos(pAngle), -4, Math.sin(pAngle));
                chimeGroup.add(pipe);
            }

            // 发光核心
            const coreGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const coreMat = new THREE.MeshBasicMaterial({
                color: 0x00ffcc,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.y = -2;
            chimeGroup.add(core);

            chimeGroup.userData = {
                baseY: 10 + Math.random() * 5,
                floatSpeed: 0.5 + Math.random() * 0.5,
                floatOffset: Math.random() * Math.PI * 2
            };

            this.chimes.push(chimeGroup);
            this.group.add(chimeGroup);
        }
    }

    createWindParticles() {
        const particleGeo = new THREE.BufferGeometry();
        const count = 1500;
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const phases = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 60;
            pos[i*3+1] = -5 + Math.random() * 30;
            pos[i*3+2] = (Math.random() - 0.5) * 60;
            sizes[i] = Math.random();
            phases[i] = Math.random() * Math.PI * 2; // 记录初始相位用于随风飘荡
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0xaaffcc) },
                time: { value: 0 }
            },
            vertexShader: `
                attribute float aSize;
                attribute float aPhase;
                uniform float time;
                varying float vAlpha;
                void main() {
                    vec3 p = position;
                    // 模拟风的流动轨迹
                    p.x += sin(time + p.y * 0.5 + aPhase) * 2.0;
                    p.z += cos(time + p.y * 0.5 + aPhase) * 2.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
                    gl_PointSize = aSize * (15.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                    vAlpha = aSize;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float vAlpha;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.1, dist);
                    gl_FragColor = vec4(color, alpha * vAlpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        };

        this.particleMat = new THREE.ShaderMaterial(shader);
        this.windParticles = new THREE.Points(particleGeo, this.particleMat);
        this.group.add(this.windParticles);
    }

    animate(time) {
        this.time = time;

        // 阵法旋转
        if (this.platformGroup) {
            this.platformGroup.rotation.y = time * 0.1;
        }

        // 风铃沉浮与微微摇摆
        this.chimes.forEach(chime => {
            const d = chime.userData;
            chime.position.y = d.baseY + Math.sin(time * d.floatSpeed + d.floatOffset) * 2.0;
            chime.rotation.x = Math.sin(time * 0.5 + d.floatOffset) * 0.1;
            chime.rotation.z = Math.cos(time * 0.4 + d.floatOffset) * 0.1;
        });

        // 更新风粒子着色器时间
        if (this.particleMat) {
            this.particleMat.uniforms.time.value = time;
        }

        // 粒子整体流动
        if (this.windParticles) {
            const p = this.windParticles.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let y = p.getY(i);
                let x = p.getX(i);
                y += 0.05; // 整体向上升腾
                x -= 0.02; // 风的横向吹拂
                if (y > 25) y = -5;
                if (x < -30) x = 30;
                p.setY(i, y);
                p.setX(i, x);
            }
            p.needsUpdate = true;
        }
    }

    destroy() {
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
    }
}
