// LevelUp 英语修仙 - 练功房 3D 场景（发光灵草药园特效升级版）
import * as THREE from 'three';
import vocabBg from '../../assets/images/scene_practice_vocab.png';
import dangeBg from '../../assets/images/scene_practice_dange.png';
import listeningBg from '../../assets/images/scene_listening.png';
import speakingBg from '../../assets/images/scene_speaking.png';
import writingBg from '../../assets/images/scene_writing.png';

export class PracticeScene {
    constructor() {
        this.group = new THREE.Group();
        this.herbs = [];
        this.fireflies = null;
        this.initialFireflyPositions = []; // 【新增】用于修复萤火虫无限漂移的基准记录
    }

    build(scene, camera, blocker, options = {}) {
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

        // 💡【核心视觉优化】全线升级为 Three.js 纯原生 WebGL Shader 演算
        // 彻底抛弃一切外部图片和 Canvas 贴图生成，享受最纯粹的 GPU 数学渲染魅力！

        // 地坪（降低不透明度，让云海底图隐约透出来，层次感拉满）
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshBasicMaterial({ color: 0x051122, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        this.group.add(ground);

        // 发光地环（聚灵阵：纯几何不透明度控制）
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(1.6, 3.2, 32),
            new THREE.MeshBasicMaterial({
                color: 0x4ec07a,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        glow.position.set(0, -1.95, 0);
        glow.rotation.x = -Math.PI / 2;
        glow.userData = { pulse: true };
        this.group.add(glow);

        // 灵草系统纯原生 3D 华丽升级：
        // 采用 3D 贝塞尔曲线生成自然弯曲枝干 + 纯原生 Shader 编写的发光果实
        const colors = [0x4ec07a, 0x7bed9f, 0x70a1ff, 0xffa502, 0xff4757];
        for (let i = 0; i < 35; i++) {
            const herb = new THREE.Group();
            const h = 0.4 + Math.random() * 0.5;

            // 枝干：贝塞尔曲线原生管道 (告别死板圆柱，迎风婀娜)
            const curve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3((Math.random() - 0.5) * 0.2, h * 0.5, (Math.random() - 0.5) * 0.2),
                new THREE.Vector3((Math.random() - 0.5) * 0.4, h, (Math.random() - 0.5) * 0.4)
            );
            const stem = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 8, 0.012, 5, false),
                new THREE.MeshBasicMaterial({ color: 0x1a5c32 })
            );
            herb.add(stem);

            // 灵草发光果实：纯 WebGL Shader 原生发光体，不依赖图片！
            const glowShader = {
                uniforms: {
                    uColor: { value: new THREE.Color(colors[i % colors.length]) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uColor;
                    varying vec2 vUv;
                    void main() {
                        float dist = distance(vUv, vec2(0.5));
                        float alpha = smoothstep(0.5, 0.0, dist);
                        float core = smoothstep(0.15, 0.0, dist);
                        vec3 finalColor = mix(uColor, vec3(1.0), core);
                        gl_FragColor = vec4(finalColor, alpha * 0.9);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            };
            const leafSprite = new THREE.Sprite(new THREE.ShaderMaterial(glowShader));
            leafSprite.position.copy(curve.getPoint(1)); // 精准依附在弯曲的枝干顶端

            const size = 0.25 + Math.random() * 0.2;
            leafSprite.scale.set(size, size, 1);
            herb.add(leafSprite);

            const angle = Math.random() * Math.PI * 2;
            const radius = 1.2 + Math.random() * 3.3;
            const basePos = new THREE.Vector3(Math.cos(angle) * radius, -2, Math.sin(angle) * radius);
            herb.position.copy(basePos);

            herb.userData = {
                baseY: -2,
                floatSpeed: 1.5 + Math.random() * 1.5,
                floatOffset: Math.random() * Math.PI * 2,
                amplitude: 0.04 + Math.random() * 0.04
            };

            this.group.add(herb);
            this.herbs.push(herb);
        }

        // 梦幻荧光精灵：纯原生 WebGL Shader 点阵系统
        const ffCount = 90;
        const ffGeometry = new THREE.BufferGeometry();
        const fp = new Float32Array(ffCount * 3);
        const sizes = new Float32Array(ffCount);
        this.initialFireflyPositions = [];

        for (let i = 0; i < ffCount; i++) {
            const x = (Math.random() - 0.5) * 12;
            const y = -1.5 + Math.random() * 4;
            const z = (Math.random() - 0.5) * 10 - 1;

            fp[i * 3] = x;
            fp[i * 3 + 1] = y;
            fp[i * 3 + 2] = z;
            sizes[i] = 15.0 + Math.random() * 20.0; // 控制每个粒子的绝对像素大小

            this.initialFireflyPositions.push({ x, y, z, speed: 0.6 + Math.random() * 0.8, offset: Math.random() * 50 });
        }

        ffGeometry.setAttribute('position', new THREE.BufferAttribute(fp, 3));
        ffGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        const ffShader = {
            uniforms: {
                uColor: { value: new THREE.Color(0xfff3cc) }
            },
            vertexShader: `
                attribute float aSize;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (10.0 / -mvPosition.z); // 近大远小透视缩放
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.05, dist); // 点精灵内置坐标系进行平滑圆角切割
                    gl_FragColor = vec4(uColor, alpha * 0.85);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        };

        this.fireflies = new THREE.Points(ffGeometry, new THREE.ShaderMaterial(ffShader));
        this.group.add(this.fireflies);

        // 🛠️【致命Bug修复】必须将组整体作为节点添加到当前大场景中，否则前端没有任何 Three.js 物体显示！
        scene.add(this.group);
    }

    // 🔮 已完全剥离 Canvas Texture 依赖，特效运算由纯着色器在 GPU 中并行完成

    /**
     * ⏳ 帧循环驱动：抛弃 += 累加漂移算法，采用绝对正弦差值赋值，确保动画万年不卡且永不漂移
     */
    animate(time) {
        // 1. 聚灵地环周期呼吸微动
        this.group.children.forEach(c => {
            if (c.userData?.pulse) {
                c.scale.setScalar(1 + Math.sin(time * 1.6) * 0.05);
            }
        });

        // 2. 灵草在舒适区间内进行平滑悬浮浮动，并伴随微风吹拂的倾斜感（修复 += 漂移）
        this.herbs.forEach((h) => {
            const u = h.userData;
            // 通过 = 绝对坐标运算，彻底锁死在 base Y 的上下波动范围内
            h.position.y = u.baseY + Math.sin(time * u.floatSpeed + u.floatOffset) * u.amplitude;
            // 植物随微风极其轻微的左右摆动（更逼真）
            h.rotation.z = Math.sin(time * 0.7 + u.floatOffset) * 0.025;
        });

        // 3. 梦幻萤火虫粒子在 3D 空间进行无规则轻盈游走（修复漂移飞升）
        if (this.fireflies) {
            const p = this.fireflies.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                const init = this.initialFireflyPositions[i];
                // X, Y, Z 三轴各自执行带有相位差的简谐运动，运动轨迹如群蜂漫步，丝滑自然
                p.array[i * 3] = init.x + Math.sin(time * init.speed + init.offset) * 0.25;
                p.array[i * 3 + 1] = init.y + Math.cos(time * (init.speed * 0.9) + init.offset) * 0.35;
                p.array[i * 3 + 2] = init.z + Math.sin(time * (init.speed * 1.3) + init.offset) * 0.15;
            }
            p.needsUpdate = true;
        }
    }
}

