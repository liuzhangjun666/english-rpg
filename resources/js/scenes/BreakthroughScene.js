// 突破天象 3D 场景（过关完成/境界突破特效）
import * as THREE from 'three';
import sceneBg from '../../assets/images/scene_breakthrough.png';

export class BreakthroughScene {
    constructor() { this.group = new THREE.Group(); }

    build(scene, camera, spark) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(sceneBg);
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;

        // ⚡️ 九天雷劫：真正的全屏动态闪电特效 (抛弃细线，使用有体积的真实闪电柱)
        this.lightnings = [];
        for (let i = 0; i < 4; i++) { // 减少数量，提升质量
            const lightning = new THREE.Mesh(
                new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0)), 2, 0.15, 5, false),
                new THREE.MeshBasicMaterial({ 
                    color: 0xaaddff, // 刺眼的雷电蓝白光
                    transparent: true, 
                    opacity: 0, 
                    depthWrite: false,
                    blending: THREE.AdditiveBlending 
                })
            );
            lightning.userData = { nextStrike: Math.random() * 2, duration: 0 };
            this.group.add(lightning);
            this.lightnings.push(lightning);
        }

        // 💥 雷电全屏泛光：当闪电劈下时，整个天地为之煞白
        this.flashPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        this.flashPlane.position.z = -10; 
        this.group.add(this.flashPlane);

        // 祥云光环
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(2 + i*0.8, 0.03, 8, 48),
                new THREE.MeshBasicMaterial({ color: [0xf0d68a,0x4ec07a,0x4a90d9][i], transparent: true, opacity: 0.06 })
            );
            ring.position.set(0, 0, -2);
            ring.rotation.x = Math.PI / 3;
            ring.rotation.z = i * 0.5;
            ring.userData = { spin: true, speed: 0.1 + i*0.05 };
            this.group.add(ring);
        }

        // 修为上涨光柱
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.3, 5, 8),
            new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.1, depthWrite: false })
        );
        beam.position.set(0, 0.5, 0);
        beam.userData = { glow: true };
        this.group.add(beam);

        // 灵脉光点（地面）
        const dots = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 3, 32),
            new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false })
        );
        dots.position.set(0, -1.8, 0);
        dots.rotation.x = -Math.PI / 2;
        dots.userData = { expand: true };
        this.group.add(dots);
    }

    animate(time) {
        this.group.children.forEach(c => {
            if (c.userData?.spin) {
                c.rotation.z += c.userData.speed * 0.01;
            }
            if (c.userData?.glow) {
                c.material.opacity = 0.06 + Math.sin(time) * 0.05;
            }
            if (c.userData?.expand) {
                c.scale.setScalar(1 + Math.sin(time*0.3)*0.05);
                c.material.opacity = 0.02 + Math.sin(time*0.3)*0.025;
            }
        });

        // 动态真·闪电逻辑：有体积的闪电柱 + 全屏强光泛光
        if (this.lightnings) {
            let anyStrike = false;
            
            this.lightnings.forEach(L => {
                if (time > L.userData.nextStrike) {
                    const points = [];
                    let y = 15 + Math.random() * 5;
                    let x = (Math.random() - 0.5) * 40;
                    let z = (Math.random() - 0.5) * 20 - 5;
                    
                    points.push(new THREE.Vector3(x, y, z));
                    while (y > -2) {
                        y -= (Math.random() * 4 + 2); // 跨度极大，极具攻击性
                        x += (Math.random() - 0.5) * 8; // 扭曲度极大
                        z += (Math.random() - 0.5) * 6;
                        points.push(new THREE.Vector3(x, y, z));
                    }
                    
                    // 利用 CurvePath 拼接直线段，打造具有真实厚度、锐利折角的闪电柱！
                    const curvePath = new THREE.CurvePath();
                    for(let j = 0; j < points.length - 1; j++) {
                        curvePath.add(new THREE.LineCurve3(points[j], points[j+1]));
                    }
                    
                    L.geometry.dispose(); // 释放旧几何体
                    // 半径设为 0.15~0.3，非常粗大耀眼
                    L.geometry = new THREE.TubeGeometry(curvePath, points.length * 2, 0.15 + Math.random() * 0.15, 5, false);
                    
                    L.material.opacity = 0.9; // 极度高亮
                    
                    L.userData.nextStrike = time + Math.random() * 4 + 1.5; // 冷却 1.5~5.5秒
                    L.userData.duration = time + 0.15 + Math.random() * 0.1; // 存活极短时间
                    anyStrike = true;
                }
                
                // 存活期间剧烈频闪，结束后快速衰减
                if (time < L.userData.duration) {
                    L.material.opacity = Math.random() > 0.3 ? 1.0 : 0.0;
                } else {
                    L.material.opacity *= 0.7; // 快速隐没
                }
            });
            
            // 伴随闪电劈下，触发全屏强光泛光（天地同光）
            if (anyStrike && this.flashPlane) {
                this.flashPlane.material.opacity = 0.4 + Math.random() * 0.4;
            }
        }
        
        // 全屏泛光平滑衰减
        if (this.flashPlane && this.flashPlane.material.opacity > 0) {
            this.flashPlane.material.opacity -= 0.04;
        }
    }
}
