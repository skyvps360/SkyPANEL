/**
 * @fileoverview Enhanced color selector component using shadcn UI components
 * @author SkyPANEL Development Team
 * @created 2025-06-14
 * @modified 2025-06-14
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Palette, Pipette, Star, Sparkles } from 'lucide-react';

// shadcn UI imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// Type definitions
interface ColorTheme {
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  category: 'professional' | 'vibrant' | 'nature' | 'warm' | 'cool';
}

interface ColorPreset {
  name: string;
  value: string;
  category: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'pink' | 'gray' | 'neutral';
}

interface EnhancedColorSelectorProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  error?: string;
  description?: string;
  type: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

// Predefined color themes
const COLOR_THEMES: ColorTheme[] = [
  // Professional Themes
  {
    name: 'Corporate Elegance',
    description: 'Deep blues and silvers for a sophisticated, trustworthy brand.',
    primary: '1A2C42',
    secondary: '6C7A89',
    accent: '4A90E2',
    category: 'professional'
  },
  {
    name: 'Modern Professional',
    description: 'Clean and crisp with a vibrant blue, subtle grey, and a touch of gold.',
    primary: '2B6CB0',
    secondary: '4A5568',
    accent: 'D69E2E',
    category: 'professional'
  },
  {
    name: 'Executive Green',
    description: 'Rich greens and deep blues for a reliable and established feel.',
    primary: '047857',
    secondary: '1E3A8A',
    accent: 'FBBF24',
    category: 'professional'
  },
  {
    name: 'Tech Blueprint',
    description: 'Cool blues and light grays, evoking a sense of innovation and precision.',
    primary: '2563EB',
    secondary: '4299E1',
    accent: '38B2AC',
    category: 'professional'
  },
  {
    name: 'Classic Neutral',
    description: 'Understated elegance with warm grays, a soft primary, and a subtle accent.',
    primary: '4B5563',
    secondary: '6B7280',
    accent: 'F59E0B',
    category: 'professional'
  },

  // Vibrant Themes
  {
    name: 'Dynamic Energy',
    description: 'Bright and energetic with a striking orange, bold purple, and electric blue.',
    primary: 'F97316',
    secondary: '8B5CF6',
    accent: '3B82F6',
    category: 'vibrant'
  },
  {
    name: 'Creative Spectrum',
    description: 'A playful mix of cyan, magenta, and a sunny yellow.',
    primary: '06B6D4',
    secondary: 'EC4899',
    accent: 'FDE047',
    category: 'vibrant'
  },
  {
    name: 'Electric Pulse',
    description: 'High-contrast and modern with a deep teal, bright pink, and lime green.',
    primary: '14B8A6',
    secondary: 'DB2777',
    accent: '84CC16',
    category: 'vibrant'
  },
  {
    name: 'Urban Glow',
    description: 'Sleek dark tones contrasted with a neon green and a vibrant violet.',
    primary: '1F2937',
    secondary: '22C55E',
    accent: 'A78BFA',
    category: 'vibrant'
  },

  // Nature Themes
  {
    name: 'Forest Retreat',
    description: 'Earthy greens and warm browns for a natural and calming presence.',
    primary: '059669',
    secondary: '78350F',
    accent: 'D97706',
    category: 'nature'
  },
  {
    name: 'Desert Bloom',
    description: 'Warm, muted tones of terracotta, sage, and a soft beige.',
    primary: 'EA580C',
    secondary: '6B7280',
    accent: 'D97706',
    category: 'nature'
  },
  {
    name: 'Ocean Depths',
    description: 'Cool blues and deep teals, reminiscent of clear waters.',
    primary: '0369A1',
    secondary: '0F766E',
    accent: '38BDF8',
    category: 'nature'
  },

  // Warm Themes
  {
    name: 'Sunset Horizon',
    description: 'Fiery oranges and reds, reflecting warmth and energy.',
    primary: 'DC2626',
    secondary: 'F97316',
    accent: 'FBBF24',
    category: 'warm'
  },
  {
    name: 'Golden Hour',
    description: 'Soft yellows and oranges, capturing the essence of a warm glow.',
    primary: 'F59E0B',
    secondary: 'FB923C',
    accent: 'FEF08A',
    category: 'warm'
  },
  {
    name: 'Autumn Harvest',
    description: 'Deep reds, rustic oranges, and rich browns for a cozy feel.',
    primary: '991B1B',
    secondary: 'EA580C',
    accent: '78350F',
    category: 'warm'
  },

  // Cool Themes
  {
    name: 'Winter Chill',
    description: 'Icy blues and crisp whites for a clean and refreshing look.',
    primary: '0EA5E9',
    secondary: '63B3ED',
    accent: 'A78BFA',
    category: 'cool'
  },
  {
    name: 'Midnight Sky',
    description: 'Deep purples and blues, creating a serene and mysterious atmosphere.',
    primary: '4C1D95',
    secondary: '1E3A8A',
    accent: '8B5CF6',
    category: 'cool'
  }
];

// Color presets organized by category
const COLOR_PRESETS: Record<string, ColorPreset[]> = {
  blue: [
    { name: 'Navy Blue', value: '1A2C42', category: 'blue' },
    { name: 'Royal Blue', value: '2B6CB0', category: 'blue' },
    { name: 'Sky Blue', value: '38BDF8', category: 'blue' },
    { name: 'Electric Blue', value: '3B82F6', category: 'blue' },
    { name: 'Ocean Blue', value: '0369A1', category: 'blue' },
    { name: 'Teal Blue', value: '0F766E', category: 'blue' }
  ],
  green: [
    { name: 'Forest Green', value: '047857', category: 'green' },
    { name: 'Emerald Green', value: '059669', category: 'green' },
    { name: 'Lime Green', value: '84CC16', category: 'green' },
    { name: 'Mint Green', value: '14B8A6', category: 'green' },
    { name: 'Dark Green', value: '166534', category: 'green' },
    { name: 'Olive Green', value: '38A169', category: 'green' } 
  ],
  purple: [
    { name: 'Deep Purple', value: '4C1D95', category: 'purple' },
    { name: 'Violet', value: '8B5CF6', category: 'purple' },
    { name: 'Lavender', value: 'A78BFA', category: 'purple' },
    { name: 'Magenta', value: 'EC4899', category: 'purple' },
    { name: 'Amethyst', value: 'A855F7', category: 'purple' },
    { name: 'Plum', value: 'DB2777', category: 'purple' }
  ],
  red: [
    { name: 'Crimson', value: '991B1B', category: 'red' },
    { name: 'Scarlet', value: 'DC2626', category: 'red' },
    { name: 'Terracotta', value: 'EA580C', category: 'red' },
    { name: 'Rose Red', value: 'F43F5E', category: 'red' },
    { name: 'Ruby', value: 'BE123C', category: 'red' },
    { name: 'Maroon', value: '7F1D1D', category: 'red' }
  ],
  orange: [
    { name: 'Bright Orange', value: 'F97316', category: 'orange' },
    { name: 'Golden Yellow', value: 'FBBF24', category: 'orange' },
    { name: 'Amber', value: 'F59E0B', category: 'orange' },
    { name: 'Peach', value: 'FB923C', category: 'orange' },
    { name: 'Rust', value: '78350F', category: 'orange' },
    { name: 'Soft Yellow', value: 'FEF08A', category: 'orange' }
  ],
  neutral: [
    { name: 'Dark Gray', value: '1F2937', category: 'neutral' },
    { name: 'Charcoal', value: '374151', category: 'neutral' },
    { name: 'Slate Gray', value: '4B5563', category: 'neutral' },
    { name: 'Medium Gray', value: '6B7280', category: 'neutral' },
    { name: 'Darker Gray', value: '525252', category: 'neutral' },
    { name: 'Greyish Brown', value: '737373', category: 'neutral' }
  ]
};


/**
 * Enhanced color selector component with modern UI and comprehensive features
 */
export function EnhancedColorSelector({
  label,
  value,
  onChange,
  error,
  description,
  type,
  disabled = false
}: EnhancedColorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('picker');
  const [localValue, setLocalValue] = useState(value || '');

  // Sync localValue with prop value when it changes
  useEffect(() => {
    // Ensure we always have a valid value, defaulting based on type
    const defaultValue = type === 'primary' ? '2563eb' : 
                        type === 'secondary' ? '10b981' : 
                        'f59e0b';
    setLocalValue(value || defaultValue);
  }, [value, type]);

  // Handle color change with validation
  const handleColorChange = (newColor: string) => {
    const cleanColor = newColor.replace('#', '');
    setLocalValue(cleanColor);
    onChange(cleanColor);
  };
  // Handle hex input change
  const handleHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value.replace('#', '');
    setLocalValue(inputValue);
    
    // Only update parent if it's a valid hex color (but allow partial typing)
    if (/^[0-9A-Fa-f]{6}$/.test(inputValue)) {
      onChange(inputValue);
    } else if (inputValue === '') {
      // Also handle empty input
      onChange('000000'); // Default to black for empty input
    }
  };


  // Get color category for the current type
  const getColorCategories = () => {
    switch (type) {
      case 'primary':
        return ['blue', 'purple', 'green'];
      case 'secondary':
        return ['green', 'blue', 'orange', 'neutral']; // Added 'neutral' to secondary options
      case 'accent':
        return ['orange', 'red', 'purple'];
      default:
        return ['blue', 'green', 'purple'];
    }
  };

  const colorValue = `#${localValue || value}`;
  const categories = getColorCategories();

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <Label htmlFor={`color-${type}`} className="text-sm font-medium">
          {label}
        </Label>
        
        <div className="flex items-center space-x-3">
          {/* Color Preview Button */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-12 h-12 p-1 rounded-lg border-2 hover:border-primary/50 transition-colors"
                disabled={disabled}
                style={{
                  backgroundColor: colorValue,
                  borderColor: error ? 'rgb(239, 68, 68)' : undefined
                }}
                aria-label={`Select ${type} color`}
              >
                <div 
                  className="w-full h-full rounded-md shadow-sm"
                  style={{ backgroundColor: colorValue }}
                />
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-96 p-0" align="start">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="picker" className="flex items-center gap-2">
                    <Pipette className="w-4 h-4" />
                    Picker
                  </TabsTrigger>
                  <TabsTrigger value="presets" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Presets
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="picker" className="space-y-4 mt-0">
                    <div className="flex justify-center">
                      <HexColorPicker
                        color={colorValue}
                        onChange={handleColorChange}
                        style={{ width: '200px', height: '200px' }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="hex-input" className="text-sm">Hex Code</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">#</span>
                        <Input
                          id="hex-input"
                          value={localValue}
                          onChange={handleHexInputChange}
                          placeholder="2563eb"
                          className="font-mono uppercase"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="presets" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      {categories.map((category) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                            <Star className="w-3 h-3" />
                            {category} Colors
                          </h4>
                          <div className="grid grid-cols-6 gap-2">
                            {COLOR_PRESETS[category]?.map((preset) => (
                              <Tooltip key={preset.value}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-8 h-8 p-0 rounded-full border-2 hover:border-primary transition-all hover:scale-110"
                                    style={{ backgroundColor: `#${preset.value}` }}
                                    onClick={() => handleColorChange(preset.value)}
                                    aria-label={`Select ${preset.name}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{preset.name}</p>
                                  <p className="text-xs text-muted-foreground">#{preset.value}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                </div>
              </Tabs>
            </PopoverContent>
          </Popover>

          {/* Hex Input Field */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">#</span>
              <Input
                id={`color-${type}`}
                value={localValue}
                onChange={handleHexInputChange}
                placeholder={type === 'primary' ? '2563eb' : type === 'secondary' ? '10b981' : 'f59e0b'}
                className="font-mono uppercase"
                maxLength={6}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Color preview component for displaying all three colors together
 */
interface ColorPreviewProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export function ColorPreview({ primaryColor, secondaryColor, accentColor }: ColorPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Color Preview
        </CardTitle>
        <CardDescription className="xs">
          See how your colors work together
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Color Swatches */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center space-y-2">
            <div 
              className="w-full h-12 rounded-lg shadow-sm border"
              style={{ backgroundColor: `#${primaryColor}` }}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium">Primary</p>
              <p className="text-xs text-muted-foreground font-mono">#{primaryColor}</p>
            </div>
          </div>
          <div className="text-center space-y-2">
            <div 
              className="w-full h-12 rounded-lg shadow-sm border"
              style={{ backgroundColor: `#${secondaryColor}` }}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium">Secondary</p>
              <p className="text-xs text-muted-foreground font-mono">#{secondaryColor}</p>
            </div>
          </div>
          <div className="text-center space-y-2">
            <div 
              className="w-full h-12 rounded-lg shadow-sm border"
              style={{ backgroundColor: `#${accentColor}` }}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium">Accent</p>
              <p className="text-xs text-muted-foreground font-mono">#{accentColor}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Interactive Examples */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium">Component Examples</h4>
          <div className="grid grid-cols-3 gap-2">
            <Button 
              size="sm" 
              className="w-full text-xs"
              style={{ 
                backgroundColor: `#${primaryColor}`, 
                borderColor: `#${primaryColor}`,
                color: 'white'
              }}
            >
              Primary
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full text-xs"
              style={{ 
                borderColor: `#${secondaryColor}`,
                color: `#${secondaryColor}`
              }}
            >
              Secondary
            </Button>
            <Badge 
              className="text-xs justify-center py-1"
              style={{ 
                backgroundColor: `#${accentColor}`,
                color: 'white'
              }}
            >
              Accent
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dedicated theme selector component for applying complete color schemes
 */
interface ThemeSelectorProps {
  currentTheme?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  onThemeSelect: (theme: ColorTheme) => void;
  disabled?: boolean;
}

export function ThemeSelector({ currentTheme, onThemeSelect, disabled = false }: ThemeSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('professional');
  
  // Get unique categories
  const categories = Array.from(new Set(COLOR_THEMES.map(theme => theme.category)));
  
  // Filter themes by category
  const filteredThemes = COLOR_THEMES.filter(theme => theme.category === selectedCategory);
  
  // Check if a theme matches the current colors
  const isThemeActive = (theme: ColorTheme, currentTheme?: { primary: string; secondary: string; accent: string; }) => {
    if (!currentTheme) return false;
    return theme.primary.toLowerCase() === currentTheme.primary.toLowerCase() &&
           theme.secondary.toLowerCase() === currentTheme.secondary.toLowerCase() &&
           theme.accent.toLowerCase() === currentTheme.accent.toLowerCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Brand Theme Selector
        </CardTitle>
        <CardDescription>
          Choose a complete color scheme to apply all brand colors at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Theme Category</Label>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="vibrant">Vibrant</TabsTrigger>
              <TabsTrigger value="nature">Nature</TabsTrigger>
              <TabsTrigger value="warm">Warm</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Current Theme Display */}
        {currentTheme && (
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Current Theme</h4>
              <div className="flex space-x-1">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: `#${currentTheme.primary}` }}
                  title="Primary"
                />
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: `#${currentTheme.secondary}` }}
                  title="Secondary"
                />
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: `#${currentTheme.accent}` }}
                  title="Accent"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <p className="font-medium">Primary</p>
                <p className="text-muted-foreground font-mono">#{currentTheme.primary}</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Secondary</p>
                <p className="text-muted-foreground font-mono">#{currentTheme.secondary}</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Accent</p>
                <p className="text-muted-foreground font-mono">#{currentTheme.accent}</p>
              </div>
            </div>
          </div>
        )}

        {/* Theme Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Available Themes</Label>
            <Badge variant="secondary" className="text-xs">
              {filteredThemes.length} themes
            </Badge>
          </div>
          
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {filteredThemes.map((theme) => {
              const isActive = isThemeActive(theme, currentTheme);
              return (
                <Card 
                  key={theme.name} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/30'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && onThemeSelect(theme)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{theme.name}</h4>
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs capitalize">
                            {theme.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {theme.description}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-3">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: `#${theme.primary}` }}
                          title="Primary"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: `#${theme.secondary}` }}
                          title="Secondary"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: `#${theme.accent}` }}
                          title="Accent"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedColorSelector;
