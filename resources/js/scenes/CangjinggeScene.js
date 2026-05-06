// 藏经阁 3D 场景（语法/阅读）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_cangjingge.png';

export class CangjinggeScene {
    constructor() { this.group = new THREE.Group(); }

    build(scene, camera, spark) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // 飘落的书页粒子
        const pageGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(300 * 3);
        for (let i = 0; i < 300; i++) {
            pos[i*3] = (Math.random()-0.5)*20;
            pos[i*3+1] = Math.random()*15 - 2;
            pos[i*3+2] = (Math.random()-0.5)*15 - 5;
        }
        pageGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pageMat = new THREE.PointsMaterial({ color: 0xf5f0e8, size: 0.06, transparent: true, opacity: 0.2 });
        const pages = new THREE.Points(pageGeo, pageMat);
        pages.userData = { fall: true };
        this.group.add(pages);

        // 暖色灯笼光
        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xf0d68a, transparent: true, opacity: 0.08 })
        );
        light.position.set(0, 1, -2);
        light.userData = { glow: true };
        this.group.add(light);
    }

    animate(time) {
        this.group.children.forEach(c => {
            if (c.userData?.fall) {
                const p = c.geometry.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    p.array[i*3+1] -= 0.003;
                    if (p.array[i*3+1] < -5) p.array[i*3+1] = 10;
                }
                p.needsUpdate = true;
            }
            if (c.userData?.glow) {
                c.material.opacity = 0.05 + Math.sin(time * 0.8) * 0.04;
            }
        });
    }
}
