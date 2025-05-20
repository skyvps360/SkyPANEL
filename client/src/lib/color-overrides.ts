/**
 * This file contains direct CSS overrides to force components to use our brand colors
 * instead of default Shadcn blue colors.
 */

import { getBrandColors, BrandColorsOptions } from './brand-theme';

export function applyBrandColorOverrides(options?: BrandColorsOptions): void {
  // Get brand colors from the settings or use from HSL variables (for when options not explicitly passed)
  const brandColors = options ? 
    getBrandColors(options) : 
    { 
      primary: { 
        full: getComputedStyle(document.documentElement).getPropertyValue('--primary-hex')?.trim() || '#2563eb'
      } 
    };
  
  // Get the primary color
  const primaryColor = brandColors.primary.full;
  
  // Override primary color hue in the CSS custom properties
  // This targets the root variables used by Shadcn components
  const root = document.documentElement;

  // Convert hex to HSL for Tailwind CSS custom properties
  const hslValues = hexToHSL(primaryColor);
  
  if (hslValues) {
    // Set the primary color variable which controls buttons, tabs, etc.
    root.style.setProperty('--primary', `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`);
    
    // Also set accent and ring which are used by some components
    root.style.setProperty('--accent', `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`);
    root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`);
    
    // Set sidebar primary color
    root.style.setProperty('--sidebar-primary', `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`);
    
    // Store hex value for components that need it directly
    root.style.setProperty('--primary-hex', primaryColor);
    
    // Add !important overrides for specific components that resist theming
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .tabs-trigger[data-state="active"] {
        background-color: ${primaryColor} !important;
        color: white !important;
      }
      [data-radix-tabs-trigger][data-state="active"] {
        background-color: ${primaryColor} !important;
        color: white !important;
      }
      button[type="submit"], 
      input[type="submit"] {
        background-color: ${primaryColor} !important;
        color: white !important;
      }
      a[href^="/auth"]:not(.brand-exempt) {
        color: ${primaryColor} !important;
      }
      .link-brand {
        color: ${primaryColor} !important;
      }
    `;
    document.head.appendChild(styleTag);
  }
}

/**
 * Convert HEX color to HSL components
 * @param hex Hex color code
 * @returns HSL values or null if conversion fails
 */
function hexToHSL(hex: string): { h: number, s: number, l: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16) / 255;
    g = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16) / 255;
    b = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16) / 255;
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else {
    return null; // Invalid format
  }
  
  // Calculate HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}