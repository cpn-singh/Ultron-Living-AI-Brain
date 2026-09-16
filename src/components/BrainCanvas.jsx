import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function BrainCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // ── 1. SCENE & CAMERA SETUP ─────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    camera.position.set(0, 0, 520);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) {
      renderer = new THREE.WebGLRenderer({ alpha: true });
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── ORBIT CONTROLS (Full 360° Drag Rotate & Scroll Zoom) ───────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.enablePan = false;
    controls.minDistance = 200;
    controls.maxDistance = 900;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    const atom = new THREE.Group();
    scene.add(atom);

    // ── 2. GLOW SPRITE TEXTURE (radial gradient: white → pink → transparent)
    function makeGlowTexture(innerColor, outerColor, size = 256) {
      const c   = document.createElement("canvas");
      c.width   = c.height = size;
      const ctx = c.getContext("2d");
      const r   = size / 2;
      const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0.00, innerColor);
      grad.addColorStop(0.15, innerColor);
      grad.addColorStop(0.40, outerColor);
      grad.addColorStop(1.00, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }

    const nodeGlowTex  = makeGlowTexture("rgba(255,255,255,1)", "rgba(200,160,255,0.6)");
    const bloomTex     = makeGlowTexture("rgba(200,160,255,0.4)", "rgba(160,120,255,0.0)");

    // ── 3. PARTICLE DATA (Fibonacci sphere) ────────────────────────────
    const PARTICLE_COUNT = 180;
    const particleData   = [];
    const goldenAngle    = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const yN        = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const rAtY      = Math.sqrt(Math.max(0, 1 - yN * yN));
      const theta     = goldenAngle * i;
      const radius    = 130 + Math.random() * 75;
      const x         = Math.cos(theta) * rAtY * radius;
      const y         = yN * radius;
      const z         = Math.sin(theta) * rAtY * radius;
      const isBig     = Math.random() < 0.30;
      particleData.push({ x, y, z, isBig });
    }

    // ── 4. NODE SPRITES (glowing orbs) ─────────────────────────────────
    const nodeGroup = new THREE.Group();
    atom.add(nodeGroup);

    particleData.forEach(d => {
      const size = d.isBig
        ? 18 + Math.random() * 18
        : 7  + Math.random() * 8;

      const coreMat = new THREE.SpriteMaterial({
        map: nodeGlowTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: d.isBig ? 0.97 : 0.55,
      });
      const core = new THREE.Sprite(coreMat);
      core.scale.setScalar(size);
      core.position.set(d.x, d.y, d.z);
      nodeGroup.add(core);

      const bloomMat = new THREE.SpriteMaterial({
        map: bloomTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: d.isBig ? 0.55 : 0.18,
      });
      const bloom = new THREE.Sprite(bloomMat);
      bloom.scale.setScalar(size * 2.8);
      bloom.position.set(d.x, d.y, d.z);
      nodeGroup.add(bloom);
    });

    // ── 5. NETWORK LINES (green / cyan connections) ────────────────────
    const CONNECT_DIST = 65;
    const netPositions  = [];
    const netColors     = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p1 = particleData[i];
      let connected = 0;

      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        if (connected >= 3) break;
        const p2  = particleData[j];
        const dx  = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist > CONNECT_DIST) continue;

        const t   = dist / CONNECT_DIST;
        const r   = 0;
        const g   = 0.55 + (1 - t) * 0.45;
        const b   = 0.70 + (1 - t) * 0.30;

        netPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        netColors.push(r, g, b, r, g, b);
        connected++;
      }
    }

    const netGeo = new THREE.BufferGeometry();
    netGeo.setAttribute("position", new THREE.Float32BufferAttribute(netPositions, 3));
    netGeo.setAttribute("color",    new THREE.Float32BufferAttribute(netColors,    3));

    const netMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.50,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    atom.add(new THREE.LineSegments(netGeo, netMat));

    const midPositions = [], midColors = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (Math.random() > 0.25) continue;
      const p1 = particleData[i];
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const p2  = particleData[j];
        const dx  = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < CONNECT_DIST || dist > CONNECT_DIST * 1.4) continue;
        midPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        midColors.push(0, 0.4, 0.55, 0, 0.4, 0.55);
      }
    }
    if (midPositions.length) {
      const midGeo = new THREE.BufferGeometry();
      midGeo.setAttribute("position", new THREE.Float32BufferAttribute(midPositions, 3));
      midGeo.setAttribute("color",    new THREE.Float32BufferAttribute(midColors,    3));
      const midMat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.10,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      atom.add(new THREE.LineSegments(midGeo, midMat));
    }

    // ── 6. ORBIT RINGS ─────────────────────────────────────────
    const orbitGroup = new THREE.Group();
    atom.add(orbitGroup);
    const orbitParticleData = [];

    function makeOrbitTex() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0,    "rgba(180,220,255,1)");
      g.addColorStop(0.25, "rgba(160,200,255,0.8)");
      g.addColorStop(1,    "rgba(100,160,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }
    const orbitDotTex = makeOrbitTex();

    function createOrbit({ radiusX, radiusY, rotX, rotY, rotZ, color, opacity }) {
      const pts = [];
      for (let i = 0; i <= 360; i++) {
        const a = (i / 360) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radiusX, Math.sin(a) * radiusY, 0));
      }
      const geo  = new THREE.BufferGeometry().setFromPoints(pts);
      const mat  = new THREE.LineBasicMaterial({
        color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.set(rotX, rotY, rotZ);
      orbitGroup.add(line);
      return { line, radiusX, radiusY };
    }

    const orbits = [
      createOrbit({ radiusX:265, radiusY:108, rotX: Math.PI*0.49, rotY: Math.PI*0.03, rotZ: Math.PI*0.02, color:0x4488cc, opacity:0.55 }),
      createOrbit({ radiusX:255, radiusY:112, rotX: Math.PI*0.34, rotY: Math.PI*0.16, rotZ: Math.PI*0.19, color:0x5577cc, opacity:0.45 }),
      createOrbit({ radiusX:260, radiusY:115, rotX:-Math.PI*0.33, rotY: Math.PI*0.34, rotZ:-Math.PI*0.11, color:0x6655cc, opacity:0.38 }),
      createOrbit({ radiusX:258, radiusY:108, rotX: Math.PI*0.63, rotY:-Math.PI*0.18, rotZ: Math.PI*0.27, color:0x4466bb, opacity:0.40 }),
    ];

    const orbitDotGroup = new THREE.Group();
    atom.add(orbitDotGroup);

    orbits.forEach(orbit => {
      const count = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const angle  = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed  = 0.0012 + Math.random() * 0.002;
        const isLit  = Math.random() < 0.4;
        const spr    = new THREE.Sprite(new THREE.SpriteMaterial({
          map: orbitDotTex,
          blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
          opacity: isLit ? 0.95 : 0.40,
        }));
        spr.scale.setScalar(isLit ? 10 : 5);
        orbitDotGroup.add(spr);
        orbitParticleData.push({ spr, orbit, angle, speed });
      }
    });

    function updateOrbitDots() {
      orbitParticleData.forEach(d => {
        d.angle += d.speed;
        const pos = new THREE.Vector3(
          Math.cos(d.angle) * d.orbit.radiusX,
          Math.sin(d.angle) * d.orbit.radiusY, 0
        );
        pos.applyEuler(d.orbit.line.rotation);
        d.spr.position.copy(pos);
      });
    }

    // ── 7. AMBIENT VOLUMETRIC GLOW ─────────────────────────────
    function makeVolumeTex() {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(256,256,0, 256,256,256);
      g.addColorStop(0,    "rgba(120,100,200,0.18)");
      g.addColorStop(0.35, "rgba(80,70,160,0.10)");
      g.addColorStop(0.70, "rgba(40,50,130,0.04)");
      g.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      return new THREE.CanvasTexture(c);
    }
    const volTex = makeVolumeTex();
    const volSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: volTex, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 1.0,
    }));
    volSpr.scale.setScalar(720);
    atom.add(volSpr);

    // Toolbar navigation event listeners
    const handleZoomIn = () => {
      camera.position.z = THREE.MathUtils.clamp(camera.position.z - 40, 200, 900);
      controls.update();
    };
    const handleZoomOut = () => {
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + 40, 200, 900);
      controls.update();
    };
    const handleResetView = () => {
      camera.position.set(0, 0, 520);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    window.addEventListener('brain-zoom-in', handleZoomIn);
    window.addEventListener('brain-zoom-out', handleZoomOut);
    window.addEventListener('brain-reset-view', handleResetView);

    // ── 8. ANIMATION LOOP ──────────────────────────────────────
    let animId;
    const clock = new THREE.Clock();

    function animate() {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      controls.update();
      updateOrbitDots();

      volSpr.scale.setScalar(720 + Math.sin(t * 0.7) * 30);

      renderer.render(scene, camera);
    }
    animate();

    // ── 9. RESIZE OBSERVER ─────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('brain-zoom-in', handleZoomIn);
      window.removeEventListener('brain-zoom-out', handleZoomOut);
      window.removeEventListener('brain-reset-view', handleResetView);
      controls.dispose();
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full brain-canvas select-none overflow-hidden bg-[radial-gradient(ellipse_at_40%_50%,_#1a2a3a_0%,_#0d1a24_45%,_#070f17_100%)] pointer-events-auto">
      {/* 3D Rotating Atom Canvas with OrbitControls (Drag to rotate, Scroll wheel to zoom, Zero text/labels) */}
      <div ref={mountRef} className="w-full h-full pointer-events-auto" style={{ touchAction: 'none' }} />
    </div>
  );
}
