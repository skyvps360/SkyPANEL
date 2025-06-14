/**
 * @fileoverview Enhanced color selector component using shadcn UI components
 * @author SkyPANEL Development Team
 * @created 2025-06-14
 * @modified 2025-06-14
 * @version 1.0.0
 */

import React, { useState } from 'react';
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
    name: 'Professional Blue',
    description: 'Classic business colors with blue primary',
    primary: '2563eb',
    secondary: '10b981',
    accent: 'f59e0b',
    category: 'professional'
  },
  {
    name: 'Modern Purple',
    description: 'Contemporary purple-based theme',
    primary: '7c3aed',
    secondary: '06b6d4',
    accent: 'ec4899',
    category: 'vibrant'
  },
  {
    name: 'Nature Green',
    description: 'Earthy green tones inspired by nature',
    primary: '059669',
    secondary: '0d9488',
    accent: 'f59e0b',
    category: 'nature'
  },
  {
    name: 'Sunset Orange',
    description: 'Warm orange and red tones',
    primary: 'ea580c',
    secondary: 'dc2626',
    accent: 'fbbf24',
    category: 'warm'
  },
  {
    name: 'Ocean Blue',
    description: 'Cool blue and teal combination',
    primary: '0284c7',
    secondary: '0891b2',
    accent: '06b6d4',
    category: 'cool'
  },
  {
    name: 'Royal Purple',
    description: 'Elegant purple with gold accents',
    primary: '9333ea',
    secondary: '7c3aed',
    accent: 'd97706',
    category: 'vibrant'
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
  const [localValue, setLocalValue] = useState(value);

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
    
    // Only update parent if it's a valid hex color
    if (/^[0-9A-Fa-f]{6}$/.test(inputValue)) {
      onChange(inputValue);
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

export default EnhancedColorSelector;
