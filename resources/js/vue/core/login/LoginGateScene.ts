import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * 悬浮仙门登录场景
 * 云海之上的「太虚仙门」：青玉石柱 + 木质牌匾 + 灵气传送门 + 地面太极法阵
 * + 三层动态云海 + 灵气粒子 + 悬浮灵灯（动态点光源）
 */
export class LoginGateScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private clock = new THREE.Clock();
  private animId = 0;
  private disposed = false;

  private gate = new THREE.Group();           // 仙门整体（上下漂浮）
  private gateModel: THREE.Object3D | null = null; // GLB 仙门
  private arrayInner!: THREE.Mesh;            // 法阵内环
  private arrayOuter!: THREE.Mesh;            // 法阵外环
  private portalMat!: THREE.ShaderMaterial;   // 传送门灵气 shader

  private cloudLayers: THREE.Mesh[] = [];     // 远/中景云
  private nearClouds: THREE.Sprite[] = [];    // 近景流云
  private runes: THREE.Sprite[] = [];         // 公转符文
  private lanterns: { sprite: THREE.Sprite; light: THREE.PointLight; baseY: number; phase: number }[] = [];
  private goldMotes!: THREE.Points;
  private blueStars!: THREE.Points;
  private scenery: THREE.Group[] = [];        // 远景浮空仙岛
  private flyers: THREE.Object3D[] = [];       // 御剑仙人 (GLB)

  private time = { value: 0 };
  private opening = false;

  // 程序纹理
  private glowTex!: THREE.Texture;
  private cloudTex!: THREE.Texture;
  private arrayTex!: THREE.Texture;
  private runeTex!: THREE.Texture;

  constructor(container: HTMLElement) {
    this.container = container;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x21365e, 0.00022);

    this.camera = new THREE.PerspectiveCamera(48, w / h, 1, 8000);
    this.camera.position.set(0, 190, 620);
    this.camera.lookAt(0, 195, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    Object.assign(this.renderer.domElement.style, { position: 'absolute', inset: '0', display: 'block' });
    container.appendChild(this.renderer.domElement);

    this.glowTex = this.makeGlowTex();
    this.cloudTex = this.makeCloudTex();
    this.arrayTex = this.makeArrayTex();
    this.runeTex = this.makeRuneTex();

    this.buildSky();
    this.buildLights();
    this.buildGate();
    this.buildArray();
    this.buildClouds();
    this.buildScenery();
    this.buildParticles();
    this.buildLanterns();
    this.setupComposer(w, h);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  // ─── 程序纹理 ──────────────────────────────────────────────
  private makeGlowTex(): THREE.Texture {
    const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d')!, m = s / 2;
    const g = ctx.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }

  private makeCloudTex(): THREE.Texture {
    const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = s * (0.05 + Math.random() * 0.16);
      const a = 0.08 + Math.random() * 0.2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  private makeArrayTex(): THREE.Texture {
    const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d')!, m = s / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(240,210,130,0.95)'; ctx.lineWidth = 3;
    // 双环
    [m * 0.92, m * 0.74, m * 0.5].forEach(r => { ctx.beginPath(); ctx.arc(m, m, r, 0, Math.PI * 2); ctx.stroke(); });
    // 八卦放射线
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(m + Math.cos(a) * m * 0.5, m + Math.sin(a) * m * 0.5);
      ctx.lineTo(m + Math.cos(a) * m * 0.92, m + Math.sin(a) * m * 0.92);
      ctx.stroke();
    }
    // 符文点
    ctx.fillStyle = 'rgba(255,235,170,0.9)';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = m * 0.83;
      ctx.beginPath(); ctx.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, 5, 0, Math.PI * 2); ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  private makeRuneTex(): THREE.Texture {
    const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = 'rgba(255,230,160,0.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeRect(16, 16, 32, 32);
    ctx.beginPath(); ctx.moveTo(16, 32); ctx.lineTo(48, 32); ctx.moveTo(32, 16); ctx.lineTo(32, 48); ctx.stroke();
    return new THREE.CanvasTexture(c);
  }

  private makePlaqueTex(): THREE.Texture {
    const w = 1024, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    // 木质底
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3a2415'); bg.addColorStop(0.5, '#5a3a1e'); bg.addColorStop(1, '#2e1c10');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // 金边
    ctx.strokeStyle = '#e8c66a'; ctx.lineWidth = 10; ctx.strokeRect(14, 14, w - 28, h - 28);
    // 字
    ctx.fillStyle = '#f3d98a';
    ctx.font = 'bold 150px "Ma Shan Zheng","STXingkai","KaiTi",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,220,120,0.9)'; ctx.shadowBlur = 24;
    ctx.fillText('太虚仙门', w / 2, h / 2 + 8);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private makeJadeRuneTex(): THREE.Texture {
    const w = 128, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, '#16414f'); bg.addColorStop(0.5, '#2b7d8e'); bg.addColorStop(1, '#16414f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(240,210,130,0.55)'; ctx.lineWidth = 3;
    for (let y = 40; y < h; y += 70) {
      ctx.strokeRect(34, y, w - 68, 40);
      ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.lineTo(w / 2, y + 40); ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ─── 天空 ──────────────────────────────────────────────
  private buildSky() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#060c1e');   // 天顶深蓝近黑
    g.addColorStop(0.45, '#0e1c3c');
    g.addColorStop(0.72, '#1a3055');
    g.addColorStop(0.9, '#2b4a72');  // 地平线微亮深蓝
    g.addColorStop(1, '#3a5a86');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(6000, 32, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.scene.add(dome);
  }

  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0x6a82aa, 0.55));
    const sun = new THREE.DirectionalLight(0xffe6b8, 1.15);
    sun.position.set(300, 500, 350);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x3a72c0, 0.6);
    rim.position.set(-400, 160, -300);
    this.scene.add(rim);
  }

  // ─── 仙门 ──────────────────────────────────────────────
  private buildPillar(): THREE.Group {
    const g = new THREE.Group();
    const jadeTex = this.makeJadeRuneTex();
    const jadeMat = new THREE.MeshStandardMaterial({
      map: jadeTex, color: 0x4f97a6, emissive: 0x123c45, emissiveIntensity: 0.18, roughness: 0.55, metalness: 0.2,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(26, 30, 300, 8), jadeMat);
    shaft.position.y = 130; g.add(shaft);
    // 柱顶/柱础
    const capMat = new THREE.MeshStandardMaterial({ color: 0xe8c66a, emissive: 0x6a4f12, emissiveIntensity: 0.35, metalness: 0.9, roughness: 0.35 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 20, 8), capMat); cap.position.y = 290; g.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(38, 42, 26, 8), capMat); base.position.y = -8; g.add(base);
    // 流动金色灵纹（内侧发光条）
    const trim = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 270),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    trim.position.set(0, 135, 31);
    g.add(trim);
    g.userData.trim = trim;
    return g;
  }

  private buildGate() {
    this.scene.add(this.gate);

    // 加载 GLB 仙门作为主体
    this.loadGateModel();

    // 中心传送门：灵气流动 shader
    this.portalMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { time: this.time, openProgress: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */`
        uniform float time; uniform float openProgress; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          // 椭圆软边
          float edge = smoothstep(1.0, 0.55, r);
          // 流动灵气环
          float flow = 0.5 + 0.5 * sin(r * 14.0 - time * 1.8);
          float swirl = 0.5 + 0.5 * sin(atan(p.y,p.x) * 6.0 + time * 0.8);
          vec3 blue = vec3(0.32, 0.62, 1.0);
          vec3 cyan = vec3(0.55, 0.92, 1.0);
          vec3 col = mix(blue, cyan, flow * swirl);
          float a = edge * (0.28 + flow * 0.32);
          // 开门：整体泛白增亮
          col = mix(col, vec3(1.0), openProgress);
          a = mix(a, edge, openProgress);
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(300, 340), this.portalMat);
    portal.position.set(0, 150, -18);
    this.gate.add(portal);
    this.gate.userData.portal = portal;
  }

  private loadGateModel() {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/gltf/');
    loader.setDRACOLoader(draco);
    loader.load('/models/xianmen.glb', (gltf) => {
      const model = gltf.scene;
      // 归一化：目标高度 ~420，底部坐在法阵(y=-18)，水平居中
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 420 / (size.y || 1);
      model.scale.setScalar(scale);
      const b2 = new THREE.Box3().setFromObject(model);
      const c = b2.getCenter(new THREE.Vector3());
      model.position.x -= c.x;
      model.position.z -= c.z;
      model.position.y = -18 - b2.min.y;
      model.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
      this.gate.add(model);
      this.gateModel = model;
    }, undefined, (e) => console.warn('仙门模型加载失败', e));
  }

  // ─── 地面太极法阵 ──────────────────────────────────────────
  private buildArray() {
    const mk = (r: number, op: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(r * 2, r * 2),
        new THREE.MeshBasicMaterial({ map: this.arrayTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      m.rotation.x = -Math.PI / 2; m.position.y = -18;
      this.scene.add(m); return m;
    };
    this.arrayOuter = mk(300, 0.6);
    this.arrayInner = mk(190, 0.75);
  }

  // ─── 三层云海 ──────────────────────────────────────────
  private buildClouds() {
    // 远景 + 中景：大平面 UV 漂移
    const farTex = this.cloudTex.clone(); farTex.repeat.set(5, 5);
    const far = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshBasicMaterial({ map: farTex, color: 0x5a78a8, transparent: true, opacity: 0.22, depthWrite: false, fog: false }),
    );
    far.rotation.x = -Math.PI / 2; far.position.y = -150;
    far.userData.speed = 0.00004; this.scene.add(far); this.cloudLayers.push(far);

    const midTex = this.cloudTex.clone(); midTex.repeat.set(3, 3);
    const mid = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshBasicMaterial({ map: midTex, color: 0x6e8cb8, transparent: true, opacity: 0.16, depthWrite: false, fog: false }),
    );
    mid.rotation.x = -Math.PI / 2; mid.position.y = -80;
    mid.userData.speed = -0.00006; this.scene.add(mid); this.cloudLayers.push(mid);

    // 近景：billboard 流云，从脚下/两侧流过（深蓝、低透明，仅作氛围）
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.cloudTex, color: 0x8aa4cc, transparent: true, opacity: 0.12 + Math.random() * 0.16, depthWrite: false, fog: false,
      }));
      const s = 400 + Math.random() * 500;
      sp.scale.set(s * 1.6, s, 1);
      sp.position.set((Math.random() - 0.5) * 1400, -40 + Math.random() * 80, 60 + Math.random() * 360);
      sp.userData = { vx: (Math.random() - 0.5) * 0.4, baseY: sp.position.y, phase: Math.random() * 6.28 };
      this.scene.add(sp); this.nearClouds.push(sp);
    }
  }

  // ─── 粒子 ──────────────────────────────────────────
  private makePoints(count: number, color: number, size: number, spread: number, yBase: number, yRange: number): THREE.Points {
    const pos = new Float32Array(count * 3); const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread, z = (Math.random() - 0.5) * spread * 0.5, y = yBase + Math.random() * yRange;
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
      base[i*3] = x; base[i*3+1] = y; base[i*3+2] = z;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, map: this.glowTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    pts.userData = { base };
    return pts;
  }

  private buildParticles() {
    this.goldMotes = this.makePoints(120, 0xffe09a, 7, 900, -20, 360); this.scene.add(this.goldMotes);
    this.blueStars = this.makePoints(90, 0x9fd6ff, 5, 1100, 0, 420); this.scene.add(this.blueStars);
    // 公转符文
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.runeTex, color: 0xffe6a8, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
      sp.scale.set(26, 26, 1);
      sp.userData = { ang: (i / 10) * Math.PI * 2, rad: 230 + Math.random() * 60, baseY: 120 + Math.random() * 120, phase: Math.random() * 6.28, spd: 0.15 + Math.random() * 0.15 };
      this.scene.add(sp); this.runes.push(sp);
    }
  }

  // ─── 远景浮空仙岛 + 御剑仙人（让仙门通往一片广阔世界） ──────────
  private buildScenery() {
    // 远景浮空仙岛剪影（深蓝，带暖色塔灯）
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x16294a, roughness: 1, metalness: 0, emissive: 0x0a1a34, emissiveIntensity: 0.35 });
    const spots = [
      { x: -720, y: 120, z: -560, s: 1.0 },
      { x: 780, y: 210, z: -680, s: 1.25 },
      { x: -440, y: 330, z: -980, s: 0.8 },
      { x: 560, y: 70, z: -420, s: 0.7 },
      { x: -980, y: 270, z: -860, s: 1.1 },
      { x: 980, y: 360, z: -1050, s: 0.9 },
    ];
    spots.forEach((p, i) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(60, 50, 18, 7), islandMat);
      g.add(top);
      const bot = new THREE.Mesh(new THREE.ConeGeometry(48, 110, 6), islandMat);
      bot.position.y = -60; g.add(bot);
      const tower = new THREE.Mesh(new THREE.ConeGeometry(14, 52, 5), islandMat);
      tower.position.y = 32; g.add(tower);
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffcf88, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      lamp.scale.set(38, 38, 1); lamp.position.y = 42; g.add(lamp);
      g.position.set(p.x, p.y, p.z);
      g.scale.setScalar(p.s);
      g.userData = { baseY: p.y, phase: i };
      this.scene.add(g);
      this.scenery.push(g);
    });

    // 御剑仙人掠过（GLB 模型）
    this.loadFlyingSwordsman();
  }

  private loadFlyingSwordsman() {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/gltf/');
    loader.setDRACOLoader(draco);
    const paths = [
      { y: 380, z: -240, vx: 1.2, facingRight: true },
      { y: 260, z: -520, vx: -0.8, facingRight: false },
    ];
    loader.load('/models/jianxiu.glb', (gltf) => {
      const box0 = new THREE.Box3().setFromObject(gltf.scene);
      const h0 = box0.getSize(new THREE.Vector3()).y || 1;
      const targetH = 55;
      const s = targetH / h0;

      paths.forEach((ln, i) => {
        const raw = i === 0 ? gltf.scene : gltf.scene.clone();
        raw.scale.setScalar(s);
        // 模型默认正面朝 +Z（面向镜头），转 90° 变侧面飞行
        raw.rotation.y = ln.facingRight ? -Math.PI / 2 : Math.PI / 2;
        // 微微前倾增加飞行感
        raw.rotation.z = ln.facingRight ? -0.12 : 0.12;

        // 外层 Group 控制位移（动画操作它，不影响内层旋转）
        const wrapper = new THREE.Group();
        wrapper.add(raw);
        wrapper.position.set((i % 2 ? 1 : -1) * 1600, ln.y, ln.z);
        wrapper.userData = { vx: ln.vx, baseY: ln.y, phase: Math.random() * 6.28, maxX: 1800 };
        this.scene.add(wrapper);
        this.flyers.push(wrapper);
      });
    }, undefined, (e) => console.warn('剑修模型加载失败', e));
  }

  // ─── 悬浮灵灯（动态点光源） ──────────────────────────────
  private buildLanterns() {
    [-235, 235].forEach((x, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color: 0x66ccff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
      sprite.scale.set(70, 70, 1);
      const baseY = 230;
      sprite.position.set(x, baseY, 40);
      this.scene.add(sprite);
      const light = new THREE.PointLight(0x4ec3ff, 2.2, 600, 1.5);
      light.position.set(x, baseY, 60);
      this.scene.add(light);
      this.lanterns.push({ sprite, light, baseY, phase: i * Math.PI });
    });
  }

  private setupComposer(w: number, h: number) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.45, 0.6, 0.86));
    this.composer.addPass(new OutputPass());
  }

  // ─── 动画循环 ──────────────────────────────────────────
  private animate = () => {
    if (this.disposed) return;
    this.animId = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();
    this.time.value = t;

    // 仙门上下漂浮
    if (!this.opening) this.gate.position.y = Math.sin(t * 0.8) * 6;

    // 法阵旋转（双层反向）
    this.arrayOuter.rotation.z += 0.0008;
    this.arrayInner.rotation.z -= 0.0014;

    // 云：远中景 UV 漂移
    this.cloudLayers.forEach(c => {
      const mat = c.material as THREE.MeshBasicMaterial;
      if (mat.map) { mat.map.offset.x += (c.userData.speed as number); }
    });
    // 近景流云横移 + 起伏
    this.nearClouds.forEach(c => {
      c.position.x += c.userData.vx;
      c.position.y = c.userData.baseY + Math.sin(t * 0.5 + c.userData.phase) * 8;
      if (c.position.x > 900) c.position.x = -900;
      else if (c.position.x < -900) c.position.x = 900;
    });

    // 符文公转
    this.runes.forEach(r => {
      const u = r.userData;
      u.ang += u.spd * 0.01;
      r.position.set(Math.cos(u.ang) * u.rad, u.baseY + Math.sin(t * 0.8 + u.phase) * 20, Math.sin(u.ang) * u.rad * 0.5 - 10);
      (r.material as THREE.SpriteMaterial).opacity = 0.4 + Math.abs(Math.sin(t + u.phase)) * 0.55; // 偶尔亮起
    });

    // 远景仙岛缓慢浮动
    this.scenery.forEach(g => { g.position.y = g.userData.baseY + Math.sin(t * 0.4 + g.userData.phase) * 8; });
    // 御剑仙人掠过 + 起伏 + 循环
    this.flyers.forEach(f => {
      const u = f.userData;
      f.position.x += u.vx;
      f.position.y = u.baseY + Math.sin(t * 0.7 + u.phase) * 12;
      if (u.vx > 0 && f.position.x > u.maxX) f.position.x = -u.maxX;
      else if (u.vx < 0 && f.position.x < -u.maxX) f.position.x = u.maxX;
    });

    // 粒子上浮
    this.driftPoints(this.goldMotes, 0.35, 360);
    this.driftPoints(this.blueStars, 0.25, 420);

    // 灵灯摇曳 + 点光源呼吸
    this.lanterns.forEach(l => {
      l.sprite.position.y = l.baseY + Math.sin(t * 1.2 + l.phase) * 8;
      l.sprite.position.x += Math.sin(t * 0.9 + l.phase) * 0.06;
      l.light.position.copy(l.sprite.position);
      l.light.intensity = 1.8 + Math.sin(t * 2.5 + l.phase) * 0.7;
    });

    this.composer.render();
  };

  private driftPoints(pts: THREE.Points, spd: number, range: number) {
    const arr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    const base = pts.userData.base as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i*3+1] += spd;
      if (arr[i*3+1] - base[i*3+1] > range) arr[i*3+1] = base[i*3+1];
    }
    (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  // ─── 开门过场：石柱分开 + 门光暴涨 + 镜头穿门 ──────────────
  public openGate(onComplete?: () => void) {
    if (this.opening) return;
    this.opening = true;
    const tl = gsap.timeline({ onComplete: () => onComplete?.() });
    // 门光暴涨 + 仙门放大（穿门临场感）+ 镜头推进穿过门洞
    tl.to(this.portalMat.uniforms.openProgress, { value: 1, duration: 1.4, ease: 'power2.in' }, 0);
    tl.to(this.gate.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 1.6, ease: 'power3.in' }, 0);
    tl.to(this.camera.position, {
      z: -220, y: 195, duration: 1.6, ease: 'power3.in',
      onUpdate: () => this.camera.lookAt(0, 195, -600),
    }, 0.1);
    return tl;
  }

  private onResize = () => {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.composer.dispose();
    this.scene.clear();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.remove();
  }
}
