// 符箓台 3D 场景（写作修炼 - 天地符坛）
import * as THREE from 'three';

export class WritingScene {
    constructor() {
        this.group = new THREE.Group();
        this.talismans = [];
        this.inkDrops = [];
        this.time = 0;

        // 墨香暗金环境光
        this.ambientLight = new THREE.AmbientLight(0x2a1505, 1.5);
        this.group.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffd700, 1.5);
        this.dirLight.position.set(0, 15, 0);
        this.group.add(this.dirLight);
    }

    build(scene) {
        this.sceneRef = scene;

        // 1. 虚空金墨背景
        scene.background = new THREE.Color(0x0a0500);
        scene.fog = new THREE.FogExp2(0x0a0500, 0.025);

        // 2. 灵墨池道坛
        this.createInkPoolAltar();

        // 3. 漫天飞舞的巨大符纸
        this.createFloatingTalismans();

        // 4. 金色墨滴粒子
        this.createInkParticles();

        scene.add(this.group);
    }

    createInkPoolAltar() {
        this.altarGroup = new THREE.Group();
        this.altarGroup.position.y = -3.5;

        // 道坛底盘
        const baseGeo = new THREE.CylinderGeometry(6, 6.5, 0.6, 64);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x110a02,
            roughness: 0.4,
            metalness: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        this.altarGroup.add(base);

        // 内嵌灵墨池
        const poolGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.61, 64);
        const poolMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, // 金色墨水
            roughness: 0.1,
            metalness: 1.0,
            emissive: 0x4a3200,
            transparent: true,
            opacity: 0.9
        });
        this.inkPool = new THREE.Mesh(poolGeo, poolMat);
        this.altarGroup.add(this.inkPool);

        // 悬浮的判官笔/灵纹阵 (发光边界)
        const ringGeo = new THREE.RingGeometry(6.6, 6.8, 64);
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
        ring.position.y = 0.4;
        this.altarGroup.add(ring);

        this.group.add(this.altarGroup);
    }

    createFloatingTalismans() {
        // 创建漂浮的巨大无字天书/符纸
        for (let i = 0; i < 12; i++) {
            const width = 2 + Math.random() * 2;
            const height = 6 + Math.random() * 4;
            // 细分以便未来可以弯曲
            const tGeo = new THREE.PlaneGeometry(width, height, 4, 16);
            
            const tMat = new THREE.MeshStandardMaterial({
                color: 0xfff5e6, // 泛黄的纸张
                roughness: 0.9,
                metalness: 0.1,
                side: THREE.DoubleSide,
                emissive: 0x110a00
            });
            const talisman = new THREE.Mesh(tGeo, tMat);

            talisman.userData = {
                angle: (i / 12) * Math.PI * 2,
                radius: 8 + Math.random() * 6,
                baseY: Math.random() * 15 - 5,
                speed: 0.01 + Math.random() * 0.015,
                waveSpeed: 1.0 + Math.random(),
                rotX: Math.random() * Math.PI,
                rotY: Math.random() * Math.PI,
                rotZ: Math.random() * Math.PI
            };

            this.talismans.push(talisman);
            this.group.add(talisman);
        }
    }

    createInkParticles() {
        const particleGeo = new THREE.BufferGeometry();
        const count = 400;
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 30;
            pos[i*3+1] = -2 + Math.random() * 20;
            pos[i*3+2] = (Math.random() - 0.5) * 30;
            sizes[i] = Math.random();
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0xffd700) } // 金色墨滴
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (20.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5, 0.3)); // 水滴形状偏移
                    float alpha = smoothstep(0.4, 0.1, dist);
                    gl_FragColor = vec4(color, alpha * 0.9);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        };

        this.inkParticles = new THREE.Points(particleGeo, new THREE.ShaderMaterial(shader));
        this.group.add(this.inkParticles);
    }

    animate(time) {
        this.time = time;

        // 灵墨池轻微旋转与呼吸发光
        if (this.altarGroup) {
            this.altarGroup.rotation.y = time * 0.1;
        }
        if (this.inkPool) {
            this.inkPool.material.emissiveIntensity = 0.5 + Math.sin(time * 1.5) * 0.5;
        }

        // 巨大符纸绕场飞舞并弯曲
        this.talismans.forEach(talisman => {
            const d = talisman.userData;
            d.angle += d.speed;
            
            talisman.position.x = Math.cos(d.angle) * d.radius;
            talisman.position.z = Math.sin(d.angle) * d.radius;
            talisman.position.y = d.baseY + Math.sin(time * d.waveSpeed) * 2.0;

            talisman.rotation.x = d.rotX + Math.sin(time) * 0.2;
            talisman.rotation.y = d.rotY + time * 0.1;
            talisman.rotation.z = d.rotZ + Math.cos(time) * 0.2;
            
            // 简单的顶点动画模拟纸张飘动
            const pos = talisman.geometry.attributes.position;
            for(let i=0; i<pos.count; i++) {
                const px = pos.getX(i);
                const py = pos.getY(i);
                const pz = Math.sin(px * 2.0 + time * 3.0) * 0.2 + Math.cos(py + time) * 0.1;
                pos.setZ(i, pz);
            }
            pos.needsUpdate = true;
        });

        // 墨滴向上飘浮
        if (this.inkParticles) {
            const p = this.inkParticles.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let y = p.getY(i);
                y += 0.08 + Math.random() * 0.02; // 墨滴升腾
                if (y > 18) y = -2;
                p.setY(i, y);
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
