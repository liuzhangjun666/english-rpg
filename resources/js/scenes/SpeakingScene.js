// 诵咒峰 3D 场景（口语修炼 - 梵音绝顶）
import * as THREE from 'three';

export class SpeakingScene {
    constructor() {
        this.group = new THREE.Group();
        this.soundWaves = [];
        this.time = 0;

        // 破晓云海环境光 (紫金色)
        this.ambientLight = new THREE.AmbientLight(0x2a1a4a, 1.5);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffaa44, 1.2);
        this.dirLight.position.set(10, 10, -10);
        this.group.add(this.dirLight);
    }

    build(scene) {
        this.sceneRef = scene;

        // 1. 破晓云海背景
        scene.background = new THREE.Color(0x1a0525);
        scene.fog = new THREE.FogExp2(0x1a0525, 0.02);

        // 2. 陡峭孤峰
        this.createMountainPeak();

        // 3. 声波扩散符文环
        this.createSoundWaves();

        // 4. 云海粒子
        this.createCloudSea();

        scene.add(this.group);
    }

    createMountainPeak() {
        this.peakGroup = new THREE.Group();
        this.peakGroup.position.y = -6.0;

        // 孤峰主体
        const peakGeo = new THREE.ConeGeometry(8, 20, 7);
        const peakMat = new THREE.MeshStandardMaterial({
            color: 0x110a1a,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        const peak = new THREE.Mesh(peakGeo, peakMat);
        this.peakGroup.add(peak);

        // 峰顶阵法平盘
        const topGeo = new THREE.CylinderGeometry(4, 4.5, 0.5, 16);
        const topMat = new THREE.MeshStandardMaterial({
            color: 0x221133,
            roughness: 0.8,
            metalness: 0.4
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 10;
        this.peakGroup.add(top);

        // 发光阵文
        const ringGeo = new THREE.RingGeometry(3.5, 3.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 10.26;
        this.peakGroup.add(ring);

        this.group.add(this.peakGroup);
    }

    createSoundWaves() {
        // 创建环绕山峰的巨大动态声波环 (模拟“言出法随”)
        for (let i = 0; i < 5; i++) {
            const waveGeo = new THREE.TorusGeometry(5, 0.1, 8, 64);
            const waveMat = new THREE.MeshBasicMaterial({
                color: 0xffcc44,
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const wave = new THREE.Mesh(waveGeo, waveMat);
            
            wave.rotation.x = Math.PI / 2;
            wave.userData = {
                phase: i * (Math.PI * 2 / 5), // 不同的生命周期相位
                scale: 1,
                speed: 0.02
            };
            
            this.soundWaves.push(wave);
            this.group.add(wave);
        }
    }

    createCloudSea() {
        const cloudGeo = new THREE.BufferGeometry();
        const count = 1000;
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 80;
            pos[i*3+1] = -15 + Math.random() * 8; // 聚集在山腰下方
            pos[i*3+2] = (Math.random() - 0.5) * 80;
            sizes[i] = Math.random();
        }

        cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        cloudGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0x331a4a) }
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (50.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.1, dist);
                    gl_FragColor = vec4(color, alpha * 0.4);
                }
            `,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false
        };

        this.cloudSea = new THREE.Points(cloudGeo, new THREE.ShaderMaterial(shader));
        this.group.add(this.cloudSea);
    }

    animate(time) {
        this.time = time;

        // 孤峰极其缓慢旋转
        if (this.peakGroup) {
            this.peakGroup.rotation.y = time * 0.02;
        }

        // 云海翻滚
        if (this.cloudSea) {
            this.cloudSea.rotation.y = -time * 0.01;
            const p = this.cloudSea.geometry.attributes.position;
            for(let i=0; i<p.count; i++) {
                let y = p.getY(i);
                y += Math.sin(time + i) * 0.01;
                p.setY(i, y);
            }
            p.needsUpdate = true;
        }

        // 动态声波扩散特效
        this.soundWaves.forEach(wave => {
            const d = wave.userData;
            d.phase += d.speed;
            if (d.phase > Math.PI * 2) {
                d.phase -= Math.PI * 2;
            }
            
            // 归一化生命周期 0 - 1
            const life = d.phase / (Math.PI * 2);
            
            // 从下往上扩散，从小变大
            const scale = 1.0 + life * 4.0;
            wave.scale.set(scale, scale, scale);
            
            wave.position.y = -5 + life * 15;
            
            // 淡入淡出透明度
            if (life < 0.2) {
                wave.material.opacity = life * 5; // 0 to 1
            } else if (life > 0.8) {
                wave.material.opacity = (1.0 - life) * 5; // 1 to 0
            } else {
                wave.material.opacity = 1.0;
            }
        });

        // 环境光呼吸律动 (配合念诵节奏)
        this.ambientLight.intensity = 1.5 + Math.sin(time * 2.0) * 0.3;
    }

    destroy() {
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
    }
}
