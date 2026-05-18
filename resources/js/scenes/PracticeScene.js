// LevelUp 英语修仙 - 练功房 3D 场景（发光灵草药园）
import * as THREE from 'three';
import vocabBg from '../../assets/images/scene_practice_vocab.png';
import dangeBg from '../../assets/images/scene_practice_dange.png';
import listeningBg from '../../assets/images/scene_listening.png';
import speakingBg from '../../assets/images/scene_speaking.png';
import writingBg from '../../assets/images/scene_writing.png';

export class PracticeScene {
    constructor() { this.group = new THREE.Group(); this.herbs = []; this.fireflies = null; }

    build(scene, camera, spark, options = {}) {
        const mode = options?.mode || 'vocab';
        const bgMap = {
            vocab: vocabBg,
            dange: dangeBg,
            listening: listeningBg,
            speaking: speakingBg,
            writing: writingBg,
        };

        const loader = new THREE.TextureLoader();
        loader.load(bgMap[mode] || vocabBg, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            scene.background = tex;
        });

        // 地坪
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshBasicMaterial({ color: 0x0a1a2e, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        this.group.add(ground);

        // 发光地环
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(2, 4, 32),
            new THREE.MeshBasicMaterial({ color: 0x4ec07a, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
        );
        glow.position.set(0, -1.8, 0);
        glow.rotation.x = -Math.PI / 2;
        glow.userData = { pulse: true };
        this.group.add(glow);

        // 灵草
        const colors = [0x4ec07a, 0x7bed9f, 0x70a1ff, 0xffa502, 0xd4a843];
        for (let i = 0; i < 30; i++) {
            const herb = new THREE.Group();
            const h = 0.3 + Math.random() * 0.6;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 4), new THREE.MeshBasicMaterial({ color: 0x2d8a4e }));
            stem.position.y = h / 2;
            herb.add(stem);
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random()*0.08, 6, 6),
                new THREE.MeshBasicMaterial({ color: colors[i%colors.length], transparent: true, opacity: 0.5 + Math.random()*0.4 }));
            leaf.position.y = h;
            herb.add(leaf);
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.5 + Math.random() * 2.5;
            herb.position.set(Math.cos(angle)*radius, -2, Math.sin(angle)*radius);
            herb.userData = { floatSpeed: 0.2 + Math.random()*0.3, floatOffset: Math.random()*Math.PI*2 };
            this.group.add(herb);
            this.herbs.push(herb);
        }

        // 萤火虫
        const ff = new THREE.BufferGeometry();
        const fp = new Float32Array(80 * 3);
        for (let i = 0; i < 80; i++) {
            fp[i*3] = (Math.random()-0.5) * 10;
            fp[i*3+1] = -1 + Math.random() * 4;
            fp[i*3+2] = (Math.random()-0.5) * 8 - 2;
        }
        ff.setAttribute('position', new THREE.BufferAttribute(fp, 3));
        this.fireflies = new THREE.Points(ff, new THREE.PointsMaterial({ color: 0xf0d68a, size: 0.05, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
        this.fireflies.userData = { float: true };
        this.group.add(this.fireflies);
    }

    animate(time) {
        this.group.children.forEach(c => {
            if (c.userData?.pulse) {
                c.scale.setScalar(1 + Math.sin(time*0.3)*0.03);
            }
        });
        this.herbs.forEach((h, i) => {
            h.position.y += Math.sin(time * h.userData.floatSpeed + h.userData.floatOffset) * 0.001;
        });
        if (this.fireflies) {
            const p = this.fireflies.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                p.array[i*3+1] += Math.sin(time + i) * 0.001;
            }
            p.needsUpdate = true;
        }
    }
}
