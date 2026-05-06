// 秘境 3D 场景（探索冒险）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_mijing.png';

export class MijingScene {
    constructor() { this.group = new THREE.Group(); }

    build(scene, camera, spark) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // 荧光粒子
        const glowGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(800 * 3);
        const colors = new Float32Array(800 * 3);
        for (let i = 0; i < 800; i++) {
            pos[i*3] = (Math.random()-0.5)*25;
            pos[i*3+1] = Math.random()*10 - 2;
            pos[i*3+2] = (Math.random()-0.5)*15 - 5;
            const c = new THREE.Color().setHSL(0.75 + Math.random()*0.15, 0.6, 0.5);
            colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
        }
        glowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        glowGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
        const particles = new THREE.Points(glowGeo, mat);
        particles.userData = { float: true };
        this.group.add(particles);

        // 地脉光圈
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(2, 4.5, 48),
            new THREE.MeshBasicMaterial({ color: 0x7bed9f, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.position.set(0, -1.8, 0);
        ring.rotation.x = -Math.PI / 2;
        ring.userData = { pulse: true };
        this.group.add(ring);
    }

    animate(time) {
        this.group.children.forEach(c => {
            if (c.userData?.float) {
                const p = c.geometry.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    p.array[i*3+1] += Math.sin(time + i*0.1) * 0.0005;
                }
                p.needsUpdate = true;
            }
            if (c.userData?.pulse) {
                c.scale.setScalar(1 + Math.sin(time * 0.5) * 0.05);
                c.material.opacity = 0.03 + Math.sin(time * 0.5) * 0.025;
            }
        });
    }
}
