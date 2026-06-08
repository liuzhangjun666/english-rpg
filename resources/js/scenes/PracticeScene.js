// 练功房 3D 场景（聚灵竹海 / 瑶池灵泉）
import * as THREE from 'three';

export class PracticeScene {
    constructor() {
        this.group = new THREE.Group();
        this.bamboos = [];
        this.spiritParticles = [];
        this.optionsGroup = new THREE.Group();
        this.group.add(this.optionsGroup);
        
        // 场景光照
        this.ambientLight = new THREE.AmbientLight(0x05221a, 1.2);
        this.group.add(this.ambientLight);

        // 莲花中心光源
        this.lotusLight = new THREE.PointLight(0x00ffcc, 1.5, 20);
        this.lotusLight.position.set(0, 1.5, 0);
        this.group.add(this.lotusLight);
        
        this.burstRings = [];
        this.time = 0;
    }

    build(scene, camera, blocker, options = {}) {
        this.sceneRef = scene;

        // 1. 宁静幽绿的环境与体积雾
        scene.background = new THREE.Color(0x02100a);
        scene.fog = new THREE.FogExp2(0x02100a, 0.035);

        // 2. 瑶池灵泉 (水面镜面倒影)
        this.createSpiritSpring();

        // 3. 中心发光白莲阵眼
        this.createCenterLotus();

        // 4. 四周的聚灵竹阵
        this.createBambooSea();

        // 5. 灵气微粒
        this.createSpiritParticles();

        scene.add(this.group);
    }

    createSpiritSpring() {
        const geo = new THREE.PlaneGeometry(150, 150);
        // 使用高反光、暗绿色的材质模拟深邃平静的水面
        const mat = new THREE.MeshStandardMaterial({
            color: 0x011a12,
            roughness: 0.05,
            metalness: 0.95,
            transparent: true,
            opacity: 0.9
        });
        const spring = new THREE.Mesh(geo, mat);
        spring.rotation.x = -Math.PI / 2;
        spring.position.y = -2.0;
        this.group.add(spring);
        
        // 水面涟漪辅助光环
        const ringGeo = new THREE.RingGeometry(2, 8, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.05,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const ripple = new THREE.Mesh(ringGeo, ringMat);
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.y = -1.98;
        this.group.add(ripple);
    }

    createCenterLotus() {
        this.lotusGroup = new THREE.Group();
        this.lotusGroup.position.set(0, -2.0, 0);
        
        // 使用多个微调的花瓣构建一朵程序化发光莲花
        const petalGeo = new THREE.SphereGeometry(1.2, 16, 16);
        // 将球体压扁并拉长变成花瓣状
        petalGeo.scale(0.4, 1.5, 0.1);
        // 将几何体原点移到花瓣底部
        petalGeo.translate(0, 1.5, 0);

        const layers = [
            { count: 12, angleOffset: 0.3, scale: 1.0, color: 0xe6ffff, emissive: 0x00ffcc },
            { count: 8, angleOffset: 0.6, scale: 0.7, color: 0xffffff, emissive: 0x00e6b8 }
        ];

        layers.forEach(layer => {
            const mat = new THREE.MeshStandardMaterial({
                color: layer.color,
                emissive: layer.emissive,
                emissiveIntensity: 0.8,
                roughness: 0.2,
                metalness: 0.1,
                transparent: true,
                opacity: 0.9
            });

            for (let i = 0; i < layer.count; i++) {
                const petal = new THREE.Mesh(petalGeo, mat);
                const angle = (i / layer.count) * Math.PI * 2;
                
                petal.rotation.y = angle;
                // 向外绽放的角度
                petal.rotation.x = layer.angleOffset;
                petal.scale.setScalar(layer.scale);
                
                this.lotusGroup.add(petal);
            }
        });

        // 莲花底座 (莲台)
        const baseGeo = new THREE.CylinderGeometry(1.5, 1.0, 0.4, 32);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x004d26,
            emissive: 0x00331a,
            roughness: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.2;
        this.lotusGroup.add(base);

        this.group.add(this.lotusGroup);
    }

    createBambooSea() {
        const numBamboos = 45;
        for (let i = 0; i < numBamboos; i++) {
            // 在水池周围随机生成，避开中心莲花
            let angle = Math.random() * Math.PI * 2;
            let radius = 8 + Math.random() * 25;
            let x = Math.cos(angle) * radius;
            let z = Math.sin(angle) * radius;

            const bamboo = this.createSingleBamboo();
            bamboo.position.set(x, -2.5, z);
            
            // 细微的倾斜和缩放
            bamboo.rotation.x = (Math.random() - 0.5) * 0.1;
            bamboo.rotation.z = (Math.random() - 0.5) * 0.1;
            bamboo.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.8 + Math.random() * 0.6;
            bamboo.scale.set(scale, scale, scale);

            bamboo.userData = {
                phase: Math.random() * Math.PI * 2,
                swaySpeed: 0.5 + Math.random() * 0.5
            };

            this.group.add(bamboo);
            this.bamboos.push(bamboo);
        }
    }

    createSingleBamboo() {
        const bambooGroup = new THREE.Group();
        const segments = 8 + Math.floor(Math.random() * 4); // 8-11 节竹子
        const segmentHeight = 2.0;
        
        const darkGreenMat = new THREE.MeshStandardMaterial({
            color: 0x082e18,
            roughness: 0.6,
            metalness: 0.1
        });

        const glowingJointMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        let currentY = 0;
        for (let i = 0; i < segments; i++) {
            // 竹节主体
            const stemGeo = new THREE.CylinderGeometry(0.18, 0.2, segmentHeight, 16);
            const stem = new THREE.Mesh(stemGeo, darkGreenMat);
            stem.position.y = currentY + segmentHeight / 2;
            bambooGroup.add(stem);

            // 发光竹节连接处 (聚灵节点)
            const jointGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 16);
            const joint = new THREE.Mesh(jointGeo, glowingJointMat);
            joint.position.y = currentY + segmentHeight;
            joint.rotation.x = Math.PI / 2;
            bambooGroup.add(joint);

            currentY += segmentHeight;
        }

        return bambooGroup;
    }

    createSpiritParticles() {
        const geo = new THREE.BufferGeometry();
        const numParticles = 600;
        const pos = new Float32Array(numParticles * 3);
        const sizes = new Float32Array(numParticles);
        this.particleData = [];

        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 2 + Math.random() * 30;
            const x = Math.cos(angle) * radius;
            const y = -1.5 + Math.random() * 10;
            const z = Math.sin(angle) * radius;

            pos[i*3] = x;
            pos[i*3+1] = y;
            pos[i*3+2] = z;
            sizes[i] = Math.random();

            this.particleData.push({
                angle: angle,
                radius: radius,
                baseY: y,
                speed: 0.1 + Math.random() * 0.2,
                orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.1)
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        // 纯代码圆形发光粒子 Shader
        const shader = {
            uniforms: {
                color: { value: new THREE.Color(0x00ffaa) }
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (15.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.1, dist);
                    gl_FragColor = vec4(color, alpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        };

        this.spiritPoints = new THREE.Points(geo, new THREE.ShaderMaterial(shader));
        this.group.add(this.spiritPoints);
    }

    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(2, 16, 10, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 512, 128);
        
        ctx.font = 'bold 42px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 10;
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
        // 答对时，中心莲花爆发出强烈的灵气涟漪
        const ringGeo = new THREE.RingGeometry(1.5, 2.0, 64);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ffcc, 
            transparent: true, 
            opacity: 1.0, 
            side: THREE.DoubleSide, 
            blending: THREE.AdditiveBlending, 
            depthWrite: false 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, -1.9, 0);
        ring.rotation.x = -Math.PI / 2;
        ring.userData = { scale: 1, opacity: 1.0 };
        this.group.add(ring);
        this.burstRings.push(ring);

        // 莲花中心光芒闪烁
        this.lotusLight.intensity = 5.0;
    }

    animate(time) {
        this.time = time;

        // 莲花微微呼吸
        if (this.lotusGroup) {
            this.lotusGroup.position.y = -2.0 + Math.sin(time * 1.5) * 0.1;
            this.lotusLight.position.y = this.lotusGroup.position.y + 1.5;
            
            // 光源强度缓缓恢复正常
            if (this.lotusLight.intensity > 1.5) {
                this.lotusLight.intensity -= 0.1;
            } else {
                this.lotusLight.intensity = 1.5 + Math.sin(time * 2.0) * 0.3;
            }
        }

        // 竹海微风摇曳
        this.bamboos.forEach(bamboo => {
            const u = bamboo.userData;
            // 通过旋转顶端来实现迎风摆动
            bamboo.rotation.x += Math.sin(time * u.swaySpeed + u.phase) * 0.001;
            bamboo.rotation.z += Math.cos(time * u.swaySpeed + u.phase) * 0.001;
        });

        // 灵气粒子汇聚盘旋
        if (this.spiritPoints) {
            const pos = this.spiritPoints.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const data = this.particleData[i];
                // 轨道旋转
                data.angle += data.orbitSpeed * 0.05;
                // 上下浮动
                let y = data.baseY + Math.sin(time * data.speed + i) * 0.5;
                
                pos.setXYZ(i, Math.cos(data.angle) * data.radius, y, Math.sin(data.angle) * data.radius);
            }
            pos.needsUpdate = true;
        }

        // 悬浮选项浮动
        this.optionsGroup.children.forEach(child => {
            child.position.y = child.userData.baseY + Math.sin(time * 2 + child.userData.offset) * 0.2;
        });

        // 爆点涟漪动画
        for (let i = this.burstRings.length - 1; i >= 0; i--) {
            const r = this.burstRings[i];
            r.userData.scale += 0.3;
            r.userData.opacity -= 0.03;
            r.scale.setScalar(r.userData.scale);
            r.material.opacity = Math.max(0, r.userData.opacity);
            if (r.userData.opacity <= 0) {
                this.group.remove(r);
                r.geometry.dispose();
                r.material.dispose();
                this.burstRings.splice(i, 1);
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
