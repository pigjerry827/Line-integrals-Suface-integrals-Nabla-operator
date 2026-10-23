import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AnnotationLayer } from './annotations.js';
import { disposeObject, easeInOutCubic, makeRadialTexture } from './utils.js';

export class Engine {
  constructor(host, overlay, { onError } = {}) {
    this.host = host;
    this.overlay = overlay;
    this.onError = onError;
    this.width = 1;
    this.height = 1;
    this.time = 0;
    this.paused = false;
    this.autoRotate = false;
    this.activeScene = null;
    this.activeGroup = null;
    this.camTween = null;
    this.groupIntro = null;
    try {
      this._init();
    } catch (err) {
      console.error(err);
      this.ok = false;
      onError?.(err);
      return;
    }
    this.ok = true;
    this._loop();
  }

  _init() {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x040810, 1);
    this.host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040810, 0.017);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 140);
    camera.position.set(6, 5, 8);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 20;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.autoRotateSpeed = 0.32;
    controls.target.set(0, 0, 0);
    this.controls = controls;

    this.annotationLayer = new AnnotationLayer(this.overlay);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.62, 0.52, 0.66);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    this.composer = composer;
    this.bloom = bloom;

    this._buildWorld();
    this._addLights();

    this.clock = new THREE.Clock();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildWorld() {
    const bgGeo = new THREE.SphereGeometry(70, 32, 24);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        void main() {
          vec3 top = vec3(0.016, 0.045, 0.078);
          vec3 mid = vec3(0.010, 0.022, 0.040);
          vec3 bot = vec3(0.006, 0.011, 0.020);
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(bot, mid, smoothstep(0.0, 0.48, h));
          col = mix(col, top, smoothstep(0.46, 1.0, h));
          vec3 g1 = normalize(vec3(0.45, 0.16, -0.9));
          float glow = pow(max(0.0, dot(vDir, g1)), 7.0);
          col += glow * vec3(0.015, 0.075, 0.105);
          vec3 g2 = normalize(vec3(-0.8, 0.35, 0.4));
          col += pow(max(0.0, dot(vDir, g2)), 10.0) * vec3(0.035, 0.012, 0.07);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(bgGeo, bgMat));

    const starTex = makeRadialTexture(THREE);
    const starGeo = new THREE.BufferGeometry();
    const count = 1700;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color(0x9adfff);
    const c2 = new THREE.Color(0x8f9dff);
    const c3 = new THREE.Color(0xffd9a3);
    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 38;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.72 + 3;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const t = Math.random();
      const c = t > 0.92 ? c3 : t > 0.55 ? c2 : c1;
      const b = 0.35 + Math.random() * 0.65;
      col[i * 3] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.13,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    const floorGeo = new THREE.CircleGeometry(17, 96);
    const floorMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(p);
          float fade = smoothstep(1.0, 0.28, d);
          vec2 gv = vUv * 34.0;
          vec2 g = abs(fract(gv) - 0.5);
          float line = 1.0 - smoothstep(0.465, 0.5, max(g.x, g.y));
          float minor = 1.0 - smoothstep(0.47, 0.5, max(abs(fract(gv * 5.0) - 0.5).x, abs(fract(gv * 5.0) - 0.5).y));
          float ring = smoothstep(0.96, 1.0, sin(d * 22.0 + uTime * 0.15) * 0.5 + 0.5);
          float center = exp(-d * d * 7.0);
          vec3 col = mix(vec3(0.10, 0.55, 0.72), vec3(0.28, 0.22, 0.72), d);
          float alpha = line * 0.11 + minor * 0.025 + ring * 0.012 * fade + center * 0.05;
          alpha *= fade;
          gl_FragColor = vec4(col * (0.8 + center * 1.6), alpha);
        }`,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.35;
    this.floor = floor;
    this.scene.add(floor);

    const ringGeo = new THREE.RingGeometry(5.35, 5.38, 180);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2c7e9c,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.33;
    this.scene.add(ring);
  }

  _addLights() {
    const amb = new THREE.AmbientLight(0x7fa8c8, 1.2);
    this.scene.add(amb);
    const key = new THREE.DirectionalLight(0xbfe9ff, 2.2);
    key.position.set(5, 9, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x8a6cff, 1.4);
    rim.position.set(-7, 3, -5);
    this.scene.add(rim);
    const warm = new THREE.PointLight(0xffb454, 12, 18, 2);
    warm.position.set(0, 3, 2);
    this.scene.add(warm);
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.7));
    this.renderer.setSize(w, h, false);
    if (this.composer.setPixelRatio) this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.annotationLayer.resize(w, h);
    this.activeScene?.onResize?.(w, h);
  }

  setScene(sceneObj, { instant = false, duration = 1.35 } = {}) {
    if (this.activeGroup) {
      this.scene.remove(this.activeGroup);
      this.activeScene?.dispose?.();
      disposeObject(this.activeGroup);
    }
    this.activeScene = sceneObj;
    this.activeGroup = sceneObj.group;
    this.scene.add(sceneObj.group);
    sceneObj.group.scale.setScalar(0.985);
    this.groupIntro = 0;
    this.annotationLayer.clear();
    if (sceneObj.camera) this.setCamera(sceneObj.camera, instant, duration);
    sceneObj.onEnter?.();
  }

  setCamera(preset, instant = false, duration = 1.35) {
    const target = new THREE.Vector3().fromArray(preset.target || [0, 0, 0]);
    const pos = new THREE.Vector3().fromArray(preset.pos || [6, 5, 8]);
    const fov = preset.fov || 42;
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this.camTween = null;
      this.controls.enabled = true;
      return;
    }
    this.camTween = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      fromFov: this.camera.fov,
      toPos: pos,
      toTarget: target,
      toFov: fov,
      t: 0,
      duration,
    };
    this.controls.enabled = false;
  }

  resetCamera() {
    if (this.activeScene?.camera) this.setCamera(this.activeScene.camera, false, 0.9);
  }

  setPaused(v) {
    this.paused = v;
    if (v) this.controls.autoRotate = false;
    else this.controls.autoRotate = this.autoRotate;
  }

  setAutoRotate(v) {
    this.autoRotate = v;
    this.controls.autoRotate = v && !this.paused;
  }

  setLabelsVisible(v) {
    this.annotationLayer.setVisible(v);
  }

  getNDC(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  raycast(ndc, objects) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    return raycaster.intersectObjects(objects, true);
  }

  _loop() {
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (!this.paused) this.time += dt;

      if (this.camTween) {
        const tw = this.camTween;
        tw.t += dt;
        const k = easeInOutCubic(Math.min(1, tw.t / tw.duration));
        this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
        this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
        this.camera.fov = tw.fromFov + (tw.toFov - tw.fromFov) * k;
        this.camera.updateProjectionMatrix();
        if (k >= 1) {
          this.camTween = null;
          this.controls.enabled = true;
        }
      }

      if (this.groupIntro != null && this.activeGroup) {
        this.groupIntro += dt;
        const k = Math.min(1, this.groupIntro / 0.9);
        const s = 0.985 + 0.015 * easeInOutCubic(k);
        this.activeGroup.scale.setScalar(s);
        if (k >= 1) this.groupIntro = null;
      }

      this.controls.update();
      if (!this.paused) {
        this.activeScene?.update?.(dt, this.time);
        this.stars.rotation.y += dt * 0.0035;
        this.floor.material.uniforms.uTime.value = this.time;
      }
      const list = this.activeScene?.annotations?.() || [];
      this.annotationLayer.sync(list);
      this.annotationLayer.update(this.camera);
      this.composer.render();
    };
    this.frame = requestAnimationFrame(loop);
  }
}
