import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { WorldCameraController } from './WorldCameraController';

// ─── 数据 ─────────────────────────────────────────────────────────────────────

export interface SectNodeDef {
  id: string;
  name: string;
  pos: [number, number, number]; // [x, placeholder_y, z] — Y 在运行时由地形决定
  color: number;
  unlockRealm?: number;
  glbPath?: string;
  glbTargetSize?: number;
  glbRotationY?: number; // GLB 朝向覆盖（弧度），默认 Math.PI
}

export interface WorldSceneOptions {
  userRealmLevel?: number;
  buildingImages?: Record<string, string>;
}

export const SECT_NODES: SectNodeDef[] = [
  { id: 'sectHall',      name: '宗门大殿', pos: [0,     0, 0],     color: 0xffd700, unlockRealm: 0, glbPath: '/models/sectHall.glb',      glbTargetSize: 360, glbRotationY: 0 },
  { id: 'swordHall',     name: '剑阁',     pos: [-430,  0, -300],  color: 0x66ccff, unlockRealm: 0, glbPath: '/models/swordHall.glb',     glbTargetSize: 270 },
  { id: 'scriptureHall', name: '藏经阁',   pos: [430,   0, -300],  color: 0x00ddff, unlockRealm: 0, glbPath: '/models/scriptureHall.glb', glbTargetSize: 255 },
  { id: 'alchemyHall',   name: '炼丹殿',   pos: [-370,  0, 390],   color: 0xff8833, unlockRealm: 0, glbPath: '/models/alchemyHall.glb',   glbTargetSize: 240, glbRotationY: 0 },
  { id: 'innerDemonHall', name: '心魔殿',  pos: [620,   0, 820],   color: 0x33d6ff, unlockRealm: 0, glbPath: '/models/innerDemonHall.glb', glbTargetSize: 260, glbRotationY: 0 },
  { id: 'beastGarden',   name: '灵兽园',   pos: [-740,  0, 50],    color: 0x44ee88, unlockRealm: 2, glbPath: '/models/beastGarden.glb',   glbTargetSize: 300 },
  { id: 'farm',          name: '灵田',     pos: [730,   0, 60],    color: 0x99ee44, unlockRealm: 0, glbPath: '/models/farm.glb',          glbTargetSize: 310 },
];

// ─── 地形高度函数 ─────────────────────────────────────────────────────────────

// 浮空岛布局：不再有地形大平板，建筑各自悬浮。
// 此函数现在只决定建筑/云环/云气的悬浮高度——近乎同一层，中心(宗门大殿)略高。
function terrainAt(x: number, z: number): number {
  const xn = x / 2200;
  const zn = z / 2200;
  const d2 = xn * xn + zn * zn;
  const dome = 45 * Math.exp(-d2 * 1.6); // 中心 ~45，外圈渐低到 ~10
  return Math.max(8, dome);
}

// ─── Ley Line Shader ──────────────────────────────────────────────────────────

const LEY_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LEY_FRAG = /* glsl */`
  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  varying vec2 vUv;

  void main() {
    float u = vUv.x;

    // 两个流动光包（错位半周期）
    float p1 = fract(u * 2.0 - time * 0.45);
    float p2 = fract(u * 2.0 - time * 0.45 + 0.5);
    float pack = max(
      smoothstep(0.0, 0.28, p1) * smoothstep(0.6, 0.28, p1),
      smoothstep(0.0, 0.28, p2) * smoothstep(0.6, 0.28, p2)
    );

    // 高频脉冲
    float pulse = 0.5 + 0.5 * sin(u * 36.0 - time * 9.0);

    float bright = pack + pulse * 0.10;
    vec3 col = mix(colorA, colorB, pack + pulse * 0.12);

    gl_FragColor = vec4(col * (1.0 + bright * 0.9), 0.10 + bright * 0.5);
  }
`;

// ─── GLB 加载：委托给全局 AssetPreloader（共享缓存 + 全局进度追踪）──────────────

import { loadGLB as loadGLBCached } from '../../services/assetPreloader';

/** 全部地图模型路径（用于预加载） */
const ALL_MAP_MODELS = [
  '/models/sectHall.glb', '/models/swordHall.glb', '/models/scriptureHall.glb',
  '/models/alchemyHall.glb', '/models/innerDemonHall.glb', '/models/beastGarden.glb',
  '/models/farm.glb', '/models/fuyan.glb', '/models/shucong.glb',
  '/models/liangting.glb', '/models/lingjing.glb',
];

// ─── WorldSceneManager ────────────────────────────────────────────────────────

export class WorldSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private css2dRenderer: CSS2DRenderer;
  private composer!: EffectComposer;
  public cameraController: WorldCameraController;
  private clock = new THREE.Clock();
  private animFrameId = 0;

  // 场景对象
  private buildings: THREE.Group[] = [];
  private leyShaders: THREE.ShaderMaterial[] = [];  // 所有灵脉 shader 引用（共享 time）
  private leyParticles: THREE.Points[] = [];         // 流光粒子
  private waterfallPts: THREE.Points | null = null;
  private cloudLayers: THREE.Mesh[] = [];      // 双层动态云海（UV 漂移）
  private cloudRings: THREE.Mesh[] = [];       // 建筑脚下云环（旋转）
  private valleyClouds: THREE.Mesh[] = [];     // 山谷 billboard 流云
  private ringParticles: THREE.Points[] = [];  // 云环主题粒子
  private sunSprite: THREE.Sprite | null = null;
  private labels: CSS2DObject[] = [];          // 建筑名标签（近大远小 + 远处淡出）
  private _tmpV = new THREE.Vector3();         // 复用临时向量
  private decorBob: THREE.Object3D[] = [];     // 装饰小浮岛（上下浮动）
  private birds: THREE.Sprite[] = [];          // 飞鸟群
  private flyers: THREE.Sprite[] = [];         // 御剑仙人
  private petals: THREE.Points | null = null;  // 飘落灵气花瓣
  private spiritDust: THREE.Points | null = null; // 全局漂浮灵尘
  private buildingFx: Array<(t: number) => void> = []; // 建筑动态特效更新闭包
  // Draco 解码器现在由全局 AssetPreloader 持有，本类不再自管 worker 生命周期
  private starField: THREE.Points | null = null;
  private terrainMesh: THREE.Mesh | null = null;

  // 交互
  private hoveredBuilding: THREE.Group | null = null;
  private mouseDownPos = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isFocused = false; // 是否已飞入某建筑特写
  private focusedBuilding: THREE.Group | null = null; // 当前特写的建筑（用于每帧更新菜单坐标）

  // 性能优化缓存
  private raycastMeshes: THREE.Object3D[] = [];        // 缓存的建筑 mesh 列表（避免每次 mousemove 遍历）
  private raycastDirty = true;                         // 标记 mesh 缓存是否需要刷新
  private buildingCircles: THREE.Mesh[] = [];           // 缓存法阵引用
  private buildingPointsList: { pts: THREE.Points; basePos: Float32Array; speed: number }[] = []; // 缓存粒子引用
  private mouseMoveThrottled = false;                  // mousemove 节流标记

  // 配置
  private userRealmLevel: number;
  private buildingImages: Record<string, string>;

  // 纹理
  private txLoader = new THREE.TextureLoader();
  private glowTex!: THREE.Texture;
  private circleTex!: THREE.Texture;

  // 共享时间 uniform（所有 ley line shader 共用）
  private timeUniform = { value: 0 };

  // 回调
  public onBuildingClick?: (node: SectNodeDef, screenX: number, screenY: number) => void;
  public onBuildingHover?: (node: SectNodeDef | null) => void;
  public onFocusedMove?: (screenX: number, screenY: number) => void; // 特写时每帧更新菜单坐标

  /** 预加载全部地图模型到缓存——在进入地图前调用，让首次开图也能瞬间显示真实模型。
   *  返回 Promise，调用方可 await 以确保所有 GLB 就绪后再实例化场景。 */
  public static preload(): Promise<void> {
    return Promise.all(
      ALL_MAP_MODELS.map((p) => loadGLBCached(p).catch(() => null)),
    ).then(() => undefined);
  }

  constructor(container: HTMLElement, options: WorldSceneOptions = {}) {
    this.container = container;
    this.userRealmLevel = options.userRealmLevel ?? 0;
    this.buildingImages = options.buildingImages ?? {};

    const w = container.offsetWidth || window.innerWidth;
    const h = container.offsetHeight || window.innerHeight;

    // ── 场景 ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050c18);
    this.scene.fog = new THREE.FogExp2(0x061020, 0.000095);

    // ── WebGL 渲染器 ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    // HiDPI 屏不再翻倍：Bloom 全屏后处理在 2× 像素率下开销翻 4 倍，1.5× 视觉差异肉眼几乎不可察。
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(w, h);
    // 关掉阴影映射：本场景为云海浮岛，没有承接阴影的平面，PCFSoftShadow 是纯粹的浪费。
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES Filmic 色调映射：高光柔和滚降，根治加色内容硬裁成白（OutputPass 会据此做最终色调映射）
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // ── CSS2D 渲染器 ──
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(w, h);
    Object.assign(this.css2dRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0', pointerEvents: 'none', zIndex: '2',
    });
    container.appendChild(this.css2dRenderer.domElement);

    // ── 相机控制器 ──
    this.cameraController = new WorldCameraController(this.renderer.domElement);

    // ── 程序纹理（无外部依赖） ──
    this.glowTex   = this.makeGlowTex(64);
    this.circleTex = this.makeMagicCircleTex(256);

    // ── 后处理 ──
    this.setupPostProcessing(w, h);

    // ── 构建场景 ──
    this.buildScene();

    // ── 事件 ──
    window.addEventListener('resize', this.onResize);
    container.addEventListener('mousedown', this.onMouseDown);
    container.addEventListener('mousemove', this.onMouseMove);
    container.addEventListener('click', this.onClick);

    this.animate();
  }

  // ─── 后处理 ──────────────────────────────────────────────────────────────────

  private setupPostProcessing(w: number, h: number) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.cameraController.camera));

    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.45, 0.9);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
  }

  // ─── 场景构建 ───────────────────────────────────────────────────────────────

  private buildScene() {
    this.buildSkybox();          // 第五部分：仙侠天空 + 暖金太阳 + 远山
    this.buildVolumetricFog();   // 第三部分：体积雾
    this.setupLights();
    this.buildCloudSea();        // 第一部分：双层动态云海（脚下的"海"）
    // 不再铺程序地形平板——每座建筑用 GLB 自带浮空岛悬浮于云海之上
    this.createBuildings();
    this.buildLeyLines();
    this.buildCloudRings();      // 第二部分：建筑脚下云环
    this.buildValleyClouds();    // 第四部分：山谷流云
    this.buildWorldDecor();      // 世界装饰：小浮岛 + 远峰 + 飞鸟 + 花瓣
  }

  // ─── 光照 ────────────────────────────────────────────────────────────────────

  private setupLights() {
    this.scene.add(new THREE.AmbientLight(0x8095bb, 0.6));

    const sun = new THREE.DirectionalLight(0xfff0cc, 1.3);
    sun.position.set(1800, 3000, 1200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 8000;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -2000;
    sun.shadow.camera.right = sun.shadow.camera.top = 2000;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x3355aa, 0.45);
    fill.position.set(-2000, 600, -2000);
    this.scene.add(fill);

    // 主峰峰顶金光
    const peakGlow = new THREE.PointLight(0xffdd66, 1.1, 900, 1.6);
    peakGlow.position.set(0, terrainAt(0, 0) + 320, 0);
    this.scene.add(peakGlow);
  }

  // ─── 星空 ────────────────────────────────────────────────────────────────────

  private createStarField() {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palettes = [[0.85, 0.90, 1.00], [1.00, 0.95, 0.70], [0.60, 0.78, 1.00]];
    for (let i = 0; i < count; i++) {
      // 球形分布，半径 8000~14000
      const r = 8000 + Math.random() * 6000;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.5; // 上半球
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.cos(phi) + 200;
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
      const p = palettes[i % palettes.length];
      col[i*3] = p[0]; col[i*3+1] = p[1]; col[i*3+2] = p[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starField = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.5, vertexColors: true, transparent: true, opacity: 0.75,
      sizeAttenuation: false, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.scene.add(this.starField);
  }

  // ─── 程序云纹理 / 天空纹理 ───────────────────────────────────────────────────

  private makeCloudCanvasTexture(size = 512, tint = '#ffffff', density = 26): THREE.CanvasTexture {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    // 多个柔和径向团块叠出云絮，透明渐变
    for (let i = 0; i < density; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = size * (0.05 + Math.random() * 0.16);
      const a = 0.10 + Math.random() * 0.22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a * 0.4})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 整体染色（保留 alpha 形状）
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeSkyTexture(): THREE.CanvasTexture {
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 512;
    const ctx = cv.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0.00, '#1e4e8c');   // 天顶深蓝
    g.addColorStop(0.42, '#5b9bd8');
    g.addColorStop(0.50, '#bcd8f5');   // 地平线（球体赤道）
    g.addColorStop(0.57, '#ffe9c4');   // 金色晨光
    g.addColorStop(1.00, '#ffdba0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 512);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeMountainTexture(): THREE.CanvasTexture {
    const w = 2048, h = 512;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    // 两层远山剪影，越远越淡（仙气蓝）
    const drawRange = (baseline: number, amp: number, color: string, step: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      let y = baseline;
      for (let x = 0; x <= w; x += step) {
        y = baseline + (Math.sin(x * 0.013) + Math.sin(x * 0.031 + 2)) * amp * 0.5 + (Math.random() - 0.5) * amp * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };
    drawRange(h * 0.55, 70, 'rgba(120,150,190,0.45)', 60);  // 远层
    drawRange(h * 0.68, 55, 'rgba(90,120,165,0.65)', 45);   // 近层
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ─── 第三部分：体积雾 ─────────────────────────────────────────────────────────

  private buildVolumetricFog() {
    // 颜色 #DDEBFF；密度按本场景尺度（千级单位）整定为 0.00016，
    // spec 的 0.002 在此尺度会整屏白雾（exp 雾 factor=1-e^{-(density*dist)^2}，dist~1240 时 0.002 ≈ 全白）
    this.scene.fog = new THREE.FogExp2(0xd4e4f7, 0.0001);
  }

  // ─── 第五部分：仙侠天空 + 太阳 + 远山 ─────────────────────────────────────────

  private buildSkybox() {
    // 渐变天幕（球内壁）
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(9000, 32, 16),
      new THREE.MeshBasicMaterial({ map: this.makeSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.scene.add(dome);
    this.scene.background = null; // 天幕替代纯色背景

    // 暖金太阳（additive 光晕，配合 Bloom 近似 GodRay）
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.makeGlowTex(128), color: 0xffdd99, transparent: true,
      opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    sun.scale.set(1500, 1500, 1);
    sun.position.set(2600, 2200, -3400);
    this.scene.add(sun);
    this.sunSprite = sun;

    // 远山剪影环
    const mtn = new THREE.Mesh(
      new THREE.CylinderGeometry(7200, 7200, 1700, 64, 1, true),
      new THREE.MeshBasicMaterial({ map: this.makeMountainTexture(), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    mtn.position.y = 180;
    this.scene.add(mtn);
  }

  // ─── 第一部分：双层动态云海 ───────────────────────────────────────────────────

  private buildCloudSea() {
    const mk = (size: number, y: number, tint: string, opacity: number, speed: number, repeat: number) => {
      const tex = this.makeCloudCanvasTexture(512, tint, 30);
      tex.repeat.set(repeat, repeat);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      mesh.userData = { speed };
      this.scene.add(mesh);
      this.cloudLayers.push(mesh);
    };
    // 贴在浮岛底座下方，成为脚下的云海地面（建筑从云中升起）
    mk(16000, -18, '#f2f7ff', 0.78, 0.003,  5);  // Layer1 主云海，较浓
    mk(20000, -6,  '#cfe2ff', 0.45, -0.002, 4);  // Layer2 稀疏淡蓝，反方向
  }

  // ─── 第二部分：建筑脚下云环 ───────────────────────────────────────────────────

  private buildCloudRings() {
    const CFG: Record<string, { r: number; tint: string; spin: number; particle: number }> = {
      sectHall:       { r: 300, tint: '#dbeaff', spin: 0.06,  particle: 0xffd966 }, // 蓝白云环 + 金色灵气
      swordHall:      { r: 220, tint: '#cfeaff', spin: 0.20,  particle: 0x9fe0ff }, // 高速流云 + 剑气
      scriptureHall:  { r: 220, tint: '#9cc4ff', spin: 0.05,  particle: 0x7fb0ff }, // 蓝色灵雾
      alchemyHall:    { r: 220, tint: '#ffcaa0', spin: 0.08,  particle: 0xff8a3c }, // 赤金云雾 + 火焰
      innerDemonHall: { r: 260, tint: '#b9a8ff', spin: 0.025, particle: 0xb38bff }, // 蓝紫封印雾，缓慢
      beastGarden:    { r: 220, tint: '#a9ffc4', spin: 0.07,  particle: 0x7dff9e }, // 绿色灵雾 + 萤火
      farm:           { r: 220, tint: '#d6ffb0', spin: 0.05,  particle: 0xffe07a }, // 淡绿薄雾 + 金灵气
    };
    SECT_NODES.forEach(def => {
      const cfg = CFG[def.id] ?? { r: 200, tint: '#dbeaff', spin: 0.06, particle: 0xffffff };
      const baseY = terrainAt(def.pos[0], def.pos[2]);
      // 云环盘
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(cfg.r * 0.42, cfg.r, 56),
        new THREE.MeshBasicMaterial({ map: this.makeCloudCanvasTexture(512, cfg.tint, 32), transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, fog: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(def.pos[0], baseY + 8, def.pos[2]);
      ring.userData = { spin: cfg.spin };
      this.scene.add(ring);
      this.cloudRings.push(ring);
      // 主题灵气粒子
      this.scene.add(this.makeRingParticles(def.pos[0], def.pos[2], baseY + 6, cfg.r, cfg.particle));
    });
  }

  private makeRingParticles(cx: number, cz: number, baseY: number, r: number, color: number, count = 44): THREE.Points {
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = r * (0.3 + Math.random() * 0.75);
      const x = cx + Math.cos(a) * rad;
      const z = cz + Math.sin(a) * rad;
      const y = baseY + Math.random() * 80;
      positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
      base[i*3] = x; base[i*3+1] = baseY; base[i*3+2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size: 8, map: this.glowTex, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    pts.userData = { basePos: base, speed: 0.35 + Math.random() * 0.45, range: 190 };
    this.ringParticles.push(pts);
    return pts;
  }

  // ─── 第四部分：山谷流云（billboard plane） ────────────────────────────────────

  private buildValleyClouds() {
    // 预生成几张共享云纹理，billboard 复用（避免几十张 canvas 纹理）
    const texes = [
      this.makeCloudCanvasTexture(512, '#f4f8ff', 16),
      this.makeCloudCanvasTexture(512, '#e6effc', 20),
      this.makeCloudCanvasTexture(512, '#d3e3ff', 14),
      this.makeCloudCanvasTexture(512, '#ffffff', 22),
    ];
    const pick = () => texes[(Math.random() * texes.length) | 0];

    const addBand = (
      count: number, rMin: number, rMax: number, yMin: number, yMax: number,
      sMin: number, sMax: number, oMin: number, oMax: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * (rMax - rMin);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const y = yMin + Math.random() * (yMax - yMin);
        const s = sMin + Math.random() * (sMax - sMin);
        const op = oMin + Math.random() * (oMax - oMin);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(s * 1.8, s),
          new THREE.MeshBasicMaterial({
            map: pick(), transparent: true,
            opacity: op,
            depthWrite: false, side: THREE.DoubleSide, fog: false,
          }),
        );
        mesh.position.set(x, y, z);
        mesh.userData = { drift: (Math.random() - 0.5) * 0.5, phase: Math.random() * Math.PI * 2, baseY: y, ang: a, rad: r, baseOp: op };
        this.scene.add(mesh);
        this.valleyClouds.push(mesh);
      }
    };

    // 三层云带：近景翻涌缭绕 / 中景填满空隙 / 远景云塔与地平线
    // 减半数量；剩余 billboard 体积放大以保持覆盖感（视觉密度几乎不变，但每帧朝向相机 / 透明度计算开销减半）
    addBand(10,  280, 1400,  -55,  -8,   900, 1900, 0.42, 0.72);  // 近景
    addBand(14, 1400, 2900,  -95,  20,  1400, 2900, 0.30, 0.55);  // 中景
    addBand(8,  2900, 4800, -130, 200,  2500, 4500, 0.20, 0.42);  // 远景云塔
  }

  // ─── 世界装饰：小浮岛 + 远峰 + 飞鸟 + 花瓣 ──────────────────────────────────────

  private buildWorldDecor() {
    this.buildDecorIslets();
    this.buildDistantPeaks();
    this.buildBirds();
    this.buildPetals();
    this.buildFlyingImmortals(); // 御剑仙人掠过
    this.buildSpiritDust();      // 全局漂浮灵尘
  }

  // 全局漂浮灵尘：缓慢上浮的细微光尘，弥漫整个宗门
  private buildSpiritDust() {
    const COUNT = 260;
    const pos = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 4000;
      pos[i*3+1] = -100 + Math.random() * 900;
      pos[i*3+2] = (Math.random() - 0.5) * 4000;
      spd[i] = 0.1 + Math.random() * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.spiritDust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xfff4d6, size: 4, map: this.glowTex, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
    }));
    this.spiritDust.userData = { spd, topY: 900 };
    this.scene.add(this.spiritDust);
  }

  // 主灵脉云阶大道：从前景升向宗门大殿，营造"登仙之路"
  private buildSpiritAvenue() {
    const start = new THREE.Vector3(0, -30, 800);
    const end   = new THREE.Vector3(0, terrainAt(0, 0) + 15, 210);
    const mid   = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y += 40; mid.x += 30;

    const stepMat = new THREE.MeshStandardMaterial({
      color: 0xcfe2ea, roughness: 0.5, metalness: 0.1,
      emissive: 0x2a5a7a, emissiveIntensity: 0.3, transparent: true, opacity: 0.92,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffe6a8, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    const STEPS = 16;
    for (let i = 0; i < STEPS; i++) {
      const f = i / (STEPS - 1);
      const p = new THREE.Vector3().lerpVectors(start, end, f);
      p.x += Math.sin(f * Math.PI * 1.6) * 70;          // 蜿蜒
      const r = 95 - f * 42;                            // 近宽远窄
      const step = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, 9, 8), stepMat);
      step.position.copy(p);
      step.castShadow = true;
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.66, 2.5, 8), glowMat);
      glow.position.y = 6;
      step.add(glow);
      step.userData = { baseY: p.y, phase: i * 0.5, bob: 4 };
      this.scene.add(step);
      this.decorBob.push(step);
    }

    // 中央流光灵脉沿大道流淌
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, 4, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.scene.add(tube);
    this.addLeyParticles(curve, 0xffe6a8);             // 复用灵脉流光粒子
  }

  // 御剑仙人：横向掠过场景，留光痕，循环
  private makeSwordImmortalTexture(): THREE.CanvasTexture {
    const w = 160, h = 64;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d')!;
    // 御剑光痕（水平拖尾，头部亮）
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0.0, 'rgba(159,212,255,0)');
    g.addColorStop(0.7, 'rgba(180,225,255,0.5)');
    g.addColorStop(1.0, 'rgba(255,240,200,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 34); ctx.lineTo(w, 30); ctx.lineTo(w, 38); ctx.lineTo(0, 38);
    ctx.closePath(); ctx.fill();
    // 剑（头部细长）
    ctx.strokeStyle = 'rgba(230,245,255,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w - 60, 36); ctx.lineTo(w - 6, 33); ctx.stroke();
    // 仙人剪影（立于剑上）
    ctx.fillStyle = '#2a3550';
    ctx.beginPath();
    ctx.ellipse(w - 30, 24, 5, 11, 0, 0, Math.PI * 2);   // 身体
    ctx.fill();
    ctx.beginPath(); ctx.arc(w - 30, 11, 4, 0, Math.PI * 2); ctx.fill(); // 头
    // 飘带
    ctx.strokeStyle = 'rgba(120,160,210,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w - 34, 24); ctx.quadraticCurveTo(w - 55, 20, 80, 28); ctx.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildFlyingImmortals() {
    const tex = this.makeSwordImmortalTexture();
    const lanes = [
      { y: 380, z: 200,  vx: 2.6,  size: 200 },
      { y: 520, z: -300, vx: -1.9, size: 170 },
      { y: 300, z: 650,  vx: 3.1,  size: 220 },
      { y: 600, z: 100,  vx: -2.3, size: 180 },
    ];
    lanes.forEach((ln, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.95, depthWrite: false, fog: true,
      }));
      const dir = ln.vx >= 0 ? 1 : -1;
      sp.scale.set(ln.size * dir, ln.size * 0.4, 1);     // 负 x 翻转朝向
      sp.position.set((i % 2 ? -1 : 1) * 1800, ln.y, ln.z);
      sp.userData = { vx: ln.vx, baseY: ln.y, phase: Math.random() * Math.PI * 2, maxX: 2400, size: ln.size };
      this.scene.add(sp);
      this.flyers.push(sp);
    });
  }

  private makeTree(): THREE.Group {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 3.5, 16, 5),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 }),
    );
    trunk.position.y = 8;
    g.add(trunk);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(13 - i * 3, 16, 6), foliageMat);
      cone.position.y = 16 + i * 9;
      g.add(cone);
    }
    g.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    return g;
  }

  // 加载装饰 GLB → 归一化尺寸 → 返回 {原型容器, 高度} 供克隆/堆叠
  private loadDecorProto(path: string, targetSize: number): Promise<{ proto: THREE.Group; height: number }> {
    return loadGLBCached(path).then((model) => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = targetSize / Math.max(size.x, size.y, size.z, 1);
      model.scale.setScalar(scale);
      const b2 = new THREE.Box3().setFromObject(model);
      model.position.y = -b2.min.y;             // 底部归零
      model.traverse(c => { if (c instanceof THREE.Mesh) c.castShadow = true; });
      const container = new THREE.Group();
      container.add(model);
      return { proto: container, height: b2.max.y - b2.min.y };
    }).catch(() => ({ proto: new THREE.Group(), height: 0 }));
  }

  private buildDecorIslets() {
    Promise.all([
      this.loadDecorProto('/models/fuyan.glb',     185),
      this.loadDecorProto('/models/shucong.glb',   125),
      this.loadDecorProto('/models/liangting.glb', 120),
      this.loadDecorProto('/models/lingjing.glb',   60),
    ]).then(([island, tree, pavilion, crystal]) => {
      // 独立散布：浮岩/树丛/灵晶 各自带底座，可单独悬浮
      const scatter = (
        item: { proto: THREE.Group; height: number }, count: number,
        rMin: number, rMax: number, yMin: number, yMax: number, sMin: number, sMax: number,
      ) => {
        if (item.height <= 0) return;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = rMin + Math.random() * (rMax - rMin);
          const y = yMin + Math.random() * (yMax - yMin);
          const m = item.proto.clone();
          m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
          m.scale.multiplyScalar(sMin + Math.random() * (sMax - sMin));
          m.rotation.y = Math.random() * Math.PI * 2;
          m.userData = { baseY: y, phase: Math.random() * Math.PI * 2, bob: 5 + Math.random() * 9 };
          this.scene.add(m);
          this.decorBob.push(m);
        }
      };
      scatter(island,  9, 900, 2300, -140, 300, 0.6, 1.4);  // 浮岩
      scatter(tree,    9, 800, 2100,  -90, 250, 0.7, 1.4);  // 树丛（自带草地底座）
      scatter(crystal, 6, 700, 2100,  -60, 260, 0.6, 1.3);  // 灵晶（自带岩底）

      // 凉亭：单独悬浮会突兀 → 立在浮岩岛顶
      if (island.height > 0 && pavilion.height > 0) {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 1000 + Math.random() * 1100;
          const y = -40 + Math.random() * 200;
          const s = 0.85 + Math.random() * 0.4;
          const wrap = new THREE.Group();
          wrap.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
          wrap.rotation.y = Math.random() * Math.PI * 2;
          const isl = island.proto.clone();
          isl.scale.multiplyScalar(s);
          wrap.add(isl);
          const pav = pavilion.proto.clone();
          pav.scale.multiplyScalar(s * 0.9);
          pav.position.y = island.height * s * 0.72;       // 坐在岩岛顶面
          wrap.add(pav);
          wrap.userData = { baseY: y, phase: Math.random() * Math.PI * 2, bob: 5 + Math.random() * 8 };
          this.scene.add(wrap);
          this.decorBob.push(wrap);
        }
      }
    });
  }

  private buildDistantPeaks() {
    const rockMat = new THREE.MeshBasicMaterial({ color: 0x8ea6c6, transparent: true, opacity: 0.8, fog: true });
    const snowMat = new THREE.MeshBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 0.85, fog: true });
    // 远山下半部被云海吞没，4 座 + 错开角度比 6 座效果几乎相同
    const COUNT = 4;
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const r = 3400 + Math.random() * 1800;
      const h = 1100 + Math.random() * 900;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(h * 0.5, h, 6), rockMat);
      peak.position.set(x, -h * 0.5 + 60, z);   // 大部分沉在云海里，只露上半
      this.scene.add(peak);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(h * 0.22, h * 0.3, 6), snowMat);
      cap.position.set(x, peak.position.y + h * 0.35, z);
      this.scene.add(cap);
    }
  }

  private makeBirdTexture(): THREE.CanvasTexture {
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d')!;
    ctx.strokeStyle = '#33414f';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();              // 简单的飞鸟「M」剪影
    ctx.moveTo(8, 38);
    ctx.quadraticCurveTo(24, 20, 32, 34);
    ctx.quadraticCurveTo(40, 20, 56, 38);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildBirds() {
    const tex = this.makeBirdTexture();
    // 16 → 8：远景小剪影，数量减半在天空中几乎察觉不到差异
    const COUNT = 8;
    for (let i = 0; i < COUNT; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false, fog: true });
      const sp = new THREE.Sprite(mat);
      const r = 600 + Math.random() * 2200;
      const s = 30 + Math.random() * 40;
      sp.scale.set(s, s * 0.6, 1);
      const ang = Math.random() * Math.PI * 2;
      sp.userData = { ang, rad: r, baseY: 150 + Math.random() * 400, phase: Math.random() * Math.PI * 2, speed: 0.0003 + Math.random() * 0.0004 };
      sp.position.set(Math.cos(ang) * r, sp.userData.baseY, Math.sin(ang) * r);
      this.scene.add(sp);
      this.birds.push(sp);
    }
  }

  private buildPetals() {
    const COUNT = 140;
    const pos  = new Float32Array(COUNT * 3);
    const base = new Float32Array(COUNT * 3);
    const spd  = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 2400;
      const z = (Math.random() - 0.5) * 2400;
      const y = Math.random() * 600;
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
      base[i*3] = x; base[i*3+2] = z;
      spd[i] = 0.3 + Math.random() * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.petals = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd9ec, size: 7, map: this.glowTex, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.petals.userData = { base, spd, topY: 600 };
    this.scene.add(this.petals);
  }

  // ─── 第一层：地形 ────────────────────────────────────────────────────────────

  private buildTerrain() {
    const SIZE = 2600;
    const SEGS = 120;
    const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos    = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainAt(x, z);
      pos.setY(i, y);

      // 顶点着色：草地 → 岩石 → 雪峰
      const t = Math.min(1, y / 240);
      let r: number, g: number, b: number;
      if (t < 0.28) {
        r = 0.16 + t * 0.08; g = 0.30 + t * 0.05; b = 0.10;
      } else if (t < 0.68) {
        const s = (t - 0.28) / 0.40;
        r = 0.28 + s * 0.18; g = 0.24 + s * 0.06; b = 0.18 + s * 0.06;
      } else {
        const s = (t - 0.68) / 0.32;
        r = 0.46 + s * 0.42; g = 0.42 + s * 0.46; b = 0.38 + s * 0.52;
      }
      colors[i*3] = r; colors[i*3+1] = g; colors[i*3+2] = b;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    this.terrainMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.88, metalness: 0.04,
      }),
    );
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  // ─── 瀑布（悬崖粒子系统） ───────────────────────────────────────────────────

  private buildWaterfall() {
    // 悬崖位置：x≈1380, z≈-550（东侧台地边缘）
    const WX = 1380, WZ = -550;
    const topY = terrainAt(WX, WZ) + 10;

    const COUNT = 700;
    const pos   = new Float32Array(COUNT * 3);
    const base  = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const spread = (Math.random() - 0.5) * 90;
      const startY = topY - Math.random() * 240; // 错开初始高度
      pos[i*3]   = base[i*3]   = WX + spread;
      pos[i*3+1] =               startY;
      pos[i*3+2] = base[i*3+2] = WZ + (Math.random() - 0.5) * 20;
      base[i*3+1] = topY;
      speed[i] = 1.4 + Math.random() * 1.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.waterfallPts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x88ccff, size: 2.8, transparent: true, opacity: 0.72,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.waterfallPts.userData = { base, speed, topY, bottomY: topY - 260 };
    this.scene.add(this.waterfallPts);
  }

  // ─── 第二层：建筑 ────────────────────────────────────────────────────────────

  private createBuildings() {
    SECT_NODES.forEach((def, idx) => {
      const group = new THREE.Group();
      const groundY = terrainAt(def.pos[0], def.pos[2]);
      group.position.set(def.pos[0], groundY, def.pos[2]);
      group.userData = { def, baseY: groundY, phase: idx * 0.85 };

      // ── 建筑 slot（GLB 加载后替换占位） ──
      // 仅在没有 glbPath 的情况下用几何占位；有 GLB 时直接等待模型加载，
      // 避免地图打开瞬间看到橙色球 / 绿色圆柱等几何占位形状。
      const slot = new THREE.Group();
      group.add(slot);
      if (!def.glbPath) this.addPlaceholder(slot, def);

      if (def.glbPath) {
        loadGLBCached(def.glbPath).then((model) => {
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const scale = (def.glbTargetSize ?? 320) / Math.max(size.x, size.y, size.z, 1);
          model.scale.setScalar(scale);
          const b2 = new THREE.Box3().setFromObject(model);
          model.position.y = -b2.min.y;
          model.rotation.y = def.glbRotationY ?? Math.PI;
          model.traverse(c => {
            if (c instanceof THREE.Mesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          slot.clear();
          slot.add(model);
          this.raycastDirty = true;
        }).catch(() => { /* GLB 加载失败 → 回落到几何占位，确保建筑不缺席 */
          this.addPlaceholder(slot, def);
          this.raycastDirty = true;
        });
      }

      // ── 地面法阵 ──
      const circle = new THREE.Mesh(
        new THREE.PlaneGeometry(220, 220),
        new THREE.MeshBasicMaterial({
          map: this.circleTex, transparent: true, opacity: 0.50,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        }),
      );
      circle.rotation.x = -Math.PI / 2;
      circle.position.y = 2;
      circle.userData.isCircle = true;
      group.add(circle);
      this.buildingCircles.push(circle);

      // ── 主题点光源 ──
      const ptLight = new THREE.PointLight(def.color, 1.8, 800, 1.6);
      ptLight.position.y = 140;
      group.add(ptLight);

      // ── 粒子（向上浮动的灵气光点） ──
      this.addBuildingParticles(group, def);

      // ── 建筑专属动态特效（让建筑"活"起来） ──
      this.buildBuildingEffects(group, def);

      // ── CSS2D 标签 ──
      const label = this.createLabel(def);
      label.position.y = 280;
      group.add(label);

      this.scene.add(group);
      this.buildings.push(group);
    });
  }

  // ─── 建筑动态特效系统 ─────────────────────────────────────────────────────────

  /** 软发光精灵（灵气光晕/拖尾通用） */
  private glowSprite(color: number, size: number, opacity = 0.8): THREE.Sprite {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  /** 上浮灵气粒子（作为建筑子节点，复用 animate 中 basePos 上浮逻辑） */
  private makeMotesChild(color: number, count: number, spreadXZ: number, baseY: number, size = 9): THREE.Points {
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = Math.random() * spreadXZ;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const y = baseY + Math.random() * 120;
      positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
      base[i*3] = x; base[i*3+1] = baseY; base[i*3+2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, map: this.glowTex, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    const speed = 0.5 + Math.random() * 0.5;
    pts.userData = { basePos: base, speed };
    this.buildingPointsList.push({ pts, basePos: base, speed });
    return pts;
  }

  private buildBuildingEffects(group: THREE.Group, def: SectNodeDef) {
    switch (def.id) {
      case 'sectHall':       this.fxSectHall(group); break;
      case 'swordHall':      this.fxSwordHall(group); break;
      case 'scriptureHall':  this.fxScriptureHall(group); break;
      case 'alchemyHall':    this.fxAlchemyHall(group); break;
      case 'innerDemonHall': this.fxInnerDemonHall(group); break;
      case 'beastGarden':    this.fxBeastGarden(group); break;
      case 'farm':           this.fxFarm(group); break;
    }
  }

  // 宗门大殿：悬浮灵晶 + 光晕脉冲（地面法阵已在 createBuildings 中旋转）
  private fxSectHall(group: THREE.Group) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(26),
      new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc844, emissiveIntensity: 1.3, metalness: 0.3, roughness: 0.2 }),
    );
    crystal.position.y = 330; crystal.scale.y = 1.6;
    group.add(crystal);
    const halo = this.glowSprite(0xffd966, 170, 0.85); halo.position.y = 330; group.add(halo);
    group.add(this.makeMotesChild(0xffd966, 40, 110, 20));   // 金色灵气
    this.buildingFx.push((t) => {
      crystal.position.y = 330 + Math.sin(t * 0.8) * 16;
      crystal.rotation.y += 0.01;
      (halo.material as THREE.SpriteMaterial).opacity = 0.7 + Math.sin(t * 2) * 0.2;
    });
  }

  /** 用 ExtrudeGeometry 构建一把精致的剑（剑身尖锋 + 血槽倒角 + 十字护手 + 剑柄 + 剑首 + 剑气） */
  private makeSword(): THREE.Group {
    const s = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, emissive: 0x3aa0ff, emissiveIntensity: 0.95, metalness: 0.95, roughness: 0.22 });
    const goldMat  = new THREE.MeshStandardMaterial({ color: 0xe8c66a, emissive: 0x5a4310, emissiveIntensity: 0.35, metalness: 1.0, roughness: 0.35 });
    const gripMat  = new THREE.MeshStandardMaterial({ color: 0x281d2e, roughness: 0.85, metalness: 0.2 });

    // 剑身：2D 剑形轮廓 → 拉伸 + 倒角形成锋利刃口
    const w = 3.2, L = 62;
    const shape = new THREE.Shape();
    shape.moveTo(-w, 0);
    shape.lineTo(-w, L * 0.80);
    shape.lineTo(0, L);            // 尖锋
    shape.lineTo(w, L * 0.80);
    shape.lineTo(w, 0);
    shape.lineTo(-w, 0);
    const bladeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.8, bevelEnabled: true, bevelThickness: 1.0, bevelSize: 1.0, bevelSegments: 1, steps: 1,
    });
    bladeGeo.translate(0, 0, -0.9);  // 厚度居中
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    s.add(blade);

    // 十字护手
    const guard = new THREE.Mesh(new THREE.BoxGeometry(22, 4.5, 6, 1, 1, 1), goldMat);
    guard.position.y = -1; s.add(guard);
    // 圆珠护手两端
    [-10, 10].forEach(x => {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), goldMat);
      knob.position.set(x, -1, 0); s.add(knob);
    });
    // 剑柄
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 16, 10), gripMat);
    grip.position.y = -10; s.add(grip);
    // 剑首
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 12), goldMat);
    pommel.position.y = -19; s.add(pommel);

    // 剑气光晕（沿剑身）
    const aura = this.glowSprite(0x66bbff, 70, 0.45);
    aura.position.y = 34; s.add(aura);

    return s;
  }

  // 剑阁：8 把精致飞剑组成旋转剑阵 + 蓝色剑气
  private fxSwordHall(group: THREE.Group) {
    const ring = new THREE.Group();
    ring.position.y = 185;
    group.add(ring);

    const N = 8;
    for (let i = 0; i < N; i++) {
      const holder = new THREE.Group();
      holder.rotation.y = (i / N) * Math.PI * 2;
      const sword = this.makeSword();
      sword.position.x = 130;          // 沿半径外移
      sword.rotation.z = 0;            // 竖直，剑尖朝上
      sword.scale.setScalar(1.15);
      holder.add(sword);
      ring.add(holder);
    }

    const aura = this.glowSprite(0x66bbff, 170, 0.4); aura.position.y = 185; group.add(aura);
    group.add(this.makeMotesChild(0x88ccff, 36, 110, 30));

    this.buildingFx.push((t) => {
      ring.rotation.y += 0.012;                       // 剑阵旋转
      ring.position.y = 185 + Math.sin(t * 1.1) * 12; // 整体起伏
      (aura.material as THREE.SpriteMaterial).opacity = 0.35 + Math.sin(t * 1.6) * 0.15;
    });
  }

  // 藏经阁：漂浮经卷 + 蓝色光柱
  private fxScriptureHall(group: THREE.Group) {
    const scrollMat = new THREE.MeshStandardMaterial({ color: 0xf0e2b8, emissive: 0x553a14, emissiveIntensity: 0.4, roughness: 0.8 });
    const scrolls: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 34, 10), scrollMat);
      sc.rotation.z = Math.PI / 2;
      const a = (i / 4) * Math.PI * 2;
      sc.position.set(Math.cos(a) * 95, 150 + i * 14, Math.sin(a) * 95);
      sc.userData.base = 150 + i * 14;
      group.add(sc); scrolls.push(sc);
    }
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 32, 520, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x66bbff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    );
    beam.position.y = 260; group.add(beam);
    group.add(this.makeMotesChild(0x7fb0ff, 34, 90, 40));
    this.buildingFx.push((t) => {
      scrolls.forEach((sc, i) => {
        sc.position.y = sc.userData.base + Math.sin(t * 0.7 + i) * 12;
        sc.rotation.x += 0.01;
      });
      (beam.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 1.3) * 0.06;
    });
  }

  // 炼丹殿：火焰粒子 + 环绕丹药 + 热浪光晕
  private fxAlchemyHall(group: THREE.Group) {
    group.add(this.makeMotesChild(0xff6622, 50, 70, 20, 12));  // 火焰上升
    group.add(this.makeMotesChild(0xffcc44, 30, 50, 30, 8));   // 火星
    const pills: THREE.Mesh[] = [];
    const colors = [0xff5533, 0xffaa22, 0xff8844, 0xffcc66, 0xff6622];
    for (let i = 0; i < 5; i++) {
      const pill = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 12),
        new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 1.0 }));
      group.add(pill); pills.push(pill);
    }
    const heat = this.glowSprite(0xff8844, 130, 0.4); heat.position.y = 120; group.add(heat);
    this.buildingFx.push((t) => {
      pills.forEach((p, i) => {
        const a = (i / 5) * Math.PI * 2 + t * 1.1;
        p.position.set(Math.cos(a) * 90, 130 + Math.sin(t * 2 + i) * 14, Math.sin(a) * 90);
      });
      (heat.material as THREE.SpriteMaterial).opacity = 0.32 + Math.sin(t * 3) * 0.12;
    });
  }

  // 心魔殿：心跳核心 + 封印阵 + 摆动锁链 + 紫雾 + 漂浮知识碎片
  private fxInnerDemonHall(group: THREE.Group) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(22, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x6a3acc, emissive: 0x9b6bff, emissiveIntensity: 1.4, roughness: 0.4 }),
    );
    core.position.y = 170; group.add(core);
    const coreHalo = this.glowSprite(0xb38bff, 150, 0.7); coreHalo.position.y = 170; group.add(coreHalo);
    // 封印环（水平，反向旋转）
    const seal = new THREE.Mesh(
      new THREE.TorusGeometry(70, 3, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x9b6bff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    seal.rotation.x = Math.PI / 2; seal.position.y = 60; group.add(seal);
    // 漂浮锁链（几段圆环错落）
    const chains: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const ch = new THREE.Mesh(new THREE.TorusGeometry(14, 3, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x88809a, metalness: 0.8, roughness: 0.5 }));
      const a = (i / 4) * Math.PI * 2;
      ch.position.set(Math.cos(a) * 80, 90 + i * 18, Math.sin(a) * 80);
      ch.userData = { a, base: 90 + i * 18 };
      group.add(ch); chains.push(ch);
    }
    group.add(this.makeMotesChild(0xb38bff, 40, 90, 30));   // 紫色封印雾气
    this.buildingFx.push((t) => {
      const beat = 1 + Math.sin(t * 2.2) * 0.08;            // 心跳
      core.scale.setScalar(beat);
      (coreHalo.material as THREE.SpriteMaterial).opacity = 0.55 + Math.sin(t * 2.2) * 0.2;
      seal.rotation.z += 0.006;
      chains.forEach((ch, i) => {
        ch.position.y = ch.userData.base + Math.sin(t * 1.2 + i) * 8;
        ch.rotation.z += 0.01;
      });
    });
  }

  // 灵兽园：灵蝶/萤火 游走 + 落叶
  private fxBeastGarden(group: THREE.Group) {
    const fireflies: THREE.Sprite[] = [];
    for (let i = 0; i < 14; i++) {
      const f = this.glowSprite(Math.random() < 0.5 ? 0x9dff8a : 0xfff19a, 14, 0.85);
      f.userData = { a: Math.random() * Math.PI * 2, rad: 40 + Math.random() * 90, baseY: 30 + Math.random() * 80, phase: Math.random() * Math.PI * 2, spd: 0.2 + Math.random() * 0.4 };
      group.add(f); fireflies.push(f);
    }
    group.add(this.makeMotesChild(0x7dff9e, 30, 100, 20));
    this.buildingFx.push((t) => {
      fireflies.forEach((f) => {
        const u = f.userData;
        u.a += u.spd * 0.02;
        f.position.set(Math.cos(u.a) * u.rad, u.baseY + Math.sin(t * 1.5 + u.phase) * 18, Math.sin(u.a) * u.rad);
        (f.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(t * 3 + u.phase) * 0.4;  // 闪烁
      });
    });
  }

  // 灵田：绿色灵气上浮 + 灵泉光晕
  private fxFarm(group: THREE.Group) {
    group.add(this.makeMotesChild(0xbfff8a, 44, 120, 16, 8));
    const spring = this.glowSprite(0x9fe0c0, 120, 0.5); spring.position.y = 14; group.add(spring);
    this.buildingFx.push((t) => {
      (spring.material as THREE.SpriteMaterial).opacity = 0.4 + Math.sin(t * 1.4) * 0.15;
    });
  }

  private addPlaceholder(slot: THREE.Group, def: SectNodeDef) {
    const col = def.color;
    const mat = new THREE.MeshStandardMaterial({
      color: col, emissive: new THREE.Color(col).multiplyScalar(0.25),
      roughness: 0.35, metalness: 0.65,
    });

    const parts: THREE.Mesh[] = [];
    switch (def.id) {
      case 'sectHall': {
        // 多层宝塔（5 层）
        for (let i = 0; i < 5; i++) {
          const r = 55 - i * 9;
          const h = 28;
          parts.push(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, h, 8), mat));
          parts[i].position.y = i * (h + 8) + 10;
        }
        break;
      }
      case 'swordHall': {
        // 细高剑塔 + 光环
        parts.push(new THREE.Mesh(new THREE.CylinderGeometry(18, 28, 200, 6), mat));
        parts[0].position.y = 100;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(50, 4, 6, 20),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 140;
        parts.push(ring);
        break;
      }
      case 'scriptureHall': {
        // 宽楼 + 坡屋顶
        parts.push(new THREE.Mesh(new THREE.BoxGeometry(110, 80, 90), mat));
        parts[0].position.y = 40;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(90, 50, 4), mat);
        roof.position.y = 100;
        roof.rotation.y = Math.PI / 4;
        parts.push(roof);
        break;
      }
      case 'alchemyHall': {
        // 圆顶炉 + 尖顶
        const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat);
        dome.position.y = 10;
        parts.push(dome);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(10, 80, 6), mat);
        spire.position.y = 100;
        parts.push(spire);
        break;
      }
      case 'innerDemonHall': {
        // 深蓝殿身 + 棱锥屋顶 + 地面封印阵环（暗金）
        const hall = new THREE.Mesh(new THREE.BoxGeometry(120, 58, 90), mat);
        hall.position.y = 29;
        parts.push(hall);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(92, 42, 4), mat);
        roof.position.y = 80;
        roof.rotation.y = Math.PI / 4;
        parts.push(roof);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(78, 4, 8, 36), mat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 2;
        parts.push(ring);
        break;
      }
      case 'beastGarden': {
        // 圆形兽栏群落
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const cage = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 45, 6), mat);
          cage.position.set(Math.cos(a) * 65, 22, Math.sin(a) * 65);
          parts.push(cage);
        }
        parts.push(new THREE.Mesh(new THREE.SphereGeometry(24, 8, 8), mat));
        parts[parts.length - 1].position.y = 40;
        break;
      }
      case 'farm': {
        // 梯田（叠加低矮圆柱）
        const radii = [100, 80, 60, 42];
        radii.forEach((r, i) => {
          const terrace = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 8, 12, 16), mat);
          terrace.position.y = i * 14;
          parts.push(terrace);
        });
        break;
      }
      default: {
        parts.push(new THREE.Mesh(new THREE.CylinderGeometry(30, 38, 120, 8), mat));
        parts[0].position.y = 60;
      }
    }
    parts.forEach(p => { p.castShadow = true; slot.add(p); });
  }

  private addBuildingParticles(group: THREE.Group, def: SectNodeDef) {
    const count = 50;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const rad   = Math.random() * 120;
      positions[i*3]   = Math.cos(theta) * rad;
      positions[i*3+1] = Math.random() * 250 + 20;
      positions[i*3+2] = Math.sin(theta) * rad;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: this.glowTex, size: 14, transparent: true, opacity: 0.5,
      color: def.color, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    pts.userData.basePos  = positions.slice();
    pts.userData.speed    = 0.28 + Math.random() * 0.18;
    group.add(pts);
    this.buildingPointsList.push({ pts, basePos: pts.userData.basePos, speed: pts.userData.speed });
  }

  private createLabel(def: SectNodeDef): CSS2DObject {
    const isLocked = (def.unlockRealm ?? 0) > this.userRealmLevel;
    const imgSrc   = this.buildingImages[def.id];

    // 外层 wrap 仅做定位（CSS2DRenderer 会覆写其 transform）；视觉盒子放内层 box，缩放作用其上
    const wrap = document.createElement('div');
    const box = document.createElement('div');
    Object.assign(box.style, {
      background: 'rgba(4,12,28,0.88)',
      border: `1px solid ${isLocked ? 'rgba(200,120,0,0.6)' : 'rgba(212,168,67,0.65)'}`,
      borderRadius: '10px', padding: '7px 13px',
      textAlign: 'center', userSelect: 'none',
      backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
      transformOrigin: 'center center', willChange: 'transform',
    });
    wrap.appendChild(box);

    if (imgSrc) {
      const img = document.createElement('img');
      img.src = imgSrc;
      Object.assign(img.style, { width: '48px', height: '48px', objectFit: 'contain', display: 'block', margin: '0 auto 3px' });
      box.appendChild(img);
    }

    const nameEl = document.createElement('div');
    nameEl.textContent = def.name;
    Object.assign(nameEl.style, {
      fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px',
      color: isLocked ? '#cc8844' : '#ffdda1', marginBottom: '2px',
    });
    box.appendChild(nameEl);

    if (isLocked) {
      const lock = document.createElement('div');
      lock.textContent = '🔒 境界不足';
      Object.assign(lock.style, { fontSize: '11px', color: '#ffaa44' });
      box.appendChild(lock);
    }

    const obj = new CSS2DObject(wrap);
    obj.userData.box = box;
    this.labels.push(obj);
    return obj;
  }

  // ─── 第三层：灵脉网络 ────────────────────────────────────────────────────────

  private buildLeyLines() {
    const center = this.buildings.find(b => b.userData.def.id === 'sectHall');
    if (!center) return;

    const centerPos = center.position.clone().setY(center.position.y + 60);

    this.buildings.forEach(bld => {
      if (bld.userData.def.id === 'sectHall') return;

      const def = bld.userData.def as SectNodeDef;
      const endPos = bld.position.clone().setY(bld.position.y + 60);

      // 弓形控制点（抬高中点让曲线优美）
      const mid = centerPos.clone().lerp(endPos, 0.5);
      mid.y = Math.max(centerPos.y, endPos.y) + 120;

      const curve = new THREE.CatmullRomCurve3([centerPos, mid, endPos]);

      // 灵脉配色：金 / 蓝紫(心魔殿) / 蓝
      const isGold = ['alchemyHall', 'farm'].includes(def.id);
      const isDemon = def.id === 'innerDemonHall';
      const colorA = isDemon ? new THREE.Color(0x2a0044) : isGold ? new THREE.Color(0x552200) : new THREE.Color(0x001177);
      const colorB = isDemon ? new THREE.Color(0x9b6bff) : isGold ? new THREE.Color(0xffcc33) : new THREE.Color(0x44aaff);

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: this.timeUniform,   // 共享，不用独立更新
          colorA: { value: colorA },
          colorB: { value: colorB },
        },
        vertexShader: LEY_VERT,
        fragmentShader: LEY_FRAG,
        transparent: true,
        side: THREE.FrontSide,            // 单面，避免加色双面叠亮
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.leyShaders.push(mat);

      // 灵脉主管道（细化）
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 2.4, 8, false), mat);
      this.scene.add(tube);

      // 外层辉光（更窄更淡，仅一点光晕）
      const glowMat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xffaa22 : 0x2266ff,
        transparent: true, opacity: 0.03,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
      });
      this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 6, 8, false), glowMat));

      // 流光粒子（沿曲线游走）
      this.addLeyParticles(curve, isGold ? def.color : 0x88ccff);
    });
  }

  private addLeyParticles(curve: THREE.CatmullRomCurve3, color: number) {
    const COUNT = 18;
    const positions = new Float32Array(COUNT * 3);
    const offsets   = new Float32Array(COUNT); // [0,1) 相位偏移

    // 预采样曲线为查找表：每帧 O(1) 索引代替 CatmullRomCurve3.getPoint()（每次 ~20 次 Vector3 数学）。
    // 7 条灵脉 × 18 粒子 × 60fps ≈ 7560 次 getPoint/秒 是肉眼看不到差别的"看不见的卡顿源"。
    const LUT_SEGMENTS = 256;
    const lut = new Float32Array(LUT_SEGMENTS * 3);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < LUT_SEGMENTS; i++) {
      curve.getPoint(i / LUT_SEGMENTS, tmp);
      lut[i*3] = tmp.x; lut[i*3+1] = tmp.y; lut[i*3+2] = tmp.z;
    }

    for (let i = 0; i < COUNT; i++) {
      offsets[i] = i / COUNT;
      const idx = (offsets[i] * LUT_SEGMENTS) | 0;
      positions[i*3] = lut[idx*3]; positions[i*3+1] = lut[idx*3+1]; positions[i*3+2] = lut[idx*3+2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size: 7, transparent: true, opacity: 0.45,
      map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    pts.userData.lut     = lut;
    pts.userData.lutLen  = LUT_SEGMENTS;
    pts.userData.offsets = offsets;
    pts.userData.speed   = 0.10 + Math.random() * 0.06;
    this.scene.add(pts);
    this.leyParticles.push(pts);
  }

  // ─── 程序纹理 ─────────────────────────────────────────────────────────────────

  private makeGlowTex(size: number): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const mid = size / 2;
    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.3,  'rgba(255,255,255,0.7)');
    g.addColorStop(0.65, 'rgba(255,255,255,0.12)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  private makeMagicCircleTex(size: number): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const mid = size / 2;
    const drawRing = (r: number, alpha: number, w: number) => {
      ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(mid, mid, r, 0, Math.PI * 2); ctx.stroke();
    };
    drawRing(mid * 0.90, 0.80, 2.2);
    drawRing(mid * 0.70, 0.55, 1.5);
    drawRing(mid * 0.48, 0.35, 1.0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(255,215,0,0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * mid * 0.50, mid + Math.sin(a) * mid * 0.50);
      ctx.lineTo(mid + Math.cos(a) * mid * 0.88, mid + Math.sin(a) * mid * 0.88);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid * 0.35);
    g.addColorStop(0, 'rgba(255,215,0,0.22)');
    g.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  // ─── 交互 ────────────────────────────────────────────────────────────────────

  private onMouseDown = (e: MouseEvent) => {
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.cameraController.flying || this.mouseMoveThrottled) return;
    this.mouseMoveThrottled = true;
    requestAnimationFrame(() => { this.mouseMoveThrottled = false; });

    const rect = this.container.getBoundingClientRect();
    this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraController.camera);

    if (this.raycastDirty) {
      this.raycastMeshes = [];
      this.buildings.forEach(b => b.traverse(c => { if (c instanceof THREE.Mesh) this.raycastMeshes.push(c); }));
      this.raycastDirty = false;
    }

    const hit  = this.raycaster.intersectObjects(this.raycastMeshes, false)[0];
    const hitG = hit ? this.findBuildingGroup(hit.object) : null;

    if (hitG !== this.hoveredBuilding) {
      if (this.hoveredBuilding) this.setHoverState(this.hoveredBuilding, false);
      this.hoveredBuilding = hitG;
      if (hitG) this.setHoverState(hitG, true);
      this.container.style.cursor = hitG ? 'pointer' : 'default';
      this.onBuildingHover?.(hitG?.userData.def ?? null);
    }
  };

  private onClick = (e: MouseEvent) => {
    if (this.cameraController.flying || this.isFocused) return;
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;
    if (!this.hoveredBuilding || !this.onBuildingClick) return;

    const def   = this.hoveredBuilding.userData.def as SectNodeDef;
    const bldGp = this.hoveredBuilding;

    // ─ 第四层：镜头飞行 ─
    this.cameraController.flyToBuilding(bldGp.position, () => {
      // 飞行结束后重新投影屏幕坐标
      const { sx, sy } = this.projectToScreen(bldGp.position);
      this.isFocused = true;
      this.focusedBuilding = bldGp; // 标记特写建筑，animate 每帧更新菜单
      this.onBuildingClick!(def, sx, sy);
    });
  };

  private projectToScreen(worldPos: THREE.Vector3): { sx: number; sy: number } {
    const p = worldPos.clone().project(this.cameraController.camera);
    const r = this.container.getBoundingClientRect();
    return {
      sx: (p.x * 0.5 + 0.5) * r.width,
      sy: (-(p.y * 0.5) + 0.5) * r.height,
    };
  }

  private findBuildingGroup(obj: THREE.Object3D): THREE.Group | null {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (this.buildings.includes(cur as THREE.Group)) return cur as THREE.Group;
      cur = cur.parent;
    }
    return null;
  }

  private setHoverState(group: THREE.Group, on: boolean) {
    gsap.to(group.scale, { x: on ? 1.10 : 1, y: on ? 1.10 : 1, z: on ? 1.10 : 1, duration: 0.28, ease: 'back.out(1.5)' });
    group.traverse(child => {
      if (child instanceof THREE.PointLight) {
        gsap.to(child, { intensity: on ? 4.0 : 1.8, duration: 0.28 });
      }
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat?.emissive) gsap.to(mat, { emissiveIntensity: on ? 0.75 : 0.25, duration: 0.28 });
      }
    });
    const labelObj = group.children.find(c => c instanceof CSS2DObject) as CSS2DObject | undefined;
    if (labelObj) {
      const el = labelObj.userData.labelEl as HTMLElement;
      if (el) {
        el.style.borderColor  = on ? 'rgba(255,215,0,0.95)' : 'rgba(212,168,67,0.65)';
        el.style.boxShadow    = on ? '0 0 18px rgba(255,215,0,0.4)' : 'none';
        el.style.transform    = on ? 'scale(1.06)' : 'scale(1)';
      }
    }
  }

  // ─── 返回概览（外部调用） ─────────────────────────────────────────────────────

  public flyToOverview(onComplete?: () => void) {
    if (this.isFocused) {
      this.isFocused = false;
      this.focusedBuilding = null; // 停止每帧更新菜单坐标
      this.cameraController.flyToOverview(onComplete);
    }
  }

  // ─── 动画循环 ─────────────────────────────────────────────────────────────────

  private _frameCount = 0;
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const t     = this.clock.getElapsedTime();
    const delta = this.clock.getDelta ? 0.016 : 0.016;
    const frame = ++this._frameCount;
    // 半频更新标志：粒子上浮/星空/云海等视觉上 30Hz 足够，腾出 GPU 上传带宽
    const halfA = (frame & 1) === 0;
    const halfB = (frame & 1) === 1;

    this.cameraController.update();

    // 更新所有灵脉 shader 时间（共享 uniform，只写一次）
    this.timeUniform.value = t;

    // 灵脉粒子沿曲线游走（用预采样 LUT，O(1) 索引代替 curve.getPoint）
    this.leyParticles.forEach(pts => {
      const lut     = pts.userData.lut as Float32Array;
      const lutLen  = pts.userData.lutLen as number;
      const offsets = pts.userData.offsets as Float32Array;
      const spd     = pts.userData.speed as number;
      const pos     = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr     = pos.array as Float32Array;
      for (let i = 0; i < offsets.length; i++) {
        const o = (offsets[i] + spd * 0.016) % 1;
        offsets[i] = o;
        const idx = (o * lutLen) | 0;
        arr[i*3] = lut[idx*3]; arr[i*3+1] = lut[idx*3+1]; arr[i*3+2] = lut[idx*3+2];
      }
      pos.needsUpdate = true;
    });

    // 建筑轻微浮动
    this.buildings.forEach(group => {
      const { baseY, phase } = group.userData;
      group.position.y = group === this.focusedBuilding
        ? baseY
        : baseY + Math.sin(t * 1.3 + phase) * 8;
    });

    // 法阵旋转（缓存引用，不再 traverse）
    for (let i = 0; i < this.buildingCircles.length; i++) {
      this.buildingCircles[i].rotation.z -= 0.004;
    }

    // 建筑粒子上浮（30Hz 即可，奇/偶帧交替更新一半的建筑，分担 GPU 上传带宽）
    if (halfA) {
      for (let i = 0; i < this.buildingPointsList.length; i++) {
        const { pts, basePos, speed } = this.buildingPointsList[i];
        const arr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        for (let j = 0; j < arr.length / 3; j++) {
          arr[j*3+1] += speed * 2; // 半频补偿
          if (arr[j*3+1] - basePos[j*3+1] > 220) arr[j*3+1] = basePos[j*3+1];
        }
        (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 瀑布粒子下落
    if (this.waterfallPts) {
      const wData = this.waterfallPts.userData;
      const wPos  = (this.waterfallPts.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const wBase = wData.base as Float32Array;
      const wSpd  = wData.speed as Float32Array;
      for (let i = 0; i < wSpd.length; i++) {
        wPos[i*3+1] -= wSpd[i];
        if (wPos[i*3+1] < wData.bottomY) {
          wPos[i*3]   = wBase[i*3]   + (Math.random() - 0.5) * 20;
          wPos[i*3+1] = wData.topY;
          wPos[i*3+2] = wBase[i*3+2] + (Math.random() - 0.5) * 8;
        }
      }
      (this.waterfallPts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    // 双层云海 UV 漂移（按各自速度，反方向）
    this.cloudLayers.forEach((cloud) => {
      const mat = cloud.material as THREE.MeshBasicMaterial;
      const spd = (cloud.userData.speed as number) ?? 0.002;
      if (mat.map) {
        mat.map.offset.x += spd * 0.016;
        mat.map.offset.y += spd * 0.016 * 0.5;
      }
    });

    // 建筑脚下云环旋转
    this.cloudRings.forEach((ring) => {
      ring.rotation.z += (ring.userData.spin as number) * 0.016;
    });

    // 云环主题粒子上浮 + 回收（与建筑粒子错开帧位，进一步分摊 GPU 上传）
    if (halfB) {
      this.ringParticles.forEach((pts) => {
        const arr  = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        const base = pts.userData.basePos as Float32Array;
        const spd  = pts.userData.speed as number;
        const range = pts.userData.range as number;
        for (let i = 0; i < arr.length / 3; i++) {
          arr[i*3+1] += spd * 2;
          if (arr[i*3+1] - base[i*3+1] > range) arr[i*3+1] = base[i*3+1];
        }
        (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      });
    }

    // 山谷流云：billboard 朝向相机 + 缓慢绕岛漂移 + 上下浮动
    const cam = this.cameraController.camera;
    const focus = this.focusedBuilding;
    const camQuat = cam.quaternion;
    for (let i = 0; i < this.valleyClouds.length; i++) {
      const c = this.valleyClouds[i];
      const u = c.userData;
      u.ang += u.drift * 0.0006;
      c.position.x = Math.cos(u.ang) * u.rad;
      c.position.z = Math.sin(u.ang) * u.rad;
      c.position.y = u.baseY + Math.sin(t * 0.4 + u.phase) * 12;
      c.quaternion.copy(camQuat);
      if (focus) {
        const mat = c.material as THREE.MeshBasicMaterial;
        const near = c.position.distanceTo(focus.position) < 900;
        const targetOp = near ? 0 : u.baseOp;
        mat.opacity += (targetOp - mat.opacity) * 0.12;
      }
    }

    // 建筑名标签：近大远小 + 远处淡出（CSS2D 默认固定尺寸，这里手动按距离缩放内层盒子）
    const camPos = cam.position;
    this.labels.forEach((lb) => {
      lb.getWorldPosition(this._tmpV);
      const d = camPos.distanceTo(this._tmpV);
      const k = THREE.MathUtils.clamp(1300 / d, 0.55, 1.45);
      const op = d > 2400 ? THREE.MathUtils.clamp((3300 - d) / 900, 0, 1) : 1;
      const box = lb.userData.box as HTMLElement;
      if (box) {
        box.style.transform = `scale(${k.toFixed(3)})`;
        box.style.opacity = op.toFixed(2);
      }
    });

    // 装饰小浮岛：上下浮动
    this.decorBob.forEach((o) => {
      const u = o.userData;
      o.position.y = u.baseY + Math.sin(t * 0.5 + u.phase) * u.bob;
    });

    // 飞鸟：缓慢盘旋 + 上下起伏 + billboard
    this.birds.forEach((b) => {
      const u = b.userData;
      u.ang += u.speed;
      b.position.x = Math.cos(u.ang) * u.rad;
      b.position.z = Math.sin(u.ang) * u.rad;
      b.position.y = u.baseY + Math.sin(t * 0.6 + u.phase) * 30;
    });

    // 御剑仙人：横向掠过 + 起伏 + 出界循环
    this.flyers.forEach((f) => {
      const u = f.userData;
      f.position.x += u.vx;
      f.position.y = u.baseY + Math.sin(t * 0.8 + u.phase) * 16;
      if (u.vx > 0 && f.position.x > u.maxX) f.position.x = -u.maxX;
      else if (u.vx < 0 && f.position.x < -u.maxX) f.position.x = u.maxX;
    });

    // 建筑专属动态特效（飞剑/灵晶/丹药/心魔核心/灵蝶…）
    this.buildingFx.forEach((fn) => fn(t));

    // 全局灵尘缓慢上浮 + 回收（半频：30Hz 视觉无差）
    if (this.spiritDust && halfA) {
      const arr = (this.spiritDust.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const spd = this.spiritDust.userData.spd as Float32Array;
      const topY = this.spiritDust.userData.topY as number;
      for (let i = 0; i < spd.length; i++) {
        arr[i*3+1] += spd[i] * 2;
        if (arr[i*3+1] > topY) arr[i*3+1] = -100;
      }
      (this.spiritDust.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    // 灵气花瓣：缓慢飘落 + 回收（半频，错开 spiritDust 帧位）
    if (this.petals && halfB) {
      const arr  = (this.petals.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const base = this.petals.userData.base as Float32Array;
      const spd  = this.petals.userData.spd as Float32Array;
      const topY = this.petals.userData.topY as number;
      for (let i = 0; i < spd.length; i++) {
        arr[i*3+1] -= spd[i] * 2;
        arr[i*3]   += Math.sin(t * 0.5 + i) * 0.30;        // 左右飘摆
        if (arr[i*3+1] < -200) { arr[i*3+1] = topY; arr[i*3] = base[i*3]; }
      }
      (this.petals.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    // 星空闪烁
    if (this.starField) {
      (this.starField.material as THREE.PointsMaterial).opacity = 0.55 + Math.sin(t * 0.35) * 0.18;
    }

    // 特写状态下每帧同步环形菜单屏幕坐标（跟随建筑浮动 + 相机阻尼）
    if (this.focusedBuilding && this.onFocusedMove) {
      const { sx, sy } = this.projectToScreen(this.focusedBuilding.position);
      this.onFocusedMove(sx, sy);
    }

    // 使用后处理 composer 渲染（内含 WebGL + Bloom）
    this.composer.render();
    // CSS2D 标签单独渲染
    this.css2dRenderer.render(this.scene, this.cameraController.camera);
  };

  // ─── resize ──────────────────────────────────────────────────────────────────

  private onResize = () => {
    const w = this.container.offsetWidth || window.innerWidth;
    const h = this.container.offsetHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.css2dRenderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.cameraController.resize(w, h);
  };

  // ─── 销毁 ─────────────────────────────────────────────────────────────────────

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('click', this.onClick);
    this.renderer.dispose();
    this.composer.dispose();
    this.scene.clear();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.remove();
    if (this.css2dRenderer.domElement.parentNode) this.css2dRenderer.domElement.remove();
  }
}
