import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function BrainCanvas({ activeAgent, activeTab }) {
  const mountRef = useRef(null);
  const [telemetry, setTelemetry] = useState({ x: '0.00', y: '0.00', z: '0.00', flux: '98.4%' });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth || 1280;
    const H = container.clientHeight || 800;

    // ── 1. Pitch Black Void Scene & Camera ─────────────────────────────
    const scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a); // True void black background (#02040a)

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    camera.position.set(0, 0.3, 5.2);
    camera.lookAt(0, 0, 0);

    // ── Renderer with Additive Alpha ───────────────────────────────────
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch(e) {
      renderer = new THREE.WebGLRenderer({ alpha: true });
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── OrbitControls ──────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.05;
    controls.enableZoom      = true;
    controls.zoomSpeed       = 1.2;
    controls.enablePan       = false;
    controls.minDistance     = 1.8;
    controls.maxDistance     = 14.0;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 0, 0);
    controls.update();

    controls.addEventListener('start', () => { controls.autoRotate = false; });
    controls.addEventListener('end',   () => { controls.autoRotate = true; });

    // ── Event Handlers ────────────────────────────────────────────────
    const handleZoomIn = () => {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      camera.position.addScaledVector(dir, 0.8);
      controls.update();
    };

    const handleZoomOut = () => {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      camera.position.addScaledVector(dir, -0.8);
      controls.update();
    };

    const handleResetView = () => {
      camera.position.set(0, 0.3, 5.2);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    let shockwaveTrigger = 0;
    const triggerShockwave = () => {
      shockwaveTrigger = Date.now();
    };

    window.addEventListener('brain-zoom-in', handleZoomIn);
    window.addEventListener('brain-zoom-out', handleZoomOut);
    window.addEventListener('brain-reset-view', handleResetView);
    window.addEventListener('click', triggerShockwave);

    // ── Main Ultron AI Group ──────────────────────────────────────────
    const ultronCore = new THREE.Group();
    scene.add(ultronCore);

    // ── Color Palette: Deep Blue/Indigo Mesh & High-Heat Amber/White Core
    const cVoidIndigo = new THREE.Color(0x0033aa); // Subtle deep indigo (#0055ff)
    const cDeepCyan   = new THREE.Color(0x0055ff); // Low-opacity deep cyan
    const cHighHeat   = new THREE.Color(0xfff2a8); // High-heat white/amber (#fff2a8)
    const cNeonCyan   = new THREE.Color(0x00f0ff); // Electric cyan (#00f0ff)
    const cGoldAmber  = new THREE.Color(0xfbbf24); // Golden amber

    // ═══════════════════════════════════════════════════════════════════
    // 3. FLOATING QUANTUM SINGULARITY CORE (Breathes along Z-axis)
    // ═══════════════════════════════════════════════════════════════════
    const singularityGroup = new THREE.Group();
    
    // ── Swirling Cluster of Yellow Core Electrons ───────────────────────
    const CORE_ELECTRON_COUNT = 64;
    const coreElectronGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const coreElectronMat = new THREE.MeshBasicMaterial({
      color: cGoldAmber, // Golden amber yellow (#fbbf24)
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    const coreElectronMesh = new THREE.InstancedMesh(coreElectronGeo, coreElectronMat, CORE_ELECTRON_COUNT);
    const coreDummy = new THREE.Object3D();
    const coreElectronData = [];

    for (let i = 0; i < CORE_ELECTRON_COUNT; i++) {
      const r = 0.08 + Math.random() * 0.32;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      coreDummy.position.set(x, y, z);
      const scale = 0.6 + Math.random() * 0.8;
      coreDummy.scale.set(scale, scale, scale);
      coreDummy.updateMatrix();
      coreElectronMesh.setMatrixAt(i, coreDummy.matrix);

      coreElectronData.push({ radius: r, theta, phi, speed: 0.01 + Math.random() * 0.03 });
    }
    coreElectronMesh.instanceMatrix.needsUpdate = true;
    singularityGroup.add(coreElectronMesh);

    ultronCore.add(singularityGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 1 & 3. GEODESIC NEURAL ELECTRON POSITIONS
    // ═══════════════════════════════════════════════════════════════════
    const baseNodes = [];

    const LAYERS = [
      { radius: 0.95, lat: 10, lon: 16, col: cHighHeat,   noise: 0.08 },
      { radius: 1.55, lat: 14, lon: 20, col: cNeonCyan,   noise: 0.12 },
      { radius: 2.05, lat: 12, lon: 18, col: cVoidIndigo, noise: 0.16 },
    ];

    LAYERS.forEach(({ radius, lat, lon, col, noise }) => {
      for (let i = 0; i <= lat; i++) {
        const phi = (i / lat) * Math.PI;
        for (let j = 0; j <= lon; j++) {
          const theta = (j / lon) * Math.PI * 2;

          const wave =
            Math.sin(phi * 4.0 + theta * 3.0) * noise +
            Math.cos(theta * 5.0 - phi * 3.0) * (noise * 0.5);

          const r = radius + wave;
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.cos(phi);
          const z = r * Math.sin(phi) * Math.sin(theta);

          const pt = new THREE.Vector3(x, y, z);
          baseNodes.push({ basePt: pt.clone(), currentPt: pt.clone(), col });
        }
      }
    });

    // ── Instanced Joint Electrons (Pure Floating Particle Constellation) ──
    const nodeCount = baseNodes.length;
    const sphereGeo = new THREE.SphereGeometry(0.026, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    const nodeMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, nodeCount);
    const dummy    = new THREE.Object3D();

    for (let i = 0; i < nodeCount; i++) {
      dummy.position.copy(baseNodes[i].basePt);
      const scale = 0.7 + Math.random() * 0.8;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      nodeMesh.setMatrixAt(i, dummy.matrix);
    }
    nodeMesh.instanceMatrix.needsUpdate = true;
    ultronCore.add(nodeMesh);

    // ═══════════════════════════════════════════════════════════════════
    // 2. FLOATING MICRO-DEBRIS FIELD (SWIRLING DUST MOTES)
    // ═══════════════════════════════════════════════════════════════════
    const DEBRIS_COUNT = 160;
    const debrisPos    = new Float32Array(DEBRIS_COUNT * 3);
    const debrisData   = [];

    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const r     = 1.2 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(1 - 2 * Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      debrisPos[i * 3]     = x;
      debrisPos[i * 3 + 1] = y;
      debrisPos[i * 3 + 2] = z;

      debrisData.push({
        radius: r,
        theta,
        phi,
        speed: 0.002 + Math.random() * 0.006,
        yDrift: 0.001 + Math.random() * 0.003,
      });
    }

    const debrisGeo = new THREE.BufferGeometry();
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));

    const debrisMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.025,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const debrisPoints = new THREE.Points(debrisGeo, debrisMat);
    scene.add(debrisPoints);

    // ═══════════════════════════════════════════════════════════════════
    // 2 & 3. BEADED ORBITAL TRACKS (PURE ELECTRON COMET PARTICLES)
    // ═══════════════════════════════════════════════════════════════════
    const orbitalGroup = new THREE.Group();

    const ringConfigs = [
      { radius: 2.25, tiltX: 0.40, tiltY: 0.78, color: cNeonCyan,  speed: 0.65, count: 28 },
      { radius: 2.50, tiltX: -0.78, tiltY: 0.40, color: cHighHeat,  speed: -0.50, count: 24 },
      { radius: 2.75, tiltX: 0.60, tiltY: -0.45, color: cVoidIndigo, speed: 0.55, count: 20 },
    ];

    const orbitalComets = [];

    ringConfigs.forEach(({ radius, tiltX, tiltY, color, speed, count }) => {
      const ringGroup = new THREE.Group();
      ringGroup.rotation.set(tiltX, tiltY, 0);

      // Comet Tail Particle Trail (No lines)
      const cometGeo = new THREE.SphereGeometry(0.016, 6, 6);
      const cometMesh = new THREE.InstancedMesh(
        cometGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }),
        count
      );

      ringGroup.add(cometMesh);
      orbitalGroup.add(ringGroup);

      orbitalComets.push({
        ringGroup,
        cometMesh,
        radius,
        speed,
        count,
        angle: Math.random() * Math.PI * 2,
      });
    });

    ultronCore.add(orbitalGroup);

    // ── Resize Observer ────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // ── Animation Loop ─────────────────────────────────────────────────
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      controls.update();

      // Telemetry update
      if (Math.floor(t * 10) % 3 === 0) {
        setTelemetry({
          x: camera.position.x.toFixed(2),
          y: camera.position.y.toFixed(2),
          z: camera.position.z.toFixed(2),
          flux: (97.5 + Math.sin(t * 3) * 1.8).toFixed(1) + '%',
        });
      }

      // ── Quantum Singularity Breathing & Yellow Electron Swirl ──────────
      const breatheScale = 1.0 + Math.sin(t * 2.2) * 0.12;
      singularityGroup.scale.set(breatheScale, breatheScale, breatheScale);
      singularityGroup.position.z = Math.sin(t * 1.5) * 0.10;
      singularityGroup.rotation.y = t * 0.35;

      for (let i = 0; i < CORE_ELECTRON_COUNT; i++) {
        const d = coreElectronData[i];
        d.theta += d.speed;
        d.phi += d.speed * 0.4;

        const cx = d.radius * Math.sin(d.phi) * Math.cos(d.theta);
        const cy = d.radius * Math.cos(d.phi);
        const cz = d.radius * Math.sin(d.phi) * Math.sin(d.theta);

        coreDummy.position.set(cx, cy, cz);
        const pulse = 0.75 + Math.sin(t * 5.0 + i) * 0.35;
        coreDummy.scale.set(pulse, pulse, pulse);
        coreDummy.updateMatrix();
        coreElectronMesh.setMatrixAt(i, coreDummy.matrix);
      }
      coreElectronMesh.instanceMatrix.needsUpdate = true;

      // ── Wave Pulse Shockwave Disruption ───────────────────────────────
      const elapsedSinceShock = (Date.now() - shockwaveTrigger) / 1000;
      const isShockwaveActive  = elapsedSinceShock < 2.5 && shockwaveTrigger > 0;
      const shockRadius        = elapsedSinceShock * 2.8;

      // Update Geodesic Node Positions
      for (let i = 0; i < nodeCount; i++) {
        const node = baseNodes[i];
        const pt   = node.basePt.clone();

        if (isShockwaveActive) {
          const dist = pt.length();
          const delta = Math.abs(dist - shockRadius);
          if (delta < 0.6) {
            const force = Math.sin((0.6 - delta) * Math.PI) * 0.25;
            pt.addScaledVector(pt.clone().normalize(), force);
          }
        }

        // Electron Pulse & Orbital Wobble at Joints
        const pulse = 0.85 + Math.sin(t * 4.0 + i * 0.35) * 0.35;
        dummy.position.copy(pt);
        dummy.scale.set(pulse, pulse, pulse);
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(i, dummy.matrix);
      }
      nodeMesh.instanceMatrix.needsUpdate = true;

      // ── Beaded Orbital Comet Tails (Keplerian Non-uniform Speeds) ──────
      orbitalComets.forEach(({ cometMesh, radius, speed, count, angle }, index) => {
        // Keplerian velocity: faster at perigee, slower at apogee
        const keplerSpeed = speed * (1.0 + 0.45 * Math.cos(orbitalComets[index].angle));
        orbitalComets[index].angle += keplerSpeed * 0.015;

        const currentAngle = orbitalComets[index].angle;

        for (let i = 0; i < count; i++) {
          // Tail fade behind leading head
          const tailAngle = currentAngle - (i * 0.045);
          const x = Math.cos(tailAngle) * radius;
          const z = Math.sin(tailAngle) * radius;

          dummy.position.set(x, 0, z);
          const tailScale = Math.exp(-i * 0.12) * 0.9;
          dummy.scale.setScalar(tailScale);
          dummy.updateMatrix();
          cometMesh.setMatrixAt(i, dummy.matrix);
        }
        cometMesh.instanceMatrix.needsUpdate = true;
      });

      // ── Micro-Debris Swirl Motion ────────────────────────────────────
      const pArr = debrisGeo.attributes.position.array;
      for (let i = 0; i < DEBRIS_COUNT; i++) {
        const d = debrisData[i];
        d.theta += d.speed;
        d.phi   += d.yDrift * 0.2;

        pArr[i * 3]     = d.radius * Math.sin(d.phi) * Math.cos(d.theta);
        pArr[i * 3 + 1] = d.radius * Math.cos(d.phi);
        pArr[i * 3 + 2] = d.radius * Math.sin(d.phi) * Math.sin(d.theta);
      }
      debrisGeo.attributes.position.needsUpdate = true;

      // Slowly rotate overall core
      ultronCore.rotation.y = t * 0.06;

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('brain-zoom-in', handleZoomIn);
      window.removeEventListener('brain-zoom-out', handleZoomOut);
      window.removeEventListener('brain-reset-view', handleResetView);
      window.removeEventListener('click', triggerShockwave);
      controls.dispose();
      ro.disconnect();
      sphereGeo.dispose(); sphereMat.dispose();
      coreElectronGeo.dispose(); coreElectronMat.dispose();
      debrisGeo.dispose(); debrisMat.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full brain-canvas select-none overflow-hidden">
      {/* 3D Canvas Mounting Node */}
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* Telemetry HUD Overlays & Technical Markers */}
      <div className="absolute inset-0 pointer-events-none z-10 p-4 sm:p-6 flex flex-col justify-between font-mono text-[10px] text-cyan-400/50">
        {/* Top Telemetry Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/20 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold tracking-widest text-cyan-300">CORE FLUX TELEMETRY</span>
          </div>

          <div className="flex flex-col items-end gap-1 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/20 shadow-lg tabular-nums">
            <div className="flex gap-3">
              <span>X: <strong className="text-cyan-200">{telemetry.x}</strong></span>
              <span>Y: <strong className="text-cyan-200">{telemetry.y}</strong></span>
              <span>Z: <strong className="text-cyan-200">{telemetry.z}</strong></span>
            </div>
            <div className="text-[9px] text-emerald-400 font-semibold">
              SINGULARITY FLUX: {telemetry.flux}
            </div>
          </div>
        </div>

        {/* Minimalist Targeting Crosshairs (Center Reticle Markers) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-cyan-500/10 rounded-full flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-cyan-400/30" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-cyan-400/30" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-cyan-400/30" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-cyan-400/30" />
        </div>

        {/* Bottom Perimeter Degree Markers */}
        <div className="flex justify-between items-center text-[9px] text-cyan-500/40 tracking-wider">
          <span>[ 000° ORBIT-ALPHA ]</span>
          <span className="hidden sm:inline">[ 090° VECTOR-FLUX ]</span>
          <span className="hidden sm:inline">[ 180° CORE-SINGULARITY ]</span>
          <span>[ 270° KEPLER-ZENITH ]</span>
        </div>
      </div>
    </div>
  );
}
