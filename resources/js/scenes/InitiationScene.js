// 宗门收徒仪式 3D 场景（长老浮空+白衣弟子+测灵根）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_initiation2.png';

export class InitiationScene {
    constructor() { this.group = new THREE.Group(); this.discipleCount = 20; }

    build(scene, camera, spark) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // 测灵石柱（发光）
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.4, 2.5, 8),
            new THREE.MeshBasicMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.12 })
        );
        pillar.position.set(0, -0.5, 0);
        pillar.userData = { glow: true };
        this.group.add(pillar);

        // 石柱光晕环
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.3, 0.8, 32),
            new THREE.MeshBasicMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.position.set(0, 1, 0);
        ring.rotation.x = -Math.PI / 2;
        ring.userData = { pulse: true };
        this.group.add(ring);

        // 白衣弟子（简化为白色光点矩阵）
        const discipleGeo = new THREE.BufferGeometry();
        const dPos = new Float32Array(this.discipleCount * 3);
        for (let i = 0; i < this.discipleCount; i++) {
            const angle = (i / this.discipleCount) * Math.PI * 2;
            const rad = 2.5 + Math.random() * 1.5;
            dPos[i*3] = Math.cos(angle) * rad;
            dPos[i*3+1] = -1 + Math.random() * 0.3;
            dPos[i*3+2] = Math.sin(angle) * rad;
        }
        discipleGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
        const disciples = new THREE.Points(discipleGeo, new THREE.PointsMaterial({
            color: 0xf5f0e8, size: 0.08, transparent: true, opacity: 0.3
        }));
        this.group.add(disciples);

        // 长老悬浮光效（头顶光圈）
        const halo = new THREE.Mesh(
            new THREE.RingGeometry(0.4, 0.7, 24),
            new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })
        );
        halo.position.set(0, 3.5, -0.5);
        halo.rotation.x = -Math.PI / 3;
        halo.userData = { float: true };
        this.group.add(halo);

        // 香炉青烟
        const smokeGeo = new THREE.BufferGeometry();
        const sPos = new Float32Array(150 * 3);
        for (let i = 0; i < 150; i++) {
            sPos[i*3] = (Math.random()-0.5)*3;
            sPos[i*3+1] = Math.random()*5;
            sPos[i*3+2] = (Math.random()-0.5)*3 - 1;
        }
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
        const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({
            color: 0xcccccc, size: 0.04, transparent: true, opacity: 0.1,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        smoke.userData = { rise: true };
        this.group.add(smoke);
    }

    animate(time) {
        this.group.children.forEach(c => {
            if (c.userData?.glow) {
                c.material.opacity = 0.08 + Math.sin(time) * 0.06;
                c.scale.setScalar(1 + Math.sin(time*0.5)*0.03);
            }
            if (c.userData?.pulse) {
                c.scale.setScalar(1 + Math.sin(time*0.6)*0.05);
                c.material.opacity = 0.05 + Math.sin(time*0.6)*0.04;
            }
            if (c.userData?.float) {
                c.position.y = 3.5 + Math.sin(time*0.3)*0.15;
                c.rotation.z = Math.sin(time*0.2)*0.05;
            }
            if (c.userData?.rise) {
                const p = c.geometry.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    p.array[i*3+1] += 0.004;
                    if (p.array[i*3+1] > 5) p.array[i*3+1] = 0;
                }
                p.needsUpdate = true;
            }
        });
    }
}
