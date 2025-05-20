import React, { useEffect, useState } from 'react';
import { getBrandColors, BrandColorsOptions } from '../../lib/brand-theme';

interface VpsLoadingAnimationProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  onAnimationComplete?: () => void;
  fullPage?: boolean;
  animationDuration?: number; // In milliseconds
}

export function VpsLoadingAnimation({ 
  primaryColor = '33be00',
  secondaryColor,
  accentColor, 
  onAnimationComplete,
  fullPage = true,
  animationDuration = 3000 // Default 3 seconds
}: VpsLoadingAnimationProps) {
  const colorOptions: BrandColorsOptions = {
    primaryColor,
    secondaryColor,
    accentColor
  };
  const brandColors = getBrandColors(colorOptions);
  const [progress, setProgress] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  
  useEffect(() => {
    // Calculate interval and increment based on animation duration
    // We want to complete in the specified duration, with smaller steps for smoother animation
    const totalSteps = 25; // Adjust for smoother or choppier animation
    const increment = 100 / totalSteps;
    const interval = animationDuration / totalSteps;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          if (onAnimationComplete) {
            setTimeout(() => {
              onAnimationComplete();
            }, 500); // Give a small delay before completing
          }
          return 100;
        }
        return Math.min(100, prev + increment);
      });
    }, interval);
    
    // Handle animation frames
    const animationTimer = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 4);
    }, 250);
    
    return () => {
      clearInterval(timer);
      clearInterval(animationTimer);
    };
  }, [onAnimationComplete, animationDuration]);

  // VPS ASCII art frames
  const asciiFrames = [
    // Frame 1
    [
      "┌──────────────────────┐",
      "│  ┌─────────────────┐ │",
      "│  │ ■     VPS    ■  │ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ [::::::::::::::::│ │",
      "│  └─────────────────┘ │",
      "└──────────────────────┘"
    ],
    // Frame 2
    [
      "┌──────────────────────┐",
      "│  ┌─────────────────┐ │",
      "│  │ ■     VPS    ●  │ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ [:::::::::::::::>│ │",
      "│  └─────────────────┘ │",
      "└──────────────────────┘"
    ],
    // Frame 3
    [
      "┌──────────────────────┐",
      "│  ┌─────────────────┐ │",
      "│  │ ●     VPS    ■  │ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ [:::::::::::::>  │ │",
      "│  └─────────────────┘ │",
      "└──────────────────────┘"
    ],
    // Frame 4
    [
      "┌──────────────────────┐",
      "│  ┌─────────────────┐ │",
      "│  │ ■     VPS    ●  │ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ █████████████████│ │",
      "│  │ [::::::::::::>   │ │",
      "│  └─────────────────┘ │",
      "└──────────────────────┘"
    ]
  ];
  
  // Network connection ASCII art (cloud)
  const cloudAscii = [
    "    .-~~~-.    ",
    "  .-~       ~- ",
    " /             \\",
    "|   Cloud VPS   |",
    " \\             /",
    "  '-._____.-'   "
  ];
  
  // Data transfer animation
  const dataAnimate = (index: number) => {
    const offset = (animationFrame + index) % 4;
    if (offset === 0) return "→→→→";
    if (offset === 1) return " →→→";
    if (offset === 2) return "  →→";
    return "   →";
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 z-50 bg-white dark:bg-gray-900 ${
      fullPage ? 'fixed inset-0' : 'min-h-[300px]'
    }`}>
      <div className="relative mb-10">
        {/* ASCII art animation */}
        <div className="flex justify-center items-start gap-2 mb-6">
          {/* VPS Server */}
          <pre className="font-mono text-xs sm:text-sm leading-tight select-none" style={{ color: brandColors.primary.full }}>
            {asciiFrames[animationFrame].map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
          
          {/* Network connection */}
          {progress > 30 && (
            <div className="flex flex-col items-center mt-3">
              <pre className="font-mono text-xs select-none mb-1" style={{ color: brandColors.primary.full }}>
                {dataAnimate(0)}
              </pre>
              <pre className="font-mono text-xs select-none mb-1" style={{ color: brandColors.primary.full }}>
                {dataAnimate(1)}
              </pre>
              <pre className="font-mono text-xs select-none" style={{ color: brandColors.primary.full }}>
                {dataAnimate(2)}
              </pre>
            </div>
          )}
          
          {/* Cloud */}
          {progress > 40 && (
            <pre className="font-mono text-xs sm:text-sm leading-tight select-none" style={{ color: progress > 60 ? brandColors.primary.full : '#808080' }}>
              {cloudAscii.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </pre>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-64 sm:w-80 h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`,
            backgroundColor: brandColors.primary.full
          }}
        />
      </div>
      
      {/* Loading text */}
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {progress < 30 && "Initializing virtual server..."}
          {progress >= 30 && progress < 60 && "Establishing secure connection..."}
          {progress >= 60 && progress < 90 && "Loading virtualization resources..."}
          {progress >= 90 && "Finalizing deployment..."}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{progress}%</p>
      </div>
    </div>
  );
}

// Add keyframes for data flow animation
if (typeof document !== 'undefined') {
  const styleId = 'vps-loading-animation-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes dataflow {
        0% { transform: translateX(0); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translateX(-60px); opacity: 0; }
      }
      
      .animate-dataflow {
        animation: dataflow 2s infinite linear;
      }
    `;
    document.head.appendChild(style);
  }
}