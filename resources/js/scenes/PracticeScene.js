// 练功房 3D 场景（词汇修炼 - 万古剑冢 / 混沌剑阵）
import * as THREE from 'three';

export class PracticeScene {
    constructor() {
        this.group = new THREE.Group();
        this.swords = [];
        this.swordPhantoms = [];
        this.optionsGroup = new THREE.Group();
        this.group.add(this.optionsGroup);
        
        // 场景光照 (深空幽蓝)
        this.ambientLight = new THREE.AmbientLight(0x0a1530, 1.2);
        this.group.add(this.ambientLight);

        // 剑阵中心光源
        this.centerLight = new THREE.PointLight(0x44aaff, 1.5, 25);
        this.centerLight.position.set(0, 2.0, 0);
        this.group.add(this.centerLight);
        
        this.time = 0;
    }

    build(scene, camera, blocker, options = {}) {
        this.sceneRef = scene;

        // 1. 冰冷深邃的深渊背景
        scene.background = new THREE.Color(0x020510);
        scene.fog = new THREE.FogExp2(0x020510, 0.025);

        // 2. 悬空太极八卦剑台
        this.createBaguaPlatform();

        // 3. 远古残缺飞剑阵
        this.createSwordTomb();

        // 4. 剑气/冰晶粒子
        this.createSwordAuraParticles();

        scene.add(this.group);
    }

    createBaguaPlatform() {
        this.platformGroup = new THREE.Group();
        this.platformGroup.position.y = -2.5;

        // 石质底盘
        const baseGeo = new THREE.CylinderGeometry(8, 6, 1.5, 8); // 八边形底座
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x111522,
            roughness: 0.9,
            metalness: 0.2,
            flatShading: true
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        this.platformGroup.add(base);

        // 发光阵法边缘
        const ringGeo = new THREE.RingGeometry(7.8, 8.2, 8);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.76;
        // 调整对齐八边形
        ring.rotation.z = Math.PI / 8;
        this.platformGroup.add(ring);

        // 悬浮的小型护卫剑
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
            const guardGeo = new THREE.ConeGeometry(0.2, 2.0, 4);
            const guardMat = new THREE.MeshStandardMaterial({
                color: 0x88ccff,
                roughness: 0.3,
                metalness: 0.9,
                emissive: 0x002244
            });
            const guard = new THREE.Mesh(guardGeo, guardMat);
            guard.position.set(Math.cos(angle) * 7.5, 1.5, Math.sin(angle) * 7.5);
            guard.rotation.x = Math.PI; // 剑尖朝下
            
            // 保存初始数据用于悬浮动画
            guard.userData = { baseY: 1.5, offset: i * Math.PI * 0.25 };
            
            this.platformGroup.add(guard);
            this.swords.push(guard); // 加入动画队列
        }

        this.group.add(this.platformGroup);
    }

    createSwordTomb() {
        const numSwords = 25;
        
        // 巨剑材质
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x223344,
            roughness: 0.5,
            metalness: 0.8,
            flatShading: true
        });

        const hiltMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.9
        });

        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        for (let i = 0; i < numSwords; i++) {
            const swordGroup = new THREE.Group();
            
            // 剑身 (倒插的长条形)
            const length = 15 + Math.random() * 15;
            const bladeGeo = new THREE.BoxGeometry(1.5, length, 0.3);
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.y = length / 2;
            swordGroup.add(blade);
            
            // 剑尖
            const tipGeo = new THREE.ConeGeometry(1.0, 3.0, 4);
            const tip = new THREE.Mesh(tipGeo, bladeMat);
            tip.position.y = length + 1.5;
            tip.rotation.y = Math.PI / 4;
            swordGroup.add(tip);

            // 剑柄护手
            const crossGeo = new THREE.BoxGeometry(3.0, 0.5, 0.6);
            const cross = new THREE.Mesh(crossGeo, hiltMat);
            cross.position.y = 0;
            swordGroup.add(cross);

            // 剑脊上的发光符文槽 (随机出现)
            if (Math.random() > 0.5) {
                const runeGeo = new THREE.BoxGeometry(0.2, length * 0.6, 0.35);
                const rune = new THREE.Mesh(runeGeo, glowMat);
                rune.position.y = length / 2;
                swordGroup.add(rune);
            }

            // 在四周随机生成
            let angle = Math.random() * Math.PI * 2;
            let radius = 18 + Math.random() * 40;
            
            swordGroup.position.set(
                Math.cos(angle) * radius,
                -10 - Math.random() * 20, // 底部深渊
                Math.sin(angle) * radius
            );
            
            // 倾斜倒插
            swordGroup.rotation.x = Math.PI + (Math.random() - 0.5) * 0.5;
            swordGroup.rotation.z = (Math.random() - 0.5) * 0.5;
            swordGroup.rotation.y = Math.random() * Math.PI * 2;

            const scale = 0.5 + Math.random() * 1.5;
            swordGroup.scale.setScalar(scale);

            swordGroup.userData = {
                phase: Math.random() * Math.PI * 2,
                swaySpeed: 0.2 + Math.random() * 0.3
            };

            this.group.add(swordGroup);
            this.swords.push(swordGroup);
        }
    }

    createSwordAuraParticles() {
        const geo = new THREE.BufferGeometry();
        const numParticles = 800;
        const pos = new Float32Array(numParticles * 3);
        const sizes = new Float32Array(numParticles);
        this.particleData = [];

        for (let i = 0; i < numParticles; i++) {
            const x = (Math.random() - 0.5) * 60;
            const y = -10 + Math.random() * 30;
            const z = (Math.random() - 0.5) * 60;

            pos[i*3] = x;
            pos[i*3+1] = y;
            pos[i*3+2] = z;
            sizes[i] = Math.random();

            this.particleData.push({
                x: x, baseY: y, z: z,
                speed: 0.2 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        // 剑气形状 (锋利的拉长光点)
        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0xaaccff) }
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (30.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    // 绘制拉长的剑气形状
                    vec2 uv = gl_PointCoord - 0.5;
                    float dist = length(vec2(uv.x * 0.2, uv.y * 2.0));
                    float alpha = smoothstep(0.4, 0.0, dist);
                    gl_FragColor = vec4(color, alpha * 0.7);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        };

        this.auraPoints = new THREE.Points(geo, new THREE.ShaderMaterial(shader));
        this.group.add(this.auraPoints);
    }

    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(2, 5, 16, 0.8)'; // 深蓝色底
        ctx.fill();
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 512, 128);
        
        ctx.font = 'bold 42px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText(text, 256, 64);
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(4, 1, 1);
        return sprite;
    }

    spawnOptions(options) {
        while(this.optionsGroup.children.length > 0) {
            const child = this.optionsGroup.children[0];
            this.optionsGroup.remove(child);
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
        }

        const radius = 3.5;
        options.forEach((opt, i) => {
            const angle = (i / options.length) * Math.PI * 2;
            const text = typeof opt === 'string' ? opt : (opt.text || opt.label);
            const value = typeof opt === 'string' ? opt : (opt.value || opt.id);
            
            const sprite = this.createTextSprite(text);
            sprite.position.set(Math.cos(angle) * radius, 1.5, Math.sin(angle) * radius);
            
            sprite.userData = { 
                interactable: true, 
                action: 'answer_option', 
                value: value,
                baseY: 1.5,
                offset: i * Math.PI * 0.5
            };
            this.optionsGroup.add(sprite);
        });
    }

    triggerCorrectEffect() {
        // 答对时，中心生成万剑归宗的光剑残影虚影
        for (let i = 0; i < 3; i++) {
            const phantomGeo = new THREE.ConeGeometry(0.3, 4.0, 4);
            const phantomMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const phantom = new THREE.Mesh(phantomGeo, phantomMat);
            
            // 从下方快速刺出
            phantom.position.set(
                (Math.random() - 0.5) * 4.0,
                -4.0,
                (Math.random() - 0.5) * 4.0
            );
            
            phantom.rotation.x = (Math.random() - 0.5) * 0.5;
            phantom.rotation.z = (Math.random() - 0.5) * 0.5;
            
            phantom.userData = {
                life: 1.0,
                speedY: 0.5 + Math.random() * 0.5
            };
            
            this.group.add(phantom);
            this.swordPhantoms.push(phantom);
        }

        // 光源闪烁爆发
        this.centerLight.intensity = 6.0;
    }

    animate(time) {
        this.time = time;

        // 剑台缓缓旋转
        if (this.platformGroup) {
            this.platformGroup.rotation.y = time * 0.05;
        }

        // 光源强度缓缓恢复
        if (this.centerLight.intensity > 1.5) {
            this.centerLight.intensity -= 0.15;
        } else {
            this.centerLight.intensity = 1.5 + Math.sin(time * 3.0) * 0.2;
        }

        // 巨剑与护卫小剑的悬浮/微动
        this.swords.forEach(sword => {
            const u = sword.userData;
            if (u.baseY !== undefined) {
                // 这是护卫小剑
                sword.position.y = u.baseY + Math.sin(time * 2.0 + u.offset) * 0.2;
            } else {
                // 巨剑微小晃动
                sword.rotation.x += Math.sin(time * u.swaySpeed + u.phase) * 0.0005;
            }
        });

        // 剑气粒子上升漂浮
        if (this.auraPoints) {
            const pos = this.auraPoints.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const data = this.particleData[i];
                let y = data.baseY + (time * data.speed * 5.0) % 40.0;
                // 让剑气带点左右摇摆
                let x = data.x + Math.sin(time + data.phase) * 0.5;
                
                pos.setXYZ(i, x, y, data.z);
            }
            pos.needsUpdate = true;
        }

        // 悬浮选项浮动
        this.optionsGroup.children.forEach(child => {
            child.position.y = child.userData.baseY + Math.sin(time * 2 + child.userData.offset) * 0.2;
        });

        // 答对时的光剑虚影飞出特效
        for (let i = this.swordPhantoms.length - 1; i >= 0; i--) {
            const phantom = this.swordPhantoms[i];
            phantom.position.y += phantom.userData.speedY;
            phantom.userData.life -= 0.02;
            phantom.material.opacity = Math.max(0, phantom.userData.life);
            
            if (phantom.userData.life <= 0) {
                this.group.remove(phantom);
                phantom.geometry.dispose();
                phantom.material.dispose();
                this.swordPhantoms.splice(i, 1);
            }
        }
    }

    destroy() {
        if (this.sceneRef) {
            this.sceneRef.background = null;
            this.sceneRef.fog = null;
        }
    }
}
