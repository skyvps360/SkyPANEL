/**
 * Brand Theme Utility
 *
 * This file provides consistent brand styling and theme functions
 * to be used across the application.
 */

/**
 * Brand Colors interface for theme system
 */
export interface BrandColorsOptions {
  primaryColor?: string; // Main brand color
  secondaryColor?: string; // Supporting color
  accentColor?: string; // Accent color for highlighting
}

/**
 * Default brand color values
 */
const DEFAULT_COLORS = {
  primaryColor: "2563eb", // Blue
  secondaryColor: "10b981", // Green
  accentColor: "f59e0b", // Orange/amber
};

/**
 * Color variation interface
 */
export interface ColorVariation {
  full: string; // Full color (#ff0000)
  light: string; // Light version for backgrounds (#ff00001a)
  medium: string; // Medium opacity for borders (#ff000040)
  lighter: string; // Extra light for hover states (#ff00000a)
  dark: string; // Darker version for text (#cc0000)
  extraLight: string; // Very subtle background (#ff000005)
  border: string; // Border color with appropriate opacity (#ff000020)
  hex: string; // Raw hex without # (ff0000)
}

/**
 * Brand color result interface
 */
export interface BrandColorsResult {
  primary: ColorVariation;
  secondary: ColorVariation;
  accent: ColorVariation;
  // Legacy properties
  full: string;
  light: string;
  medium: string;
  lighter: string;
  hex: string;
  // Gradient variations
  gradient: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    card: string;
  };
}

/**
 * Generate color variations for the brand colors
 *
 * @param options - Object containing primary, secondary, and accent colors
 * @returns Object with various color formats for consistent usage
 */
export function getBrandColors(
  options: BrandColorsOptions | string = {},
): BrandColorsResult {
  // For backward compatibility - if a string is passed, treat it as primary color
  if (typeof options === "string") {
    const primaryColor = options || DEFAULT_COLORS.primaryColor;
    const secondaryColor = DEFAULT_COLORS.secondaryColor;
    const accentColor = DEFAULT_COLORS.accentColor;

    // Update getColorVariations to include all required properties
    return {
      primary: getColorVariations(primaryColor),
      secondary: getColorVariations(secondaryColor),
      accent: getColorVariations(accentColor),

      // Legacy full property for backward compatibility
      full: `#${primaryColor}`,
      light: `#${primaryColor}1a`,
      medium: `#${primaryColor}40`,
      lighter: `#${primaryColor}0a`,
      hex: primaryColor,

      // Gradient variations
      gradient: {
        primary: `linear-gradient(to right, #${primaryColor}, #${primaryColor}dd)`,
        secondary: `linear-gradient(to right, #${secondaryColor}, #${secondaryColor}dd)`,
        accent: `linear-gradient(to right, #${accentColor}, #${accentColor}dd)`,
        dark: `linear-gradient(to right bottom, #${primaryColor}20, #111827)`,
        card: `linear-gradient(to bottom right, #${primaryColor}05, #${primaryColor}10)`,
      },
    };
  }

  // Use provided colors or fallback to defaults
  const primaryColor = options.primaryColor || DEFAULT_COLORS.primaryColor;
  const secondaryColor =
    options.secondaryColor || DEFAULT_COLORS.secondaryColor;
  const accentColor = options.accentColor || DEFAULT_COLORS.accentColor;

  // Update getColorVariations to include all required properties
  return {
    primary: getColorVariations(primaryColor),
    secondary: getColorVariations(secondaryColor),
    accent: getColorVariations(accentColor),

    // Legacy full property for backward compatibility
    full: `#${primaryColor}`,
    light: `#${primaryColor}1a`,
    medium: `#${primaryColor}40`,
    lighter: `#${primaryColor}0a`,
    hex: primaryColor,

    // Gradient variations
    gradient: {
      primary: `linear-gradient(to right, #${primaryColor}, #${primaryColor}dd)`,
      secondary: `linear-gradient(to right, #${secondaryColor}, #${secondaryColor}dd)`,
      accent: `linear-gradient(to right, #${accentColor}, #${accentColor}dd)`,
      dark: `linear-gradient(to right bottom, #${primaryColor}20, #111827)`,
      card: `linear-gradient(to bottom right, #${primaryColor}05, #${primaryColor}10)`,
    },
  };
}

/**
 * Generate color variations for a single color
 * @param colorHex - Hex color code without the # prefix
 */
function getColorVariations(colorHex: string) {
  // Function to darken a hex color
  const darkenHexColor = (hex: string, percent: number = 20): string => {
    // Parse the hex color
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Darken by reducing RGB values by the percentage
    const darkenAmount = percent / 100;
    const dr = Math.floor(r * (1 - darkenAmount))
      .toString(16)
      .padStart(2, "0");
    const dg = Math.floor(g * (1 - darkenAmount))
      .toString(16)
      .padStart(2, "0");
    const db = Math.floor(b * (1 - darkenAmount))
      .toString(16)
      .padStart(2, "0");

    return `${dr}${dg}${db}`;
  };

  // Create a darker version for text and contrast
  const darkColor = darkenHexColor(colorHex, 20);

  return {
    full: `#${colorHex}`,
    light: `#${colorHex}1a`, // 10% opacity - for backgrounds
    medium: `#${colorHex}40`, // 25% opacity - for borders
    lighter: `#${colorHex}0a`, // 4% opacity - for hover states
    dark: `#${darkColor}`, // Darker version - for text
    extraLight: `#${colorHex}05`, // 2% opacity - very subtle backgrounds
    border: `#${colorHex}20`, // 12.5% opacity - for borders
    hex: colorHex,
  };
}

/**
 * Button style variations based on brand colors
 *
 * @param options - Brand color options
 * @returns Object with button style variations
 */
export function getButtonStyles(options: BrandColorsOptions | string = {}) {
  // Handle legacy string argument
  if (typeof options === "string") {
    options = { primaryColor: options };
  }

  const colors = getBrandColors(options);

  return {
    primary: {
      background: colors.primary.full,
      hoverBackground: `${colors.primary.full}dd`,
      text: "white",
    },
    secondary: {
      background: colors.secondary.full,
      hoverBackground: `${colors.secondary.full}dd`,
      text: "white",
    },
    accent: {
      background: colors.accent.full,
      hoverBackground: `${colors.accent.full}dd`,
      text: "white",
    },
    outline: {
      background: "transparent",
      hoverBackground: colors.primary.lighter,
      text: colors.primary.full,
      border: colors.primary.medium,
    },
    ghost: {
      background: "transparent",
      hoverBackground: colors.primary.lighter,
      text: colors.primary.full,
    },
    subtle: {
      background: "white",
      hoverBackground: colors.primary.lighter,
      text: "gray-700",
      border: "gray-200",
    },
    outlineThemed: {
      background: "transparent",
      hoverBackground: colors.primary.full,
      text: colors.primary.full,
      hoverText: "white", // Text becomes white on hover for better contrast
      border: colors.primary.medium,
    },
    whiteOnHover: {
      background: "white",
      hoverBackground: colors.primary.light,
      text: colors.primary.full,
      hoverText: "black", // Text becomes black on hover for contrast on light backgrounds
      border: colors.primary.lighter,
    },
  };
}

/**
 * Generate card styles for consistent card UI elements
 */
export function getCardStyles() {
  return {
    default: "bg-white rounded-xl border border-gray-100 shadow-sm p-6",
    hover: "transition-all duration-300 hover:shadow-md hover:border-gray-200",
    dark: "bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6",
  };
}

/**
 * CSS utilities for consistent spacing, typography, etc.
 */
export const cssUtils = {
  section: {
    padding: "py-16 px-6 sm:py-20",
    container: "container mx-auto",
  },
  headings: {
    h1: "text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight",
    h2: "text-3xl md:text-4xl font-bold",
    h3: "text-2xl font-bold",
    h4: "text-xl font-semibold",
  },
};

/**
 * Pattern backgrounds for visual interest
 */
export function getPatternBackgrounds(
  options: BrandColorsOptions | string = {},
) {
  // Handle legacy string argument
  let primaryColor: string;

  if (typeof options === "string") {
    primaryColor = options;
  } else {
    primaryColor = options.primaryColor || DEFAULT_COLORS.primaryColor;
  }

  return {
    dots: {
      style: {
        backgroundImage: `radial-gradient(#${primaryColor} 1px, transparent 1px)`,
        backgroundSize: "30px 30px",
      },
      className: "opacity-10",
    },
    grid: {
      style: {
        backgroundImage: `linear-gradient(to right, #${primaryColor}10 1px, transparent 1px), 
                          linear-gradient(to bottom, #${primaryColor}10 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      },
      className: "opacity-20",
    },
  };
}

/**
 * Convert hex color to HSL for shadcn theme
 * @param hexColor Hex color (with or without #)
 * @returns HSL values as a string like "215 90% 54%"
 */
function hexToHSL(hexColor: string): string {
  // Remove # if present
  hexColor = hexColor.replace("#", "");

  // Parse the hex color
  const r = parseInt(hexColor.substring(0, 2), 16) / 255;
  const g = parseInt(hexColor.substring(2, 4), 16) / 255;
  const b = parseInt(hexColor.substring(4, 6), 16) / 255;

  // Find the min and max values to calculate the luminance
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // Calculate luminance
  let l = (max + min) / 2;

  // Calculate saturation
  let s = 0;
  if (max !== min) {
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  }

  // Calculate hue
  let h = 0;
  if (max !== min) {
    if (max === r) {
      h = (g - b) / (max - min) + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      // max === b
      h = (r - g) / (max - min) + 4;
    }
    h = h * 60;
  }

  // Convert to the right format
  h = Math.round(h);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

/**
 * Apply brand color CSS variables to :root for component usage
 * This allows components to access brand colors via CSS variables
 * @param options - Brand color options
 */
export function applyBrandColorVars(options: BrandColorsOptions | string = {}) {
  // Don't run in SSR
  if (typeof document === "undefined") return;

  const colors = getBrandColors(options);
  const root = document.documentElement;

  // Remove # from colors for proper CSS var formatting
  const cleanHex = (color: string) => color.replace("#", "");

  // Apply primary color variants
  root.style.setProperty("--brand-primary", colors.primary.full);
  root.style.setProperty("--brand-primary-light", colors.primary.light);
  root.style.setProperty("--brand-primary-medium", colors.primary.medium);
  root.style.setProperty("--brand-primary-lighter", colors.primary.lighter);
  root.style.setProperty("--brand-primary-dark", colors.primary.dark);
  root.style.setProperty(
    "--brand-primary-extra-light",
    colors.primary.extraLight,
  );

  // Apply secondary color variants
  root.style.setProperty("--brand-secondary", colors.secondary.full);
  root.style.setProperty("--brand-secondary-light", colors.secondary.light);
  root.style.setProperty("--brand-secondary-medium", colors.secondary.medium);
  root.style.setProperty("--brand-secondary-dark", colors.secondary.dark);

  // Apply accent color variants
  root.style.setProperty("--brand-accent", colors.accent.full);
  root.style.setProperty("--brand-accent-light", colors.accent.light);
  root.style.setProperty("--brand-accent-medium", colors.accent.medium);
  root.style.setProperty("--brand-accent-dark", colors.accent.dark);

  // Apply to shadcn theme variables
  applyToShadcnTheme(colors);
}

/**
 * Apply brand colors to shadcn UI theme variables
 * This ensures shadcn components automatically use the brand colors
 */
export function applyToShadcnTheme(colors: BrandColorsResult) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Convert colors to HSL format for shadcn
  const primaryHSL = hexToHSL(colors.primary.hex);
  const secondaryHSL = hexToHSL(colors.secondary.hex);
  const accentHSL = hexToHSL(colors.primary.hex); // Use primary for accent

  // Calculate foreground colors (text on colored backgrounds)
  // For most brand colors, white works best as foreground
  const primaryForeground = "0 0% 100%"; // White
  const secondaryForeground = "0 0% 100%"; // White
  const accentForeground = "0 0% 100%"; // White

  // Get darker/lighter variants for hover states, borders, etc.
  const primaryDarkHSL = hexToHSL(colors.primary.dark);
  const primaryLightHSL = hexToHSL(colors.primary.hex + "20"); // Lighter version

  // Calculate destructive color (usually red)
  const destructiveHSL = "0 84% 60%"; // Red color
  const destructiveForeground = "0 0% 100%"; // White

  // Calculate muted colors (usually grays)
  const mutedHSL = "220 14% 96%"; // Light gray
  const mutedForegroundHSL = "220 14% 46%"; // Darker gray for text

  // Calculate card, popover and other UI element colors
  const cardHSL = "0 0% 100%"; // White
  const cardForegroundHSL = "222.2 84% 4.9%"; // Near black

  // Border colors
  const borderHSL = "220 13% 91%"; // Light gray
  const inputHSL = "220 13% 91%"; // Light gray

  // Ring colors (focus rings)
  const ringHSL = primaryHSL; // Use primary color for focus ring

  // Background colors
  const backgroundHSL = "0 0% 100%"; // White
  const foregroundHSL = "222.2 84% 4.9%"; // Near black

  console.log(
    `Applying branding: primary=${primaryHSL}, secondary=${secondaryHSL}`,
  );

  // Apply all shadcn theme variables

  // Base colors
  root.style.setProperty("--background", backgroundHSL);
  root.style.setProperty("--foreground", foregroundHSL);

  // Primary colors
  root.style.setProperty("--primary", primaryHSL);
  root.style.setProperty("--primary-foreground", primaryForeground);

  // Secondary colors
  root.style.setProperty("--secondary", secondaryHSL);
  root.style.setProperty("--secondary-foreground", secondaryForeground);

  // Muted colors
  root.style.setProperty("--muted", mutedHSL);
  root.style.setProperty("--muted-foreground", mutedForegroundHSL);

  // Accent colors
  root.style.setProperty("--accent", accentHSL);
  root.style.setProperty("--accent-foreground", accentForeground);

  // Destructive colors
  root.style.setProperty("--destructive", destructiveHSL);
  root.style.setProperty("--destructive-foreground", destructiveForeground);

  // UI element colors
  root.style.setProperty("--card", cardHSL);
  root.style.setProperty("--card-foreground", cardForegroundHSL);
  root.style.setProperty("--popover", cardHSL);
  root.style.setProperty("--popover-foreground", cardForegroundHSL);

  // Border colors
  root.style.setProperty("--border", borderHSL);
  root.style.setProperty("--input", inputHSL);

  // Ring colors (focus rings)
  root.style.setProperty("--ring", ringHSL);

  // Set radius and other UI properties
  root.style.setProperty("--radius", "0.5rem");

  // Force button to use the right styles - fix for buttons
  document.documentElement.style.setProperty("--btn-primary", primaryHSL);
  document.documentElement.style.setProperty("--btn-primary-hover", primaryHSL);
}
