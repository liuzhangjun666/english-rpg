import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 斜俯视约 48°（建造类游戏视角），把岛屿空地压扁、建筑居中
const OVERVIEW_POS    = new THREE.Vector3(0, 1020, 880);
const OVERVIEW_TARGET = new THREE.Vector3(0, 80, -40);

export class WorldCameraController {
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  public flying = false;

  constructor(domElement: HTMLElement) {
    const aspect = (domElement.clientWidth || window.innerWidth) /
                   (domElement.clientHeight || window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(52, aspect, 1, 30000);
    this.camera.position.copy(OVERVIEW_POS);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // 锁定俯角与高度：禁用旋转和缩放，只保留平移（想看近景就点建筑飞入）
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.panSpeed = 1.0;

    // 左键 / 单指平移
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.PAN,
    };

    // 限制平移范围，避免拖出岛屿飘到云海里
    this.controls.target.copy(OVERVIEW_TARGET);
    this.controls.update();

    this.controls.addEventListener('start', () => {
      window.dispatchEvent(new CustomEvent('map-drag', { detail: true }));
    });
    this.controls.addEventListener('end', () => {
      window.dispatchEvent(new CustomEvent('map-drag', { detail: false }));
    });
  }

  public resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  public update() {
    if (this.flying || !this.controls.enabled) return;
    this.controls.update();

    // 平移边界限制：把 target 夹在岛屿范围内，相机同步位移保持俯角不变
    const t = this.controls.target;
    const cx = THREE.MathUtils.clamp(t.x, -850, 850);
    const cz = THREE.MathUtils.clamp(t.z, -850, 850);
    if (t.x !== cx || t.z !== cz) {
      this.camera.position.x += cx - t.x;
      this.camera.position.z += cz - t.z;
      t.set(cx, t.y, cz);
    }
  }

  public flyToBuilding(buildingWorldPos: THREE.Vector3, onComplete?: () => void) {
    if (this.flying) return;
    this.flying = true;
    this.controls.enabled = false;

    const dir = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .setY(0).normalize();
    const camDest = buildingWorldPos.clone()
      .addScaledVector(dir, 520)
      .add(new THREE.Vector3(0, 300, 0));

    const tgt = { x: buildingWorldPos.x, y: buildingWorldPos.y + 170, z: buildingWorldPos.z };

    gsap.timeline({
      onComplete: () => {
        this.controls.enablePan = false;
        this.controls.target.set(tgt.x, tgt.y, tgt.z);
        this.controls.enabled = true;
        this.controls.update();
        this.flying = false;
        onComplete?.();
      },
    })
      .to(this.camera.position, {
        x: camDest.x, y: camDest.y, z: camDest.z,
        duration: 1.7, ease: 'power3.inOut',
        onUpdate: () => { this.camera.lookAt(tgt.x, tgt.y, tgt.z); },
      })
      .to(this.controls.target, { ...tgt, duration: 1.7, ease: 'power3.inOut' }, '<');
  }

  public flyToOverview(onComplete?: () => void) {
    if (this.flying) return;
    this.flying = true;
    this.controls.enabled = false;

    gsap.timeline({
      onComplete: () => {
        // 回到 overview：恢复 pan，让 OrbitControls 内部 spherical 重新跟 camera 对齐
        this.controls.enablePan = true;
        this.controls.target.set(OVERVIEW_TARGET.x, OVERVIEW_TARGET.y, OVERVIEW_TARGET.z);
        this.controls.enabled = true;
        this.controls.update();
        this.flying = false;
        onComplete?.();
      },
    })
      .to(this.camera.position, {
        x: OVERVIEW_POS.x, y: OVERVIEW_POS.y, z: OVERVIEW_POS.z,
        duration: 1.5, ease: 'power2.inOut',
        onUpdate: () => {
          this.camera.lookAt(
            this.controls.target.x, this.controls.target.y, this.controls.target.z,
          );
        },
      })
      .to(this.controls.target, {
        x: OVERVIEW_TARGET.x, y: OVERVIEW_TARGET.y, z: OVERVIEW_TARGET.z,
        duration: 1.5, ease: 'power2.inOut',
      }, '<');
  }
}
