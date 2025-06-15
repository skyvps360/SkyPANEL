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
  category: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'pink' | 'gray';
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
  {
    name: 'Corporate Elegance',
    description: 'Deep blues with sophisticated grays for professional branding',
    primary: '2C3E50',
    secondary: '34495E',
    accent: '3498DB',
    category: 'professional'
  },
  {
    name: 'Strategic Vision',
    description: 'Bold blues with green and amber accents for dynamic brands',
    primary: '2980B9',
    secondary: '85C1AE',
    accent: 'F7DC6F',
    category: 'professional'
  },
  {
    name: 'Contemporary Focus',
    description: 'Modern tech startup palette with balanced contrast',
    primary: '34495E',
    secondary: '5DADE2',
    accent: 'E74C3C',
    category: 'professional'
  },
  {
    name: 'Professional Blue',
    description: 'Classic business colors with blue primary',
    primary: '2563eb',
    secondary: '10b981',
    accent: 'f59e0b',
    category: 'professional'
  },
  {
    name: 'Financial Trust',
    description: 'Trustworthy deep blues with emerald accents',
    primary: '1e3a8a',
    secondary: '059669',
    accent: 'd97706',
    category: 'professional'
  },
  {
    name: 'Tech Innovation',
    description: 'Modern purple with cyan and orange highlights',
    primary: '7c3aed',
    secondary: '06b6d4',
    accent: 'f97316',
    category: 'vibrant'
  },
  {
    name: 'Nature Harmony',
    description: 'Earthy green tones inspired by nature',
    primary: '059669',
    secondary: '0d9488',
    accent: 'f59e0b',
    category: 'nature'
  },
  {
    name: 'Sunset Warmth',
    description: 'Warm orange and red tones for energetic brands',
    primary: 'ea580c',
    secondary: 'dc2626',
    accent: 'fbbf24',
    category: 'warm'
  },
  {
    name: 'Ocean Depth',
    description: 'Cool blue and teal combination for calm professionalism',
    primary: '0284c7',
    secondary: '0891b2',
    accent: '06b6d4',
    category: 'cool'
  },
  {
    name: 'Royal Luxury',
    description: 'Elegant purple with gold accents for premium brands',
    primary: '9333ea',
    secondary: '7c3aed',
    accent: 'd97706',
    category: 'vibrant'
  },
  {
    name: 'Enterprise Growth',
    description: 'Professional green with blue and amber support',
    primary: '16a34a',
    secondary: '2563eb',
    accent: 'f59e0b',
    category: 'professional'
  },  {
    name: 'Creative Energy',
    description: 'Vibrant magenta with purple and orange accents',
    primary: 'c026d3',
    secondary: '9333ea',
    accent: 'f97316',
    category: 'vibrant'
  },
  // Additional Vibrant Themes
  {
    name: 'Electric Fusion',
    description: 'High-energy cyan and lime with hot pink accents',
    primary: '06b6d4',
    secondary: '84cc16',
    accent: 'ec4899',
    category: 'vibrant'
  },
  {
    name: 'Neon Dreams',
    description: 'Electric blue with neon green and bright yellow',
    primary: '0ea5e9',
    secondary: '22c55e',
    accent: 'eab308',
    category: 'vibrant'
  },
  {
    name: 'Pop Culture',
    description: 'Hot pink with electric purple and lime highlights',
    primary: 'ec4899',
    secondary: 'a855f7',
    accent: '84cc16',
    category: 'vibrant'
  },
  {
    name: 'Digital Glow',
    description: 'Bright blue with electric orange and neon purple',
    primary: '3b82f6',
    secondary: 'f97316',
    accent: 'a855f7',
    category: 'vibrant'
  },
  // Additional Nature Themes
  {
    name: 'Forest Deep',
    description: 'Deep forest greens with moss and earth tones',
    primary: '166534',
    secondary: '65a30d',
    accent: 'a3a3a3',
    category: 'nature'
  },
  {
    name: 'Mountain Ridge',
    description: 'Sage green with stone gray and warm brown',
    primary: '84cc16',
    secondary: '6b7280',
    accent: 'a3a3a3',
    category: 'nature'
  },
  {
    name: 'Garden Fresh',
    description: 'Fresh spring green with lavender and peach',
    primary: '22c55e',
    secondary: 'a855f7',
    accent: 'fb923c',
    category: 'nature'
  },
  {
    name: 'Earth Elements',
    description: 'Terra cotta with sage green and warm beige',
    primary: 'dc2626',
    secondary: '65a30d',
    accent: 'f59e0b',
    category: 'nature'
  },
  {
    name: 'Ocean Breeze',
    description: 'Sea blue with seafoam green and sandy beige',
    primary: '0284c7',
    secondary: '10b981',
    accent: 'fbbf24',
    category: 'nature'
  },
  // Additional Warm Themes
  {
    name: 'Autumn Glow',
    description: 'Burnt orange with warm red and golden yellow',
    primary: 'ea580c',
    secondary: 'dc2626',
    accent: 'f59e0b',
    category: 'warm'
  },
  {
    name: 'Desert Sand',
    description: 'Warm beige with rust and amber tones',
    primary: 'd97706',
    secondary: 'dc2626',
    accent: 'fbbf24',
    category: 'warm'
  },
  {
    name: 'Cozy Hearth',
    description: 'Warm brick with cream and golden accents',
    primary: 'dc2626',
    secondary: 'f59e0b',
    accent: 'fbbf24',
    category: 'warm'
  },
  {
    name: 'Spice Market',
    description: 'Cinnamon and paprika with saffron highlights',
    primary: 'ea580c',
    secondary: 'dc2626',
    accent: 'f59e0b',
    category: 'warm'
  },
  {
    name: 'Sunset Coral',
    description: 'Coral pink with warm orange and peach',
    primary: 'f97316',
    secondary: 'fb923c',
    accent: 'fbbf24',
    category: 'warm'
  }
];

// Color presets organized by category
const COLOR_PRESETS: Record<string, ColorPreset[]> = {
  blue: [
    { name: 'Sky Blue', value: '0ea5e9', category: 'blue' },
    { name: 'Blue', value: '2563eb', category: 'blue' },
    { name: 'Dark Blue', value: '1d4ed8', category: 'blue' },
    { name: 'Indigo', value: '4338ca', category: 'blue' },
    { name: 'Navy', value: '1e3a8a', category: 'blue' },
    { name: 'Cyan', value: '0891b2', category: 'blue' }
  ],
  green: [
    { name: 'Emerald', value: '10b981', category: 'green' },
    { name: 'Green', value: '16a34a', category: 'green' },
    { name: 'Teal', value: '0d9488', category: 'green' },
    { name: 'Dark Green', value: '059669', category: 'green' },
    { name: 'Lime', value: '84cc16', category: 'green' },
    { name: 'Forest', value: '15803d', category: 'green' }
  ],
  purple: [
    { name: 'Purple', value: '7c3aed', category: 'purple' },
    { name: 'Violet', value: '9333ea', category: 'purple' },
    { name: 'Dark Purple', value: '6b21a8', category: 'purple' },
    { name: 'Indigo', value: '4f46e5', category: 'purple' },
    { name: 'Lavender', value: 'a855f7', category: 'purple' },
    { name: 'Magenta', value: 'c026d3', category: 'purple' }
  ],
  red: [
    { name: 'Red', value: 'ef4444', category: 'red' },
    { name: 'Dark Red', value: 'dc2626', category: 'red' },
    { name: 'Crimson', value: 'b91c1c', category: 'red' },
    { name: 'Rose', value: 'f43f5e', category: 'red' },
    { name: 'Pink', value: 'ec4899', category: 'red' },
    { name: 'Cherry', value: 'be123c', category: 'red' }
  ],
  orange: [
    { name: 'Orange', value: 'f97316', category: 'orange' },
    { name: 'Dark Orange', value: 'ea580c', category: 'orange' },
    { name: 'Amber', value: 'f59e0b', category: 'orange' },
    { name: 'Yellow', value: 'fbbf24', category: 'orange' },
    { name: 'Gold', value: 'd97706', category: 'orange' },
    { name: 'Tangerine', value: 'fb923c', category: 'orange' }
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

  // Handle theme selection
  const handleThemeSelect = (theme: ColorTheme) => {
    const colorValue = type === 'primary' ? theme.primary : 
                     type === 'secondary' ? theme.secondary : 
                     theme.accent;
    handleColorChange(colorValue);
    setIsOpen(false);
  };

  // Get color category for the current type
  const getColorCategories = () => {
    switch (type) {
      case 'primary':
        return ['blue', 'purple', 'green'];
      case 'secondary':
        return ['green', 'blue', 'orange'];
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="picker" className="flex items-center gap-2">
                    <Pipette className="w-4 h-4" />
                    Picker
                  </TabsTrigger>
                  <TabsTrigger value="presets" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Presets
                  </TabsTrigger>
                  <TabsTrigger value="themes" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Themes
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

                  <TabsContent value="themes" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      {COLOR_THEMES.map((theme) => (
                        <Card 
                          key={theme.name} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handleThemeSelect(theme)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm">{theme.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {theme.category}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {theme.description}
                                </p>
                              </div>
                              <div className="flex space-x-1">
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: `#${theme.primary}` }}
                                  title="Primary"
                                />
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: `#${theme.secondary}` }}
                                  title="Secondary"
                                />
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: `#${theme.accent}` }}
                                  title="Accent"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
        <CardDescription className="text-xs">
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
  const isThemeActive = (theme: ColorTheme) => {
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
              const isActive = isThemeActive(theme);
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
