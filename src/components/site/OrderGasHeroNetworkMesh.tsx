import React, { useEffect, useRef } from "react";

interface NetworkNode3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  isRed: boolean;
  pulseOffset: number;
}

interface SignalPulse {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
}

export const OrderGasHeroNetworkMesh: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 620);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Smooth subtle mouse parallax
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - width / 2;
      const mouseY = e.clientY - rect.top - height / 2;

      targetParallaxX = (mouseX / (width / 2)) * 25;
      targetParallaxY = (mouseY / (height / 2)) * 15;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const handleResize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initScene();
    };

    // 1. Flowing 3D Wireframe Terrain Mesh
    const terrainCols = 32;
    const terrainRows = 18;
    const focalLength = 520;

    // 2. 3D Floating Network Nodes & Signals
    let nodes: NetworkNode3D[] = [];
    let signals: SignalPulse[] = [];
    const maxConnectionDistance = 150;

    const initScene = () => {
      nodes = [];
      signals = [];
      const totalNodes = Math.max(24, Math.min(Math.floor(width / 32), 42));

      for (let i = 0; i < totalNodes; i++) {
        const isRed = Math.random() < 0.28; // ~28% small red illuminated nodes
        nodes.push({
          x: (Math.random() - 0.5) * (width * 1.2),
          y: (Math.random() - 0.5) * (height * 0.95) - height * 0.08,
          z: (Math.random() - 0.5) * 400,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.12,
          vz: (Math.random() - 0.5) * 0.14,
          radius: isRed ? 2.2 : 1.5,
          isRed,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }

      // Initial pulses traveling along lines
      for (let s = 0; s < 5; s++) {
        const from = Math.floor(Math.random() * totalNodes);
        const to = (from + 1 + Math.floor(Math.random() * 4)) % totalNodes;
        signals.push({
          fromIndex: from,
          toIndex: to,
          progress: Math.random(),
          speed: Math.random() * 0.006 + 0.004,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    let time = 0;

    const render = () => {
      time += 0.006;

      ctx.clearRect(0, 0, width, height);

      // 1. DEEP CHARCOAL / DARK NAVY BASE GRADIENT WITH CINEMATIC LIGHTING
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "#06090e");
      bgGrad.addColorStop(0.35, "#090d16");
      bgGrad.addColorStop(0.7, "#080c14");
      bgGrad.addColorStop(1, "#05070c");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric navy ambient glow in center-top
      const ambientGlow = ctx.createRadialGradient(
        width * 0.5 + currentParallaxX * 0.3,
        height * 0.35 + currentParallaxY * 0.3,
        0,
        width * 0.5,
        height * 0.35,
        width * 0.6
      );
      ambientGlow.addColorStop(0, "rgba(30, 58, 138, 0.07)");
      ambientGlow.addColorStop(0.6, "rgba(15, 23, 42, 0.04)");
      ambientGlow.addColorStop(1, "rgba(6, 9, 14, 0)");
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      // Smooth parallax interpolation
      if (!prefersReducedMotion) {
        currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05;
        currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05;
      }

      // 2. LAYER 1: 3D FLOWING WIREFRAME TERRAIN SURFACE
      const rotX = 0.54 + currentParallaxY * 0.002;
      const rotY = currentParallaxX * 0.002;
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const gridSpacingX = (width * 1.55) / (terrainCols - 1);
      const gridSpacingY = (height * 1.45) / (terrainRows - 1);
      const startX = -width * 0.78;
      const startY = height * 0.06;

      interface ProjectedGridPoint {
        projX: number;
        projY: number;
        scale: number;
        depthFactor: number;
      }

      const gridPoints: ProjectedGridPoint[][] = [];

      for (let r = 0; r < terrainRows; r++) {
        const rowPoints: ProjectedGridPoint[] = [];
        for (let c = 0; c < terrainCols; c++) {
          const rawX = startX + c * gridSpacingX;
          const rawY = startY + r * gridSpacingY;

          // Smooth flowing harmonic wave displacement in 3D
          const waveZ = prefersReducedMotion
            ? 0
            : Math.sin(c * 0.28 + time * 0.9) * Math.cos(r * 0.34 + time * 0.7) * 44 +
            Math.sin((c + r) * 0.18 + time * 0.5) * 24;

          const x1 = rawX * cosY - waveZ * sinY;
          const z1 = waveZ * cosY + rawX * sinY;

          const y1 = rawY * cosX - z1 * sinX;
          const z2 = z1 * cosX + rawY * sinX;

          const depthFactor = Math.max(0, Math.min(1, (z2 + 380) / 760));
          const scale = focalLength / (focalLength + z2 + 280);

          const projX = width / 2 + x1 * scale + currentParallaxX * 0.25;
          const projY = height * 0.56 + y1 * scale + currentParallaxY * 0.25;

          rowPoints.push({ projX, projY, scale, depthFactor });
        }
        gridPoints.push(rowPoints);
      }

      // Draw horizontal wireframe terrain lines (thin, elegant, low-opacity)
      for (let r = 0; r < terrainRows; r++) {
        for (let c = 0; c < terrainCols - 1; c++) {
          const p1 = gridPoints[r][c];
          const p2 = gridPoints[r][c + 1];
          const avgDepth = (p1.depthFactor + p2.depthFactor) / 2;
          const alpha = Math.max(0.015, Math.min(0.14, avgDepth * 0.16));

          ctx.lineWidth = Math.max(0.4, 0.75 * ((p1.scale + p2.scale) / 2));
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.projX, p1.projY);
          ctx.lineTo(p2.projX, p2.projY);
          ctx.stroke();
        }
      }

      // Draw vertical wireframe terrain lines
      for (let c = 0; c < terrainCols; c++) {
        for (let r = 0; r < terrainRows - 1; r++) {
          const p1 = gridPoints[r][c];
          const p2 = gridPoints[r + 1][c];
          const avgDepth = (p1.depthFactor + p2.depthFactor) / 2;
          const alpha = Math.max(0.015, Math.min(0.14, avgDepth * 0.16));

          ctx.lineWidth = Math.max(0.4, 0.75 * ((p1.scale + p2.scale) / 2));
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.projX, p1.projY);
          ctx.lineTo(p2.projX, p2.projY);
          ctx.stroke();
        }
      }

      // 3. LAYER 2: 3D FLOATING ENERGY NETWORK & CONNECTING FILAMENTS
      interface ProjectedNode {
        x: number;
        y: number;
        z: number;
        projX: number;
        projY: number;
        scale: number;
        alpha: number;
        radius: number;
        isRed: boolean;
        pulse: number;
      }

      const projNodes: ProjectedNode[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (!prefersReducedMotion) {
          n.x += n.vx + Math.sin(time * 0.65 + n.pulseOffset) * 0.18;
          n.y += n.vy + Math.cos(time * 0.55 + n.pulseOffset) * 0.16;
          n.z += n.vz + Math.sin(time * 0.45 + n.pulseOffset) * 0.14;

          const boundX = width * 0.65;
          const boundY = height * 0.55;
          const boundZ = 220;

          if (n.x < -boundX || n.x > boundX) n.vx *= -1;
          if (n.y < -boundY || n.y > boundY) n.vy *= -1;
          if (n.z < -boundZ || n.z > boundZ) n.vz *= -1;
        }

        const depthFactor = (n.z + 220) / 440;
        const scale = focalLength / (focalLength + n.z + 260);

        const projX = width / 2 + n.x * scale + currentParallaxX * (0.5 + depthFactor * 0.4);
        const projY = height / 2 + n.y * scale + currentParallaxY * (0.5 + depthFactor * 0.4);

        const alpha = Math.max(0.12, Math.min(0.48, depthFactor * 0.52));
        const pulse = Math.sin(time * 1.5 + n.pulseOffset) * 0.3 + 0.7;

        projNodes.push({
          x: n.x,
          y: n.y,
          z: n.z,
          projX,
          projY,
          scale,
          alpha,
          radius: n.radius * scale,
          isRed: n.isRed,
          pulse,
        });
      }

      // Draw thin connecting filaments between close network nodes
      for (let i = 0; i < projNodes.length; i++) {
        const p1 = projNodes[i];

        for (let j = i + 1; j < projNodes.length; j++) {
          const p2 = projNodes[j];

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxConnectionDistance) {
            const lineAlpha =
              (1 - dist / maxConnectionDistance) * 0.18 * Math.min(p1.alpha, p2.alpha);

            ctx.lineWidth = Math.max(0.5, 0.85 * Math.min(p1.scale, p2.scale));

            // Subtle red or grey filament
            if (p1.isRed && p2.isRed) {
              ctx.strokeStyle = `rgba(239, 68, 68, ${lineAlpha * 0.8})`;
            } else {
              ctx.strokeStyle = `rgba(203, 213, 225, ${lineAlpha})`;
            }

            ctx.beginPath();
            ctx.moveTo(p1.projX, p1.projY);
            ctx.lineTo(p2.projX, p2.projY);
            ctx.stroke();
          }
        }
      }

      // Draw active subtle red light pulses traveling along lines
      if (!prefersReducedMotion) {
        for (let s = 0; s < signals.length; s++) {
          const sig = signals[s];
          sig.progress += sig.speed;

          if (sig.progress >= 1) {
            sig.progress = 0;
            sig.fromIndex = Math.floor(Math.random() * projNodes.length);
            sig.toIndex = (sig.fromIndex + 1 + Math.floor(Math.random() * 4)) % projNodes.length;
          }

          const n1 = projNodes[sig.fromIndex];
          const n2 = projNodes[sig.toIndex];

          if (n1 && n2) {
            const sx = n1.projX + (n2.projX - n1.projX) * sig.progress;
            const sy = n1.projY + (n2.projY - n1.projY) * sig.progress;
            const sAlpha = 0.45 * Math.min(n1.alpha, n2.alpha) * Math.sin(sig.progress * Math.PI);

            ctx.fillStyle = `rgba(239, 68, 68, ${sAlpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw small, refined connection points & illuminated red nodes
      for (let i = 0; i < projNodes.length; i++) {
        const p = projNodes[i];
        const r = Math.max(1.2, p.radius);

        if (p.isRed) {
          // Subtle, delicate red energy node
          const glowRadius = r * 2.5;
          const redGlow = ctx.createRadialGradient(
            p.projX,
            p.projY,
            0,
            p.projX,
            p.projY,
            glowRadius
          );
          redGlow.addColorStop(0, `rgba(239, 68, 68, ${0.75 * p.alpha * p.pulse})`);
          redGlow.addColorStop(0.5, `rgba(220, 38, 38, ${0.25 * p.alpha * p.pulse})`);
          redGlow.addColorStop(1, "rgba(220, 38, 38, 0)");

          ctx.fillStyle = redGlow;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          // Small red core
          ctx.fillStyle = `rgba(239, 68, 68, ${0.9 * p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, r, 0, Math.PI * 2);
          ctx.fill();

          // Tiny specular point
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, r * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Subtle white/grey connection point
          ctx.fillStyle = `rgba(226, 232, 240, ${0.65 * p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 bg-[#06090e]"
    >
      <canvas ref={canvasRef} className="w-full h-full block opacity-95" />
      {/* Top and Bottom soft dark fades for seamless blending */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#06090e] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#06090e] via-[#06090e]/80 to-transparent pointer-events-none" />
    </div>
  );
};
