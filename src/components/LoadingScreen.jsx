import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Initializing neural engine...');
  const [isDone, setIsDone] = useState(false);
  const mountRef = useRef(null);

  // 1. Percentage counter progression (paced smoothly to showcase rotating 3D core)
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      const increment = current < 25 ? 1.15 : current < 55 ? 0.95 : current < 80 ? 0.75 : current < 96 ? 0.55 : 0.35;
      current = Math.min(100, current + increment);
      
      const rounded = Math.floor(current);
      setProgress(rounded);

      if (rounded < 25) {
        setStage('Initializing neural matrices...');
      } else if (rounded < 55) {
        setStage('Compiling WebGL 3D cybernetic core...');
      } else if (rounded < 85) {
        setStage('Calibrating 11-bot autonomous swarm...');
      } else if (rounded < 100) {
        setStage('Synchronizing PostgreSQL memory link...');
      } else {
        setStage('Ultron Core 2026 Active');
        clearInterval(interval);
        setTimeout(() => {
          setIsDone(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 700);
        }, 500);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  // 2. Full Homepage 3D Atom Brain behind ULTRON, smoothly rotating & fully responsive
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Responsive Camera Z calculation for mobile portrait, tablet & desktop aspect ratios
    function getResponsiveCameraZ(w, h) {
      const aspect = w / h;
      const radius = 215; // Bounding radius of outer orbits
      const vFOV = (52 * Math.PI) / 180;

      if (aspect < 1) {
        // Mobile / Portrait: calculate distance so orbit rings never clip horizontally
        return Math.max(560, (radius / (aspect * Math.tan(vFOV / 2))) * 1.14);
      } else {
        // Landscape / Desktop
        if (w < 640) return 580;
        if (w < 1024) return 500;
        return 440;
      }
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 2500);
    camera.position.z = getResponsiveCameraZ(width, height);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      renderer = new THREE.WebGLRenderer({ alpha: true });
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const atom = new THREE.Group();
    scene.add(atom);

    // Glow sprite texture generator (white core -> purple/cyan outer glow)
    function makeGlowTexture(innerColor, outerColor, size = 128) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      const r = size / 2;
      const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0.00, innerColor);
      grad.addColorStop(0.18, innerColor);
      grad.addColorStop(0.45, outerColor);
      grad.addColorStop(1.00, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }

    const nodeGlowTex = makeGlowTexture("rgba(255,255,255,1)", "rgba(200,160,255,0.7)");
    const bloomTex = makeGlowTexture("rgba(180,140,255,0.5)", "rgba(100,160,255,0)");

    // Fibonacci sphere nodes
    const PARTICLE_COUNT = 150;
    const particleData = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const yN = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const rAtY = Math.sqrt(Math.max(0, 1 - yN * yN));
      const theta = goldenAngle * i;
      const radius = 105 + Math.random() * 65;
      const x = Math.cos(theta) * rAtY * radius;
      const y = yN * radius;
      const z = Math.sin(theta) * rAtY * radius;
      const isBig = Math.random() < 0.28;
      particleData.push({ x, y, z, isBig });
    }

    // Glowing Node Orbs
    const nodeGroup = new THREE.Group();
    atom.add(nodeGroup);

    particleData.forEach((d) => {
      const size = d.isBig ? 15 + Math.random() * 14 : 6 + Math.random() * 6;

      const coreMat = new THREE.SpriteMaterial({
        map: nodeGlowTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: d.isBig ? 0.98 : 0.6,
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
        opacity: d.isBig ? 0.52 : 0.2,
      });
      const bloom = new THREE.Sprite(bloomMat);
      bloom.scale.setScalar(size * 2.8);
      bloom.position.set(d.x, d.y, d.z);
      nodeGroup.add(bloom);
    });

    // Network connection lines (synapses)
    const CONNECT_DIST = 58;
    const netPositions = [];
    const netColors = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p1 = particleData[i];
      let connected = 0;
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        if (connected >= 3) break;
        const p2 = particleData[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > CONNECT_DIST) continue;

        const t = dist / CONNECT_DIST;
        const r = 0;
        const g = 0.55 + (1 - t) * 0.45;
        const b = 0.75 + (1 - t) * 0.25;

        netPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        netColors.push(r, g, b, r, g, b);
        connected++;
      }
    }

    const netGeo = new THREE.BufferGeometry();
    netGeo.setAttribute("position", new THREE.Float32BufferAttribute(netPositions, 3));
    netGeo.setAttribute("color", new THREE.Float32BufferAttribute(netColors, 3));

    const netMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    atom.add(new THREE.LineSegments(netGeo, netMat));

    // Orbit Rings
    const orbitGroup = new THREE.Group();
    atom.add(orbitGroup);

    const orbitConfigs = [
      { rx: 210, ry: 95, rotX: 0.25, rotY: 0.4, rotZ: 0 },
      { rx: 215, ry: 100, rotX: Math.PI / 3, rotY: 0.65, rotZ: 0.3 },
      { rx: 205, ry: 90, rotX: -Math.PI / 3, rotY: -0.45, rotZ: -0.2 }
    ];

    orbitConfigs.forEach((cfg) => {
      const pts = [];
      for (let i = 0; i <= 200; i++) {
        const a = (i / 200) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * cfg.rx, Math.sin(a) * cfg.ry, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x88c4ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
      orbitGroup.add(line);
    });

    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Continuous 3D rotation of the atom
      atom.rotation.y += 0.009;
      atom.rotation.x = Math.sin(elapsed * 0.4) * 0.14;
      orbitGroup.rotation.z += 0.003;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.position.z = getResponsiveCameraZ(width, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      netGeo.dispose();
      netMat.dispose();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black select-none overflow-hidden h-[100dvh] min-h-screen w-full pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] px-[env(safe-area-inset-left,0px)] transition-all duration-700 ease-out ${
        isDone ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
      }`}
      aria-label="ULTRON Initializing"
    >
      {/* Exact Homepage 3D Model Canvas Mounted Fullscreen Behind ULTRON */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 pointer-events-none z-0 w-full h-full"
        aria-hidden="true" 
      />

      {/* Front Center HUD Overlay in Pure Contrast - Fully Responsive Width */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[92vw] sm:max-w-sm px-4 sm:px-6">
        
        {/* Responsive 3D Extruded ULTRON Typography */}
        <div className="flex flex-col items-center text-center w-full">
          <h1 
            className="text-4xl xs:text-5xl sm:text-6xl font-extrabold tracking-[0.24em] sm:tracking-[0.32em] text-white pl-[0.24em] sm:pl-[0.32em] select-none"
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.9), 0 0 35px rgba(255,255,255,0.25)'
            }}
          >
            ULTRON
          </h1>

          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono tracking-wider sm:tracking-widest text-slate-300 uppercase font-semibold">
              Living AI Brain • 2026 Core
            </span>
          </div>
        </div>

        {/* Responsive Diagnostic Loading Progress HUD */}
        <div className="w-full mt-8 sm:mt-10 flex flex-col gap-2.5 sm:gap-3">
          {/* Percentage & Status Header */}
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-300 font-mono text-[10px] sm:text-[11px] truncate max-w-[68%] sm:max-w-[220px]">
              {stage}
            </span>
            <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-tight tabular-nums">
              {progress}%
            </span>
          </div>

          {/* Hairline Progress Track */}
          <div className="w-full h-1 sm:h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-white transition-all duration-75 ease-out rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Bottom Micro Status Readout */}
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400 pt-0.5 sm:pt-1">
            <span>MEM: 16.4 GB OK</span>
            <span>SHADERS: ONLINE</span>
            <span>PGSQL: SYNC</span>
          </div>
        </div>

      </div>
    </div>
  );
}
