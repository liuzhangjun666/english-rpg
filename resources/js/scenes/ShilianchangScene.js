// 试炼场 3D 场景（渡劫检测）- 圆形竞技场+云海+雷云+灵气球
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_breakthrough.png';

export class ShilianchangScene {
    constructor() {
        this.group = new THREE.Group();
        this.boltTime = 0;
        this.timeouts = new Set();
        this.tempEffects = new Set();
        this.sceneRef = null;
    }

    build(scene) {
        this.sceneRef = scene;
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // 渡劫台光晕
        const platformRing = new THREE.Mesh(
            new THREE.RingGeometry(1.8, 3.5, 48),
            new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })
        );
        platformRing.position.set(0, -1.5, 0);
        platformRing.rotation.x = -Math.PI / 2;
        platformRing.userData = { pulse: true };
        this.group.add(platformRing);

        // 雷云粒子（动态闪电）
        const cloudGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(1000 * 3);
        for (let i = 0; i < 1000; i++) {
            pos[i*3] = (Math.random()-0.5)*35;
            pos[i*3+1] = 5 + Math.random()*8;
            pos[i*3+2] = (Math.random()-0.5)*25 - 5;
        }
        cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const cloudMat = new THREE.PointsMaterial({
            color: 0x1a1a3e, size: 0.3, transparent: true, opacity: 0.6
        });
        this.cloud = new THREE.Points(cloudGeo, cloudMat);
        this.group.add(this.cloud);

        // 闪电粒子
        const boltGeo = new THREE.BufferGeometry();
        const boltPos = new Float32Array(400 * 3);
        for (let i = 0; i < 400; i++) {
            boltPos[i*3] = (Math.random()-0.5)*30;
            boltPos[i*3+1] = Math.random()*15;
            boltPos[i*3+2] = (Math.random()-0.5)*20 - 5;
        }
        boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
        boltGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(400*3).fill(0.7), 3));
        this.bolts = new THREE.Points(boltGeo, new THREE.PointsMaterial({
            color: 0x70a1ff, size: 0.12, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        }));
        this.group.add(this.bolts);

        // 灵气球（答题标识）
        for (let i = 0; i < 12; i++) {
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.15 + Math.random()*0.1, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: [0xd4a843,0x4a90d9,0x4ec07a,0xf0d68a][i%4],
                    transparent: true, opacity: 0.2 + Math.random()*0.2
                })
            );
            const angle = (i/12)*Math.PI*2 + Math.random()*0.3;
            const rad = 2 + Math.random()*1.5;
            orb.position.set(Math.cos(angle)*rad, Math.random()*3, Math.sin(angle)*rad - 2);
            orb.userData = { angle, rad, speed: 0.1+Math.random()*0.2, floatOff: Math.random()*Math.PI*2 };
            this.group.add(orb);
        }

        // 云海雾效（底部）
        const fog = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 20),
            new THREE.MeshBasicMaterial({ color: 0x1a1a3e, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
        );
        fog.position.set(0, -3, -8);
        fog.rotation.x = -0.2;
        this.group.add(fog);
        scene.add(this.group);
    }

    animate(time) {
        this.boltTime += 0.01;
        // 闪电闪烁
        if (this.bolts) {
            const flash = Math.sin(this.boltTime * 7) > 0.92 ? 0.8 : 0;
            this.bolts.material.opacity = flash;
            if (flash > 0) { // 闪电瞬间变色
                this.bolts.material.color.setHSL(0.6, 1, 0.7);
            }
        }
        // 灵气球旋转
        this.group.children.forEach(c => {
            if (c.userData?.speed) {
                c.userData.angle += c.userData.speed * 0.008;
                c.position.x = Math.cos(c.userData.angle) * c.userData.rad;
                c.position.z = Math.sin(c.userData.angle) * c.userData.rad - 2;
                c.position.y += Math.sin(time + c.userData.floatOff) * 0.002;
            }
            if (c.userData?.pulse) {
                c.scale.setScalar(1 + Math.sin(time*0.4)*0.04);
            }
        });
    }

    /** 评级特效：在场景中显示对应评级视觉效果 */
    showGradeEffect(grade, scene = this.sceneRef) {
        if (!scene) return;
        const colors = { S: 0xf0d68a, A: 0x9b59b6, B: 0x3498db, C: 0x2ecc71, D: 0x95a5a6 };
        const color = colors[grade] || 0x95a5a6;

        // 评级光柱
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 2, 8, 16, 1, true),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false })
        );
        beam.position.set(0, 2, 0);
        scene.add(beam);
        this.tempEffects.add(beam);
        this.setSceneTimeout(() => this.removeTempEffect(beam), 3000);

        // 评级粒子爆发
        const burstGeo = new THREE.BufferGeometry();
        const bPos = new Float32Array(200 * 3);
        for (let i = 0; i < 200; i++) {
            const dir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
            bPos[i*3] = dir.x * 2;
            bPos[i*3+1] = dir.y * 2 + 2;
            bPos[i*3+2] = dir.z * 2;
        }
        burstGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
        const burst = new THREE.Points(burstGeo, new THREE.PointsMaterial({
            color, size: 0.15, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending
        }));
        scene.add(burst);
        this.tempEffects.add(burst);
        this.setSceneTimeout(() => this.removeTempEffect(burst), 2000);
    }

    setSceneTimeout(callback, delay) {
        const timer = setTimeout(() => {
            this.timeouts.delete(timer);
            callback();
        }, delay);
        this.timeouts.add(timer);
        return timer;
    }

    removeTempEffect(object) {
        if (!object) return;
        this.sceneRef?.remove(object);
        this.tempEffects.delete(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
    }

    destroy() {
        this.timeouts.forEach((timer) => clearTimeout(timer));
        this.timeouts.clear();
        Array.from(this.tempEffects).forEach((object) => this.removeTempEffect(object));
        this.sceneRef = null;
    }
}
