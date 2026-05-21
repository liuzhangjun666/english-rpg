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

        // 💡【核心视觉优化】在内网运行时动态生成一张“中心高亮、边缘羽化极其柔和”的金色/白色圆形滤镜发光照片
        // 这样不仅省去了额外的网络图片加载请求，更能让原本死板的“正方形粒子”秒变高级的修仙霓虹光晕！
        const glowTexture = this.createGlowTexture();

        // 地坪（降低不透明度，让云海底图隐约透出来，层次感拉满）
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshBasicMaterial({ color: 0x051122, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        this.group.add(ground);

        // 发光地环（聚灵阵效果优化：融入发光特效照片贴图，开启 AdditiveBlending 强光融合模式）
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(1.6, 3.2, 32),
            new THREE.MeshBasicMaterial({
                color: 0x4ec07a,
                map: glowTexture, // 赋予发光照片纹理，让阵法边缘虚化空灵
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        glow.position.set(0, -1.95, 0);
        glow.rotation.x = -Math.PI / 2;
        glow.userData = { pulse: true };
        this.group.add(glow);

        // 灵草系统华丽升级：
        // 提示：如果你后续设计了独立的高清独立灵草 PNG，可直接将下面的 map 换为图片。
        // 这里采用 3D 复合工艺：用真实的立体枝干支撑 + 顶部全向发光 Sprite 特效照片，完美还原原画中的灵气吞吐！
        const colors = [0x4ec07a, 0x7bed9f, 0x70a1ff, 0xffa502, 0xff4757];
        for (let i = 0; i < 35; i++) {
            const herb = new THREE.Group();
            const h = 0.4 + Math.random() * 0.5; // 随机高度

            // 枝干：立体圆柱
            const stem = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.025, h, 5),
                new THREE.MeshBasicMaterial({ color: 0x1a5c32 })
            );
            stem.position.y = h / 2;
            herb.add(stem);

            // 灵草发光果实：使用 Sprite 广告牌面片特效贴图。
            // 它的牛逼之处在于：无论玩家视角、3D相机怎么旋转，发光照片永远全向正对屏幕，发光效果绝绝子！
            const spriteMat = new THREE.SpriteMaterial({
                color: colors[i % colors.length],
                map: glowTexture, // 注入圆形渐变发光特效照片
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending // 开启叠加高亮
            });
            const leafSprite = new THREE.Sprite(spriteMat);
            leafSprite.position.y = h;

            // 稍微放大发光体，营造梦幻光晕
            const size = 0.25 + Math.random() * 0.2;
            leafSprite.scale.set(size, size, 1);
            herb.add(leafSprite);

            // 药园范围内环形分布
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.2 + Math.random() * 3.3;
            const basePos = new THREE.Vector3(Math.cos(angle) * radius, -2, Math.sin(angle) * radius);
            herb.position.copy(basePos);

            // 📝【修复漂移Bug】存储稳定的初始Y轴基准，改用周期函数实现绝对赋值
            herb.userData = {
                baseY: -2,
                floatSpeed: 1.5 + Math.random() * 1.5,
                floatOffset: Math.random() * Math.PI * 2,
                amplitude: 0.04 + Math.random() * 0.04
            };

            this.group.add(herb);
            this.herbs.push(herb);
        }

        // 梦幻荧光精灵（原萤火虫系统）：方形粒子秒变发光微光球
        const ffCount = 90;
        const ffGeometry = new THREE.BufferGeometry();
        const fp = new Float32Array(ffCount * 3);
        this.initialFireflyPositions = [];

        for (let i = 0; i < ffCount; i++) {
            const x = (Math.random() - 0.5) * 12;
            const y = -1.5 + Math.random() * 4;
            const z = (Math.random() - 0.5) * 10 - 1;

            fp[i * 3] = x;
            fp[i * 3 + 1] = y;
            fp[i * 3 + 2] = z;

            // 📝 记录绝对初始坐标和独特的频率，防止其向外无限飘逸逃逸
            this.initialFireflyPositions.push({ x, y, z, speed: 0.6 + Math.random() * 0.8, offset: Math.random() * 50 });
        }

        ffGeometry.setAttribute('position', new THREE.BufferAttribute(fp, 3));

        // 💡 关键点：赋予刚生成的发光特效照片（map），增大 size，方形马赛克瞬间变成空灵荧光！
        const ffMaterial = new THREE.PointsMaterial({
            color: 0xfff3cc,
            size: 0.3, // 配合发光羽化照片，尺寸越大边缘越朦胧梦幻
            map: glowTexture,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.fireflies = new THREE.Points(ffGeometry, ffMaterial);
        this.group.add(this.fireflies);

        // 🛠️【致命Bug修复】必须将组整体作为节点添加到当前大场景中，否则前端没有任何 Three.js 物体显示！
        scene.add(this.group);
    }

    /**
     * 🔮 辅助生产车间：使用 Canvas 在显存中现场绘制并生成一张高清抗锯齿的“中心高亮、向外平滑羽化”的柔和发光特殊特效照片
     */
    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; // 提升分辨率，光晕边缘极其丝滑
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // 创建圆心向外的径向高斯渐变
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // 核心高亮白点
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)'); // 核心内圈
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)'); // 朦胧光晕层
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // 边缘完全透明羽化

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

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

