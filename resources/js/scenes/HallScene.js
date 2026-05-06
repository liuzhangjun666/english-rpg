// LevelUp 英语修仙 - 宗门大厅 3D 场景（Spark 2.0 + Three.js r180）
import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import bgHall from '../../assets/images/bg_hall.png';

export class HallScene {
    build(scene, camera, spark) {
        // ---------- 水墨古风背景 ----------
        const loader = new THREE.TextureLoader();
        loader.load(bgHall, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            scene.background = tex;
        });

        // ---------- 灯光 ----------
        const ambient = new THREE.AmbientLight(0x4466aa, 0.6);
        scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.6);
        dirLight.position.set(8, 15, 10);
        scene.add(dirLight);
        const centerGlow = new THREE.PointLight(0xc9a846, 1.2, 25);
        centerGlow.position.set(0, 3, 0);
        scene.add(centerGlow);

        // ---------- 粒子星空 ----------
        const starCount = 2000;
        const starGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(starCount * 3);
        const col = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 30 + Math.random() * 50;
            pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
            pos[i*3+1] = Math.abs(r * Math.cos(phi));
            pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
            const gold = Math.random() > 0.7;
            col[i*3]   = gold ? 0.85 : 0.3 + Math.random() * 0.3;
            col[i*3+1] = gold ? 0.65 : 0.3 + Math.random() * 0.2;
            col[i*3+2] = gold ? 0.35 : 0.4 + Math.random() * 0.3;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
            size: 0.18, vertexColors: true, transparent: true, opacity: 0.85,
            blending: THREE.AdditiveBlending, sizeAttenuation: true,
        }));
        scene.add(stars);
        this.stars = stars;

        // ---------- 悬浮石台 ----------
        const platform = new THREE.Mesh(
            new THREE.CylinderGeometry(5.5, 6.5, 0.6, 48),
            new THREE.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.6, metalness: 0.4, emissive: 0x0a1520, emissiveIntensity: 0.15 })
        );
        platform.position.y = -0.3;
        scene.add(platform);

        // ---------- 金色符文环 ----------
        for (let layer = 0; layer < 2; layer++) {
            const ringR = 5.8 + layer * 0.5;
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(ringR - 0.1, ringR + 0.15, 64),
                new THREE.MeshBasicMaterial({ color: 0xc9a846, transparent: true, opacity: 0.12 + layer * 0.04, side: THREE.DoubleSide })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.06 + layer * 0.02;
            ring.userData.spinSpeed = 0.001 + layer * 0.001;
            scene.add(ring);
        }

        // ---------- 天书碑 (四柱) ----------
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.8, metalness: 0.2, emissive: 0x1a2a3a, emissiveIntensity: 0.1 });
        const pillarPositions = [[-4, 0, -3.5], [4, 0, -3.5], [-4, 0, 3.5], [4, 0, 3.5]];
        const colors = [0xc9a846, 0x4ecdc4, 0xff6b6b, 0x6c5ce7];
        this.pillarGems = [];
        pillarPositions.forEach(([x, _, z], i) => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.4), pillarMat);
            pillar.position.set(x, 1.5, z);
            scene.add(pillar);
            const gem = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.25, 0),
                new THREE.MeshPhongMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })
            );
            gem.position.set(x, 3.8, z);
            gem.userData = { floatSpeed: 0.8 + i * 0.2, floatOffset: i * 1.5 };
            scene.add(gem);
            this.pillarGems.push(gem);
        });

        // ---------- Spark 2.0 3DGS 灵蝶装饰 ----------
        this.butterfly = null;
        if (spark) {
            try {
                const splatURL = 'https://sparkjs.dev/assets/splats/butterfly.spz';
                this.butterfly = new SplatMesh({
                    url: splatURL,
                    maxSplats: 500000,
                    foveated: true,
                });
                this.butterfly.position.set(-1.0, 2.8, -0.5);
                this.butterfly.scale.set(1.5, 1.5, 1.5);
                scene.add(this.butterfly);
                console.log('[Hall] Spark 2.0 3DGS 灵蝶加载 ✓');
            } catch (e) {
                console.warn('[Hall] Spark 3DGS 跳过:', e.message);
            }
        }

        // ---------- 灵气球 (6个入口) ----------
        this.orbs = [];
        const orbColors = [0xc9a846, 0x4ecdc4, 0xff6b6b, 0xffd93d, 0x6c5ce7, 0x00cec9];
        for (let i = 0; i < 6; i++) {
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 16, 16),
                new THREE.MeshPhongMaterial({ color: orbColors[i], emissive: orbColors[i], emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })
            );
            const angle = (i / 6) * Math.PI * 2;
            const radius = 3.2 + Math.random() * 0.8;
            orb.position.set(Math.cos(angle) * radius, 1.5 + Math.random(), Math.sin(angle) * radius);
            orb.userData = {
                angle, radius, baseY: orb.position.y,
                speed: 0.25 + Math.random() * 0.15,
                floatSpeed: 1.2 + Math.random() * 0.5, floatOffset: Math.random() * 100,
                label: ['练功房','藏经阁','试炼场','Hermes','错题','个人'][i],
            };
            scene.add(orb);
            this.orbs.push(orb);

            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.55, 12, 12),
                new THREE.MeshBasicMaterial({ color: orbColors[i], transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending })
            );
            glow.position.copy(orb.position);
            scene.add(glow);
        }
    }

    animate(time) {
        if (this.stars) {
            this.stars.rotation.y += 0.0004;
            this.stars.rotation.x += 0.00015;
        }
        if (this.orbs) {
            this.orbs.forEach(orb => {
                const d = orb.userData;
                const a = d.angle + time * d.speed;
                orb.position.x = Math.cos(a) * d.radius;
                orb.position.z = Math.sin(a) * d.radius;
                orb.position.y = d.baseY + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.4;
                const s = 1 + Math.sin(time * 2.5) * 0.15;
                orb.scale.set(s, s, s);
            });
        }
        if (this.pillarGems) {
            this.pillarGems.forEach(gem => {
                const d = gem.userData;
                gem.position.y = 3.8 + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.2;
            });
        }
        if (this.butterfly) {
            this.butterfly.rotation.y += 0.008;
            this.butterfly.position.y = 2.8 + Math.sin(time * 1.2) * 0.3;
        }
    }
}
