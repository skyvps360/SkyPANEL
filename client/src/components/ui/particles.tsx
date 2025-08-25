import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ParticlesProps {
  className?: string;
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
}

export function Particles({
  className,
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ['#ffffff'],
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef(0);

  // Initialize particles
  const initializeParticles = useMemo(() => {
    return () => {
      const particles: Particle[] = [];
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: (Math.random() - 0.5) * particleSpread,
          y: (Math.random() - 0.5) * particleSpread,
          z: (Math.random() - 0.5) * particleSpread,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          vz: (Math.random() - 0.5) * speed,
          size: particleBaseSize * (1 + (Math.random() - 0.5) * sizeRandomness),
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
          alpha: alphaParticles ? Math.random() * 0.8 + 0.2 : 1,
        });
      }
      
      particlesRef.current = particles;
    };
  }, [particleCount, particleSpread, speed, particleColors, particleBaseSize, sizeRandomness, alphaParticles]);

  // Animation loop with performance optimizations
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    
    // Performance optimization: Use fillRect for faster clearing
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, width, height);
    
    // Performance optimization: Batch drawing operations
    ctx.save();

    // Update rotation if not disabled
    if (!disableRotation) {
      rotationRef.current += speed * 0.5;
    }

    // Update and draw particles
    particlesRef.current.forEach((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;

      // Wrap around boundaries
      if (particle.x > particleSpread / 2) particle.x = -particleSpread / 2;
      if (particle.x < -particleSpread / 2) particle.x = particleSpread / 2;
      if (particle.y > particleSpread / 2) particle.y = -particleSpread / 2;
      if (particle.y < -particleSpread / 2) particle.y = particleSpread / 2;
      if (particle.z > particleSpread / 2) particle.z = -particleSpread / 2;
      if (particle.z < -particleSpread / 2) particle.z = particleSpread / 2;

      // Apply rotation
      let rotatedX = particle.x;
      let rotatedY = particle.y;
      let rotatedZ = particle.z;

      if (!disableRotation) {
        const cos = Math.cos(rotationRef.current);
        const sin = Math.sin(rotationRef.current);
        rotatedX = particle.x * cos - particle.z * sin;
        rotatedZ = particle.x * sin + particle.z * cos;
      }

      // Apply mouse interaction
      if (moveParticlesOnHover) {
        const mouseInfluence = 0.0001 * particleHoverFactor;
        const dx = mouseRef.current.x - width / 2;
        const dy = mouseRef.current.y - height / 2;
        rotatedX += dx * mouseInfluence;
        rotatedY += dy * mouseInfluence;
      }

      // Project 3D to 2D
      const perspective = cameraDistance / (cameraDistance + rotatedZ);
      const projectedX = rotatedX * perspective * 50 + width / 2;
      const projectedY = rotatedY * perspective * 50 + height / 2;
      const projectedSize = Math.max(0.5, (particle.size * perspective) / 100); // Better scaling for visibility

      // Draw particle with performance optimizations
      if (projectedSize > 0.5 && projectedX >= -projectedSize && projectedX <= width + projectedSize && 
          projectedY >= -projectedSize && projectedY <= height + projectedSize) {
        ctx.globalAlpha = particle.alpha * perspective;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(projectedX, projectedY, Math.max(0.5, projectedSize), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    ctx.restore();
    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle mouse movement
  const handleMouseMove = (event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // Handle canvas resize
  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  };

  useEffect(() => {
    initializeParticles();
    handleResize();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Performance optimization: Reduce particle count on mobile devices
    const isMobile = window.innerWidth < 768;
    if (isMobile && particlesRef.current.length > 100) {
      particlesRef.current = particlesRef.current.slice(0, 100);
    }

    // Start animation
    animate();

    // Add event listeners with passive option for better performance
    window.addEventListener('resize', handleResize, { passive: true });
    if (moveParticlesOnHover) {
      canvas.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (canvas && moveParticlesOnHover) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [initializeParticles, moveParticlesOnHover]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none',
        className
      )}
      style={{
        background: 'transparent',
      }}
    />
  );
}

export default Particles;