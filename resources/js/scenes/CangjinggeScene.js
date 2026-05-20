// 藏经阁 3D 场景（语法修炼）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_cangjingge_gpt.png';

export class CangjinggeScene {
    constructor() {
        this.group = new THREE.Group();
        this.pages = null;
        this.motes = null;
        this.lampNodes = [];
        this.floatRunes = [];
        this.floorCharge = 0;
        this.scrollBursts = [];
        this.nextLampFlickerAt = 0;
    }

    build(scene) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;
        scene.add(this.group);

        const pageGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(300 * 3);
        for (let i = 0; i < 300; i++) {
            pos[i*3] = (Math.random()-0.5)*20;
            pos[i*3+1] = Math.random()*15 - 2;
            pos[i*3+2] = (Math.random()-0.5)*15 - 5;
        }
        pageGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pageMat = new THREE.PointsMaterial({ color: 0xf5f0e8, size: 0.06, transparent: true, opacity: 0.2 });
        this.pages = new THREE.Points(pageGeo, pageMat);
        this.pages.userData = { fall: true };
        this.group.add(this.pages);

        const moteGeo = new THREE.BufferGeometry();
        const motePos = new Float32Array(240 * 3);
        for (let i = 0; i < 240; i++) {
            motePos[i * 3] = (Math.random() - 0.5) * 10;
            motePos[i * 3 + 1] = -1.2 + Math.random() * 6;
            motePos[i * 3 + 2] = -3 + (Math.random() - 0.5) * 5;
        }
        moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
        this.motes = new THREE.Points(
            moteGeo,
            new THREE.PointsMaterial({
                color: 0xf9dd98,
                size: 0.04,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
            })
        );
        this.group.add(this.motes);

        const coreGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xf0d68a,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
            })
        );
        coreGlow.position.set(0, 1.2, -2);
        coreGlow.userData = { glow: true };
        this.group.add(coreGlow);

        for (let i = 0; i < 9; i++) {
            const lamp = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 14, 14),
                new THREE.MeshBasicMaterial({
                    color: 0xf0d68a,
                    transparent: true,
                    opacity: 0.12,
                })
            );
            lamp.position.set(-3.4 + i * 0.85, 2.7 + Math.sin(i) * 0.3, -2.8);
            lamp.userData = { targetOpacity: 0.12 };
            this.lampNodes.push(lamp);
            this.group.add(lamp);
        }

        for (let i = 0; i < 12; i++) {
            const rune = new THREE.Mesh(
                new THREE.PlaneGeometry(0.16, 0.38),
                new THREE.MeshBasicMaterial({
                    color: 0xf5d28a,
                    transparent: true,
                    opacity: 0.22,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                })
            );
            rune.position.set((Math.random() - 0.5) * 7.2, -1 + Math.random() * 4.6, -2.5 + (Math.random() - 0.5) * 2.5);
            rune.userData = {
                vy: 0.004 + Math.random() * 0.005,
                sway: 0.14 + Math.random() * 0.12,
                phase: Math.random() * Math.PI * 2,
                rot: (Math.random() - 0.5) * 0.015,
            };
            this.floatRunes.push(rune);
            this.group.add(rune);
        }
        this.nextLampFlickerAt = performance.now() + 700;
    }

    onGrammarAnswer(payload = {}) {
        if (payload.correct) {
            this.floorCharge = Math.min(100, this.floorCharge + 16);
            this.spawnScrollBurst();
            const activeCount = Math.min(this.lampNodes.length, Math.floor(this.floorCharge / 12));
            this.lampNodes.forEach((lamp, idx) => {
                lamp.userData.targetOpacity = idx < activeCount ? 0.45 : 0.12;
            });
        } else {
            this.floorCharge = Math.max(0, this.floorCharge - 10);
            this.lampNodes.forEach((lamp) => {
                lamp.userData.targetOpacity = Math.max(0.08, lamp.userData.targetOpacity * 0.82);
            });
        }
    }

    onFloorUnlock(payload = {}) {
        const floor = Number(payload.floor || 1);
        const count = Math.min(this.lampNodes.length, floor);
        this.lampNodes.forEach((lamp, idx) => {
            lamp.userData.targetOpacity = idx < count ? 0.58 : 0.14;
            if (idx < count) lamp.material.color.set(0xffe6a6);
        });
    }

    spawnScrollBurst() {
        const burst = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const strip = new THREE.Mesh(
                new THREE.PlaneGeometry(0.07, 0.22),
                new THREE.MeshBasicMaterial({
                    color: 0xfbe8b8,
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide,
                })
            );
            strip.position.set((Math.random() - 0.5) * 0.4, 0.2 + Math.random() * 0.5, -1.6 + (Math.random() - 0.5) * 0.3);
            strip.rotation.z = (Math.random() - 0.5) * 0.8;
            strip.userData = {
                vx: (Math.random() - 0.5) * 0.03,
                vy: 0.03 + Math.random() * 0.02,
                rot: (Math.random() - 0.5) * 0.08,
            };
            burst.add(strip);
        }
        burst.userData = { bornAt: performance.now(), ttl: 620 };
        this.group.add(burst);
        this.scrollBursts.push(burst);
    }

    animate(time) {
        this.group.children.forEach((c) => {
            if (c.userData?.fall && c.geometry?.attributes?.position) {
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

        this.lampNodes.forEach((lamp, idx) => {
            const target = lamp.userData.targetOpacity || 0.12;
            lamp.material.opacity += (target - lamp.material.opacity) * 0.08;
            lamp.position.y += Math.sin(time * 1.1 + idx * 0.7) * 0.0009;
        });

        if (this.motes) {
            const p = this.motes.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                p.array[i * 3] += Math.sin(time * 0.45 + i * 0.17) * 0.0008;
                p.array[i * 3 + 1] += 0.0012 + Math.sin(time * 0.7 + i * 0.09) * 0.0004;
                if (p.array[i * 3 + 1] > 5.2) p.array[i * 3 + 1] = -1.4;
            }
            p.needsUpdate = true;
        }

        this.floatRunes.forEach((rune, idx) => {
            const d = rune.userData;
            rune.position.y += d.vy;
            rune.position.x += Math.sin(time * 0.8 + d.phase + idx * 0.3) * 0.0016 * d.sway;
            rune.rotation.z += d.rot;
            if (rune.position.y > 4.8) rune.position.y = -1.6;
            rune.material.opacity = 0.16 + Math.sin(time * 1.2 + d.phase) * 0.08;
        });

        const now = performance.now();
        if (now >= this.nextLampFlickerAt) {
            const idx = Math.floor(Math.random() * this.lampNodes.length);
            const lamp = this.lampNodes[idx];
            if (lamp) lamp.userData.targetOpacity = Math.min(0.68, (lamp.userData.targetOpacity || 0.12) + 0.22);
            this.nextLampFlickerAt = now + 380 + Math.random() * 920;
        }

        this.scrollBursts = this.scrollBursts.filter((burst) => {
            const life = now - (burst.userData?.bornAt || now);
            const ttl = burst.userData?.ttl || 500;
            const alpha = Math.max(0, 1 - life / ttl);
            burst.children.forEach((strip) => {
                strip.position.x += strip.userData.vx;
                strip.position.y += strip.userData.vy;
                strip.rotation.z += strip.userData.rot;
                strip.material.opacity = alpha * 0.75;
            });
            if (life >= ttl) {
                burst.children.forEach((strip) => {
                    strip.geometry.dispose();
                    strip.material.dispose();
                });
                this.group.remove(burst);
                return false;
            }
            return true;
        });

        this.group.rotation.y = Math.sin(time * 0.1) * 0.01;
    }
}
