'use client';

import { useEffect, useRef, useState } from 'react';

export function CityNightBackground() {
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
      // Draw gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#000810'); // Deep dark
      gradient.addColorStop(0.4, '#001a33');
      gradient.addColorStop(1, '#003865'); // User requested color at bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Stars
    const starCount = Math.floor((width * height) / 3000);
    const stars: Star[] = [];

    class Star {
      x: number;
      y: number;
      size: number;
      opacity: number;
      flickerSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * (height * 0.85); // Stars mostly in top 85%
        this.size = Math.random() * 1.0 + 0.3; // Smaller stars
        this.opacity = Math.random();
        this.flickerSpeed = 0.002 + Math.random() * 0.004; // Slower flicker
      }

      update() {
        this.opacity += this.flickerSpeed;
        if (this.opacity > 1 || this.opacity < 0.2) {
          this.flickerSpeed *= -1;
        }
      }

      draw() {
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    // Shooting Stars
    class ShootingStar {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      opacity: number;
      active: boolean;

      constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.length = 0;
        this.speed = 0;
        this.angle = 0;
        this.opacity = 0;
      }

      spawn() {
        // Start from top-left area
        this.x = Math.random() * (width * 0.7); // Mostly left side
        this.y = Math.random() * (height * 0.3); // Top part
        this.length = Math.random() * 80 + 20;
        this.speed = Math.random() * 5 + 8; // Slightly slower speed
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3; // Roughly 45 degrees (Top-Left to Bottom-Right)
        this.opacity = 1;
        this.active = true;
      }

      update() {
        if (!this.active) return;

        // Move towards bottom-right
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        this.opacity -= 0.015; // Fade out slightly slower

        if (this.opacity <= 0 || this.x > width || this.y > height) {
          this.active = false;
        }
      }

      draw() {
        if (!this.active) return;
        
        // Tail is behind (Left-Up)
        const endX = this.x - Math.cos(this.angle) * this.length;
        const endY = this.y - Math.sin(this.angle) * this.length;

        const gradient = ctx!.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx!.beginPath();
        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = 2;
        ctx!.lineCap = 'round';
        ctx!.moveTo(this.x, this.y);
        ctx!.lineTo(endX, endY);
        ctx!.stroke();
      }
    }

    // Init Stars
    for (let i = 0; i < starCount; i++) {
      stars.push(new Star());
    }

    // Init Shooting Stars
    const shootingStars: ShootingStar[] = [new ShootingStar(), new ShootingStar()];

    // Animation Loop
    let animationFrameId: number;

    const render = () => {
      // Draw Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#000810'); // Deep dark
      gradient.addColorStop(0.4, '#001a33');
      gradient.addColorStop(1, '#003865'); // User requested color at bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw Stars
      stars.forEach(star => {
        star.update();
        star.draw();
      });

      // Handle Shooting Stars
      if (Math.random() < 0.005) { // 0.5% chance per frame
        const inactive = shootingStars.find(s => !s.active);
        if (inactive) inactive.spawn();
      }

      shootingStars.forEach(s => {
        s.update();
        s.draw();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize handler
    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      
      // Re-init stars
      stars.length = 0;
      const newCount = Math.floor((width * height) / 3000);
      for (let i = 0; i < newCount; i++) {
        stars.push(new Star());
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
      
      {/* City Silhouette - Bottom Layer */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 w-full bg-[url('/city-silhouette.svg')] bg-repeat-x bg-bottom pointer-events-none sm:h-44 md:h-48 lg:h-48"
        style={{ zIndex: 1, backgroundSize: 'auto 100%' }}
      />
      
      {/* Optional fog/glow at bottom to blend city with content below if needed */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#003865] to-transparent opacity-50" style={{ zIndex: 2 }} />
    </div>
  );
}
