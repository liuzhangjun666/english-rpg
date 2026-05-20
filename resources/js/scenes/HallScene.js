import * as THREE from 'three';
import bgHall from '../../assets/images/bg_hall.png';

export class HallScene {
    build(scene, camera, renderer) {
        this.sceneRef = scene;
        this.cameraRef = camera;
        this.rendererRef = renderer;

        const loader = new THREE.TextureLoader();
        const applyFallbackBg = () => {
            if (this.bgApplied) return;
            this.bgApplied = true;
            loader.load(bgHall, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                this.bgTexture = tex;
                this.sceneRef.background = tex;
                this.updateBackgroundTextureFit();
            });
        };

        this.videoEl = document.createElement('video');
        this.videoEl.src = '/effects/hall_gold_aura.mp4';
        this.videoEl.loop = true;
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
        this.videoEl.preload = 'auto';
        this.videoEl.setAttribute('webkit-playsinline', 'true');
        this.ensureVideoPlaying = () => {
            if (!this.videoEl || document.hidden) return;
            if (this.videoEl.paused || this.videoEl.ended) {
                const p = this.videoEl.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            }
        };
        this.onVisibilityChange = () => this.ensureVideoPlaying();
        this.onVideoPause = () => this.ensureVideoPlaying();
        this.onVideoEnded = () => {
            if (!this.videoEl) return;
            this.videoEl.currentTime = 0;
            this.ensureVideoPlaying();
        };
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        this.videoEl.addEventListener('pause', this.onVideoPause);
        this.videoEl.addEventListener('ended', this.onVideoEnded);

        this.videoEl.addEventListener(
            'loadeddata',
            () => {
                if (this.bgApplied) return;
                this.bgApplied = true;
                this.videoTexture = new THREE.VideoTexture(this.videoEl);
                this.videoTexture.colorSpace = THREE.SRGBColorSpace;
                this.videoTexture.minFilter = THREE.LinearFilter;
                this.videoTexture.magFilter = THREE.LinearFilter;
                this.videoTexture.generateMipmaps = false;
                this.sceneRef.background = this.videoTexture;
                this.updateBackgroundTextureFit();
                const playPromise = this.videoEl.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => applyFallbackBg());
                }
            },
            { once: true }
        );
        this.videoEl.addEventListener('error', () => applyFallbackBg(), { once: true });
        this.videoEl.load();

        const ambient = new THREE.AmbientLight(0x4466aa, 0.55);
        scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.3);
        dirLight.position.set(8, 15, 10);
        scene.add(dirLight);
        const centerGlow = new THREE.PointLight(0xc9a846, 0.9, 20);
        centerGlow.position.set(0, 3, 0);
        scene.add(centerGlow);

        const lowPower =
            (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
            (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

        const starCount = lowPower ? 600 : 1200;
        const starGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(starCount * 3);
        const col = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 30 + Math.random() * 50;
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = Math.abs(r * Math.cos(phi));
            pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
            const gold = Math.random() > 0.7;
            col[i * 3] = gold ? 0.85 : 0.3 + Math.random() * 0.3;
            col[i * 3 + 1] = gold ? 0.65 : 0.3 + Math.random() * 0.2;
            col[i * 3 + 2] = gold ? 0.35 : 0.4 + Math.random() * 0.3;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const stars = new THREE.Points(
            starGeo,
            new THREE.PointsMaterial({
                size: lowPower ? 0.14 : 0.18,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true,
            })
        );
        scene.add(stars);
        this.stars = stars;

        for (let layer = 0; layer < 2; layer++) {
            const ringR = 5.8 + layer * 0.5;
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(ringR - 0.1, ringR + 0.15, 64),
                new THREE.MeshBasicMaterial({
                    color: 0xc9a846,
                    transparent: true,
                    opacity: 0.12 + layer * 0.04,
                    side: THREE.DoubleSide,
                })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.06 + layer * 0.02;
            ring.userData.spinSpeed = 0.001 + layer * 0.001;
            scene.add(ring);
        }

        const pillarPositions = [
            [-4, 0, -3.5],
            [4, 0, -3.5],
            [-4, 0, 3.5],
            [4, 0, 3.5],
        ];
        const colors = [0xc9a846, 0x4ecdc4, 0xff6b6b, 0x6c5ce7];
        this.pillarGems = [];
        pillarPositions.forEach(([x, _, z], i) => {
            const gem = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.25, 0),
                new THREE.MeshPhongMaterial({
                    color: colors[i],
                    emissive: colors[i],
                    emissiveIntensity: 0.6,
                    transparent: true,
                    opacity: 0.9,
                })
            );
            gem.position.set(x, 3.8, z);
            gem.userData = { floatSpeed: 0.8 + i * 0.2, floatOffset: i * 1.5 };
            scene.add(gem);
            this.pillarGems.push(gem);
        });

        this.orbs = [];
        const orbColors = [0xc9a846, 0x4ecdc4, 0xff6b6b, 0xffd93d, 0x6c5ce7, 0x00cec9];
        for (let i = 0; i < 6; i++) {
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 16, 16),
                new THREE.MeshPhongMaterial({
                    color: orbColors[i],
                    emissive: orbColors[i],
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.85,
                })
            );
            const angle = (i / 6) * Math.PI * 2;
            const radius = 3.2 + Math.random() * 0.8;
            orb.position.set(Math.cos(angle) * radius, 1.5 + Math.random(), Math.sin(angle) * radius);
            orb.userData = {
                angle,
                radius,
                baseY: orb.position.y,
                speed: 0.25 + Math.random() * 0.15,
                floatSpeed: 1.2 + Math.random() * 0.5,
                floatOffset: Math.random() * 100,
            };
            scene.add(orb);
            this.orbs.push(orb);

            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.55, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: orbColors[i],
                    transparent: true,
                    opacity: 0.1,
                    blending: THREE.AdditiveBlending,
                })
            );
            glow.position.copy(orb.position);
            scene.add(glow);
        }
    }

    animate(time) {
        if (this.videoEl && (this.videoWatchAt === undefined || time - this.videoWatchAt > 2)) {
            this.videoWatchAt = time;
            this.ensureVideoPlaying();
        }
        if (this.stars) {
            this.stars.rotation.y += 0.0003;
            this.stars.rotation.x += 0.00012;
        }

        if (this.orbs) {
            this.orbs.forEach((orb) => {
                const d = orb.userData;
                const a = d.angle + time * d.speed;
                orb.position.x = Math.cos(a) * d.radius;
                orb.position.z = Math.sin(a) * d.radius;
                orb.position.y = d.baseY + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.4;
                const s = 1 + Math.sin(time * 2.5) * 0.12;
                orb.scale.set(s, s, s);
            });
        }

        if (this.pillarGems) {
            this.pillarGems.forEach((gem) => {
                const d = gem.userData;
                gem.position.y = 3.8 + Math.sin(time * d.floatSpeed + d.floatOffset) * 0.2;
            });
        }
    }

    updateBackgroundTextureFit() {
        if (!this.sceneRef || !this.cameraRef) return;
        const tex = this.sceneRef.background;
        if (!tex?.isTexture) return;
        const image = tex.image;
        if (!image) return;
        const iw = image.videoWidth || image.naturalWidth || image.width || 1;
        const ih = image.videoHeight || image.naturalHeight || image.height || 1;
        if (!iw || !ih) return;

        const canvasAspect = this.cameraRef.aspect || (window.innerWidth / window.innerHeight);
        const imageAspect = iw / ih;
        const aspect = imageAspect / canvasAspect;

        tex.offset.x = aspect > 1 ? (1 - 1 / aspect) / 2 : 0;
        tex.repeat.x = aspect > 1 ? 1 / aspect : 1;
        tex.offset.y = aspect > 1 ? 0 : (1 - aspect) / 2;
        tex.repeat.y = aspect > 1 ? 1 : aspect;
        tex.needsUpdate = true;
    }

    onResize() {
        this.updateBackgroundTextureFit();
    }

    destroy() {
        if (this.onVisibilityChange) {
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            this.onVisibilityChange = null;
        }
        if (this.videoEl && this.onVideoPause) {
            this.videoEl.removeEventListener('pause', this.onVideoPause);
            this.onVideoPause = null;
        }
        if (this.videoEl && this.onVideoEnded) {
            this.videoEl.removeEventListener('ended', this.onVideoEnded);
            this.onVideoEnded = null;
        }
        if (this.bgTexture) {
            this.bgTexture.dispose();
            this.bgTexture = null;
        }
        if (this.videoTexture) {
            this.videoTexture.dispose();
            this.videoTexture = null;
        }
        if (this.sceneRef) this.sceneRef.background = null;
        if (this.videoEl) {
            this.videoEl.pause();
            this.videoEl.removeAttribute('src');
            this.videoEl.load();
            this.videoEl = null;
        }
    }
}
