'use client';

import { useEffect, useRef, useState } from 'react';

export function TechBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // If user prefers reduced motion, just draw static background
    if (prefersReducedMotion) {
      ctx.fillStyle = '#003865';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Theme Colors
    const colors = {
      bg: '#003865',
      node: 'rgba(100, 200, 255, 0.6)',
      line: 'rgba(100, 200, 255, 0.15)',
      highlight: '#0ea5e9', // Cyan/Sky blue
    };

    // Particles
    const particleCount = Math.floor((width * height) / 9000); // Density
    const particles: Particle[] = [];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      pulse: number;
      pulseSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.size = Math.random() * 2 + 1;
        this.pulse = 0;
        this.pulseSpeed = 0.05 + Math.random() * 0.05;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Pulse effect
        this.pulse += this.pulseSpeed;
      }

      draw() {
        ctx!.beginPath();
        const currentSize = this.size + Math.sin(this.pulse) * 0.5;
        ctx!.arc(this.x, this.y, Math.max(0, currentSize), 0, Math.PI * 2);
        ctx!.fillStyle = colors.node;
        ctx!.fill();
      }
    }

    // Init
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation Loop
    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time++;
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle "Cyber Grid" background moving
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const offset = (time * 0.5) % gridSize;
      
      // Vertical lines
      for (let x = offset; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal lines (perspective effect simulated by simple movement)
      for (let y = offset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and Draw Particles & Connections
      particles.forEach((p, index) => {
        p.update();
        p.draw();

        // Connect particles
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = colors.line;
            ctx.lineWidth = 1 - dist / 120;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      // Draw "Data Packets" travelling along random lines occasionally
      if (time % 5 === 0) {
        // Randomly flash a connection
        const p1 = particles[Math.floor(Math.random() * particles.length)];
        const p2 = particles[Math.floor(Math.random() * particles.length)];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 120) {
           ctx.beginPath();
           ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)'; // Bright cyan
           ctx.lineWidth = 2;
           ctx.moveTo(p1.x, p1.y);
           ctx.lineTo(p2.x, p2.y);
           ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize handler
    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      // Re-init particles on resize to maintain density
      particles.length = 0;
      const newCount = Math.floor((width * height) / 9000);
      for (let i = 0; i < newCount; i++) {
        particles.push(new Particle());
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ background: '#003865' }}
    />
  );
}
