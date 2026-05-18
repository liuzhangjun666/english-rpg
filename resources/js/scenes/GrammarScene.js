// 阵法峰 3D 场景（语法修炼）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_grammar.png';

export class GrammarScene {
    constructor() { this.group = new THREE.Group(); }

    build(scene) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // 阵纹粒子
        const runeGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(420 * 3);
        for (let i = 0; i < 420; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 22;
            pos[i * 3 + 1] = Math.random() * 12 - 2;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 4;
        }
        runeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const runes = new THREE.Points(
            runeGeo,
            new THREE.PointsMaterial({
                color: 0x72a9ff,
                size: 0.08,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending,
            })
        );
        runes.userData = { flow: true };
        this.group.add(runes);

        // 阵法脉冲环
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(2, 4.6, 48),
            new THREE.MeshBasicMaterial({
                color: 0x72a9ff,
                transparent: true,
                opacity: 0.07,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        ring.position.set(0, -1.7, 0);
        ring.rotation.x = -Math.PI / 2;
        ring.userData = { pulse: true };
        this.group.add(ring);
    }

    animate(time) {
        this.group.children.forEach((c) => {
            if (c.userData?.flow) {
                const p = c.geometry.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    p.array[i * 3 + 1] += Math.sin(time + i * 0.08) * 0.0005;
                }
                p.needsUpdate = true;
            }
            if (c.userData?.pulse) {
                c.scale.setScalar(1 + Math.sin(time * 0.4) * 0.05);
                c.material.opacity = 0.04 + Math.sin(time * 0.4) * 0.03;
            }
        });
    }
}
