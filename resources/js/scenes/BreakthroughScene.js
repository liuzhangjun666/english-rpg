// 突破天象 3D 场景（过关完成/境界突破特效）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_breakthrough.png';

export class BreakthroughScene {
    constructor() { this.group = new THREE.Group(); }

    build(scene, camera, spark) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // 金光粒子阵
        const goldGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(600 * 3);
        for (let i = 0; i < 600; i++) {
            pos[i*3] = (Math.random()-0.5)*30;
            pos[i*3+1] = (Math.random()-0.5)*20;
            pos[i*3+2] = (Math.random()-0.5)*20 - 5;
        }
        goldGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const gold = new THREE.Points(goldGeo, new THREE.PointsMaterial({
            color: 0xf0d68a, size: 0.08, transparent: true, opacity: 0.3,
            blending: THREE.AdditiveBlending
        }));
        gold.userData = { float: true };
        this.group.add(gold);

        // 祥云光环
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(2 + i*0.8, 0.03, 8, 48),
                new THREE.MeshBasicMaterial({ color: [0xf0d68a,0x4ec07a,0x4a90d9][i], transparent: true, opacity: 0.06 })
            );
            ring.position.set(0, 0, -2);
            ring.rotation.x = Math.PI / 3;
            ring.rotation.z = i * 0.5;
            ring.userData = { spin: true, speed: 0.1 + i*0.05 };
            this.group.add(ring);
        }

        // 修为上涨光柱
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.3, 5, 8),
            new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.1, depthWrite: false })
        );
        beam.position.set(0, 0.5, 0);
        beam.userData = { glow: true };
        this.group.add(beam);

        // 灵脉光点（地面）
        const dots = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 3, 32),
            new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false })
        );
        dots.position.set(0, -1.8, 0);
        dots.rotation.x = -Math.PI / 2;
        dots.userData = { expand: true };
        this.group.add(dots);
    }

    animate(time) {
        this.group.children.forEach(c => {
            if (c.userData?.spin) {
                c.rotation.z += c.userData.speed * 0.01;
            }
            if (c.userData?.glow) {
                c.material.opacity = 0.06 + Math.sin(time) * 0.05;
            }
            if (c.userData?.expand) {
                c.scale.setScalar(1 + Math.sin(time*0.3)*0.05);
                c.material.opacity = 0.02 + Math.sin(time*0.3)*0.025;
            }
            if (c.userData?.float) {
                const p = c.geometry.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    p.array[i*3+1] += Math.sin(time + i*0.05) * 0.0005;
                }
                p.needsUpdate = true;
            }
        });
    }
}
