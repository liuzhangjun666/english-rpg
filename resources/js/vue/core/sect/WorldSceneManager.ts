import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
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
  { id: 'sectHall',      name: '宗门大殿', pos: [0,     0, 0],     color: 0xffd700, unlockRealm: 0, glbPath: '/models/sectHall.glb',      glbTargetSize: 360 },
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

// ─── GLB 模块级缓存：加载一次、解析一次，之后开图直接克隆（瞬间出现） ──────────────

let _sharedDraco: DRACOLoader | null = null;
function getSharedDraco(): DRACOLoader {
  if (!_sharedDraco) {
    _sharedDraco = new DRACOLoader();
    _sharedDraco.setDecoderPath('/draco/gltf/');
  }
  return _sharedDraco;
}

const _glbCache = new Map<string, Promise<THREE.Group>>();
/** 加载 GLB（带缓存）；返回的是缓存场景的克隆，可安全独立变换 */
function loadGLBCached(path: string): Promise<THREE.Group> {
  let p = _glbCache.get(path);
  if (!p) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(getSharedDraco());
    p = new Promise<THREE.Group>((resolve, reject) => {
      loader.load(path, (g) => resolve(g.scene), undefined, reject);
    });
    _glbCache.set(path, p);
  }
  return p.then((scene) => scene.clone(true));
}

/** 全部地图模型路径（用于预加载） */
const ALL_MAP_MODELS = [
  '/models/sectHall.glb', '/models/swordHall.glb', '/models/scriptureHall.glb',
  '/models/alchemyHall.glb', '/models/innerDemonHall.glb', '/models/beastGarden.glb',
  '/models/farm.glb', '/models/fuyan.glb', '/models/shucong.glb',
  '/models/liangting.glb', '/models/lingjing.glb',
];
const CRITICAL_MAP_MODELS = [
  '/models/sectHall.glb',
  '/models/swordHall.glb',
  '/models/scriptureHall.glb',
];

type PerfTier = 'low' | 'balanced' | 'high';
type PreloadMode = 'critical' | 'all';

type ScenePerfProfile = {
  tier: PerfTier;
  pixelRatioCap: number;
  enablePostProcessing: boolean;
  enableShadowsInitially: boolean;
  delayEnhancedEffectsMs: number;
};

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
  private decorBob: THREE.Object3D[] = [];     // 装饰小浮岛（上下浮动）
  private birds: THREE.Sprite[] = [];          // 飞鸟群
  private petals: THREE.Points | null = null;  // 飘落灵气花瓣
  private dracoLoader: DRACOLoader | null = null; // Draco 解码器，dispose 时释放 worker
  private perfProfile: ScenePerfProfile;
  private bloomPass: UnrealBloomPass | null = null;
  private delayedEffectsTimer: number | null = null;
  private starField: THREE.Points | null = null;
  private terrainMesh: THREE.Mesh | null = null;

  // 交互
  private hoveredBuilding: THREE.Group | null = null;
  private mouseDownPos = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isFocused = false; // 是否已飞入某建筑特写
  private focusedBuilding: THREE.Group | null = null; // 当前特写的建筑（用于每帧更新菜单坐标）

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

  /** 预加载地图模型到缓存。critical 只加载首屏关键建筑，all 加载全部。 */
  public static preload(mode: PreloadMode = 'all') {
    const list = mode === 'critical' ? CRITICAL_MAP_MODELS : ALL_MAP_MODELS;
    list.forEach((p) => loadGLBCached(p).catch(() => {}));
  }

  constructor(container: HTMLElement, options: WorldSceneOptions = {}) {
    this.container = container;
    this.userRealmLevel = options.userRealmLevel ?? 0;
    this.buildingImages = options.buildingImages ?? {};
    this.perfProfile = this.resolvePerfProfile();

    const w = container.offsetWidth || window.innerWidth;
    const h = container.offsetHeight || window.innerHeight;

    // ── 场景 ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050c18);
    this.scene.fog = new THREE.FogExp2(0x061020, 0.000095);

    // ── WebGL 渲染器 ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.perfProfile.pixelRatioCap));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = this.perfProfile.enableShadowsInitially;
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
    this.scheduleEnhancedEffects();

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
    if (this.perfProfile.enablePostProcessing) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.45, 0.9);
      this.composer.addPass(this.bloomPass);
    }
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
    sun.castShadow = this.renderer.shadowMap.enabled;
    const shadowMapSize = this.perfProfile.tier === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
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
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(s * 1.8, s),
          new THREE.MeshBasicMaterial({
            map: pick(), transparent: true,
            opacity: oMin + Math.random() * (oMax - oMin),
            depthWrite: false, side: THREE.DoubleSide, fog: false,
          }),
        );
        mesh.position.set(x, y, z);
        mesh.userData = { drift: (Math.random() - 0.5) * 0.5, phase: Math.random() * Math.PI * 2, baseY: y, ang: a, rad: r };
        this.scene.add(mesh);
        this.valleyClouds.push(mesh);
      }
    };

    // 三层云带：近景翻涌缭绕 / 中景填满空隙 / 远景云塔与地平线
    addBand(18,  280, 1400,  -55,  -8,  700, 1500, 0.42, 0.72);   // 近景
    addBand(24, 1400, 2900,  -95,  20, 1100, 2300, 0.30, 0.55);   // 中景
    addBand(16, 2900, 4800, -130, 200, 2000, 3600, 0.20, 0.42);   // 远景云塔
  }

  // ─── 世界装饰：小浮岛 + 远峰 + 飞鸟 + 花瓣 ──────────────────────────────────────

  private buildWorldDecor() {
    this.buildDecorIslets();
    this.buildDistantPeaks();
    this.buildBirds();
    this.buildPetals();
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
    const COUNT = 6;
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
    const COUNT = 16;
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
      const slot = new THREE.Group();
      group.add(slot);
      this.addPlaceholder(slot, def);

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
        }).catch(() => { /* GLB 不存在时保留占位 */ });
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

      // ── 主题点光源 ──
      const ptLight = new THREE.PointLight(def.color, 1.8, 800, 1.6);
      ptLight.position.y = 140;
      group.add(ptLight);

      // ── 粒子（向上浮动的灵气光点） ──
      this.addBuildingParticles(group, def);

      // ── CSS2D 标签 ──
      const label = this.createLabel(def);
      label.position.y = 280;
      group.add(label);

      this.scene.add(group);
      this.buildings.push(group);
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
  }

  private createLabel(def: SectNodeDef): CSS2DObject {
    const isLocked = (def.unlockRealm ?? 0) > this.userRealmLevel;
    const imgSrc   = this.buildingImages[def.id];

    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      background: 'rgba(4,12,28,0.88)',
      border: `1px solid ${isLocked ? 'rgba(200,120,0,0.6)' : 'rgba(212,168,67,0.65)'}`,
      borderRadius: '10px', padding: '7px 13px',
      textAlign: 'center', userSelect: 'none',
      transition: 'all .22s', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
    });

    if (imgSrc) {
      const img = document.createElement('img');
      img.src = imgSrc;
      Object.assign(img.style, { width: '48px', height: '48px', objectFit: 'contain', display: 'block', margin: '0 auto 3px' });
      wrap.appendChild(img);
    }

    const nameEl = document.createElement('div');
    nameEl.textContent = def.name;
    Object.assign(nameEl.style, {
      fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px',
      color: isLocked ? '#cc8844' : '#ffdda1', marginBottom: '2px',
    });
    wrap.appendChild(nameEl);

    if (isLocked) {
      const lock = document.createElement('div');
      lock.textContent = '🔒 境界不足';
      Object.assign(lock.style, { fontSize: '11px', color: '#ffaa44' });
      wrap.appendChild(lock);
    }

    const obj = new CSS2DObject(wrap);
    obj.userData.labelEl = wrap;
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

    for (let i = 0; i < COUNT; i++) {
      offsets[i] = i / COUNT;
      const pt = curve.getPoint(offsets[i]);
      positions[i*3] = pt.x; positions[i*3+1] = pt.y; positions[i*3+2] = pt.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size: 7, transparent: true, opacity: 0.45,
      map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    pts.userData.curve   = curve;
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
    if (this.cameraController.flying) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraController.camera);
    const meshes: THREE.Object3D[] = [];
    this.buildings.forEach(b => b.traverse(c => { if (c instanceof THREE.Mesh) meshes.push(c); }));

    const hit  = this.raycaster.intersectObjects(meshes, false)[0];
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
    if (this.cameraController.flying) return;
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;
    if (!this.onBuildingClick) return;

    // 点击时再做一次命中测试，避免“没有先触发 hover 就点中无效”的情况
    const bldGp = this.pickBuildingAt(e.clientX, e.clientY) || this.hoveredBuilding;
    if (!bldGp) return;
    const def = bldGp.userData.def as SectNodeDef;

    // ─ 第四层：镜头飞行 ─
    this.cameraController.flyToBuilding(bldGp.position, () => {
      // 飞行结束后重新投影屏幕坐标
      const { sx, sy } = this.projectToScreen(bldGp.position);
      this.isFocused = true;
      this.focusedBuilding = bldGp; // 标记特写建筑，animate 每帧更新菜单
      this.onBuildingClick!(def, sx, sy);
    });
  };

  private pickBuildingAt(clientX: number, clientY: number): THREE.Group | null {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.cameraController.camera);
    const meshes: THREE.Object3D[] = [];
    this.buildings.forEach((b) => b.traverse((c) => { if (c instanceof THREE.Mesh) meshes.push(c); }));
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return hit ? this.findBuildingGroup(hit.object) : null;
  }

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

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const t     = this.clock.getElapsedTime();
    const delta = this.clock.getDelta ? 0.016 : 0.016;

    this.cameraController.update();

    // 更新所有灵脉 shader 时间（共享 uniform，只写一次）
    this.timeUniform.value = t;

    // 灵脉粒子沿曲线游走
    this.leyParticles.forEach(pts => {
      const curve   = pts.userData.curve as THREE.CatmullRomCurve3;
      const offsets = pts.userData.offsets as Float32Array;
      const spd     = pts.userData.speed as number;
      const pos     = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr     = pos.array as Float32Array;
      for (let i = 0; i < offsets.length; i++) {
        offsets[i] = (offsets[i] + spd * 0.016) % 1;
        const pt = curve.getPoint(offsets[i]);
        arr[i*3] = pt.x; arr[i*3+1] = pt.y; arr[i*3+2] = pt.z;
      }
      pos.needsUpdate = true;
    });

    // 建筑轻微浮动 + 法阵旋转 + 粒子上浮
    this.buildings.forEach(group => {
      const { baseY, phase } = group.userData;
      // 特写中的建筑保持静止，避免菜单跟随浮动而抖动
      group.position.y = group === this.focusedBuilding
        ? baseY
        : baseY + Math.sin(t * 1.3 + phase) * 8;

      group.traverse(child => {
        if (child instanceof THREE.Mesh && child.userData.isCircle) {
          child.rotation.z -= 0.004;
        }
        if (child instanceof THREE.Points && child.userData.basePos) {
          const arr  = (child.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
          const base = child.userData.basePos as Float32Array;
          const spd  = child.userData.speed as number;
          for (let i = 0; i < arr.length / 3; i++) {
            arr[i*3+1] += spd;
            if (arr[i*3+1] - base[i*3+1] > 220) arr[i*3+1] = base[i*3+1];
          }
          (child.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        }
      });
    });

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

    // 云环主题粒子上浮 + 回收
    this.ringParticles.forEach((pts) => {
      const arr  = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const base = pts.userData.basePos as Float32Array;
      const spd  = pts.userData.speed as number;
      const range = pts.userData.range as number;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i*3+1] += spd;
        if (arr[i*3+1] - base[i*3+1] > range) arr[i*3+1] = base[i*3+1];
      }
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    });

    // 山谷流云：billboard 朝向相机 + 缓慢绕岛漂移 + 上下浮动
    const cam = this.cameraController.camera;
    this.valleyClouds.forEach((c) => {
      const u = c.userData;
      u.ang += u.drift * 0.0006;
      c.position.x = Math.cos(u.ang) * u.rad;
      c.position.z = Math.sin(u.ang) * u.rad;
      c.position.y = u.baseY + Math.sin(t * 0.4 + u.phase) * 12;
      c.quaternion.copy(cam.quaternion);
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

    // 灵气花瓣：缓慢飘落 + 回收
    if (this.petals) {
      const arr  = (this.petals.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const base = this.petals.userData.base as Float32Array;
      const spd  = this.petals.userData.spd as Float32Array;
      const topY = this.petals.userData.topY as number;
      for (let i = 0; i < spd.length; i++) {
        arr[i*3+1] -= spd[i];
        arr[i*3]   += Math.sin(t * 0.5 + i) * 0.15;        // 左右飘摆
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

    // 使用后处理 composer 渲染（内含 Bloom）；低配档直接走 renderer 减少开销
    if (this.perfProfile.enablePostProcessing) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.cameraController.camera);
    }
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

  private resolvePerfProfile(): ScenePerfProfile {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = Number(nav.hardwareConcurrency || 4);
    const memory = Number(nav.deviceMemory || 4);
    const mobileUA = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 820;

    if (cores <= 4 || memory <= 4 || mobileUA || smallScreen) {
      return {
        tier: 'low',
        pixelRatioCap: 1.2,
        enablePostProcessing: false,
        enableShadowsInitially: false,
        delayEnhancedEffectsMs: 0,
      };
    }

    if (cores <= 8 || memory <= 8) {
      return {
        tier: 'balanced',
        pixelRatioCap: 1.5,
        enablePostProcessing: true,
        enableShadowsInitially: false,
        delayEnhancedEffectsMs: 2200,
      };
    }

    return {
      tier: 'high',
      pixelRatioCap: 2,
      enablePostProcessing: true,
      enableShadowsInitially: false,
      delayEnhancedEffectsMs: 1600,
    };
  }

  private scheduleEnhancedEffects() {
    if (!this.perfProfile.enablePostProcessing) return;
    if (this.perfProfile.delayEnhancedEffectsMs <= 0) return;
    this.delayedEffectsTimer = window.setTimeout(() => {
      this.renderer.shadowMap.enabled = true;
      this.delayedEffectsTimer = null;
    }, this.perfProfile.delayEnhancedEffectsMs);
  }

  // ─── 销毁 ─────────────────────────────────────────────────────────────────────

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    if (this.delayedEffectsTimer !== null) {
      clearTimeout(this.delayedEffectsTimer);
      this.delayedEffectsTimer = null;
    }
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('click', this.onClick);
    this.renderer.dispose();
    this.composer.dispose();
    this.dracoLoader?.dispose();
    this.scene.clear();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.remove();
    if (this.css2dRenderer.domElement.parentNode) this.css2dRenderer.domElement.remove();
  }
}
