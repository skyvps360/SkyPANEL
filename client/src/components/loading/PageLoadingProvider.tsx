import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { VpsLoadingAnimation } from './VpsLoadingAnimation';
import axios from 'axios';
import { getBrandColors, BrandColorsResult } from '../../lib/brand-theme';

interface PageLoadingContextType {
  showLoading: () => void;
  hideLoading: () => void;
  isLoading: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  brandColors: BrandColorsResult;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
}

interface LoadingScreenSettings {
  loading_screen_enabled?: string;
  loading_screen_animation_duration?: string;
  loading_screen_min_duration?: string;
  loading_screen_show_on_all_pages?: string;
}

const PageLoadingContext = createContext<PageLoadingContextType>({
  showLoading: () => {},
  hideLoading: () => {},
  isLoading: false,
  primaryColor: '33be00',
  secondaryColor: '818cf8',
  accentColor: 'f59e0b',
  brandColors: getBrandColors({
    primaryColor: '33be00',
    secondaryColor: '818cf8',
    accentColor: 'f59e0b'
  }),
  setPrimaryColor: () => {},
  setSecondaryColor: () => {},
  setAccentColor: () => {},
});

export const usePageLoading = () => useContext(PageLoadingContext);

interface PageLoadingProviderProps {
  children: ReactNode;
  initialColors?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

export function PageLoadingProvider({ 
  children, 
  initialColors = { 
    primaryColor: '33be00',
    secondaryColor: '818cf8',
    accentColor: 'f59e0b' 
  }
}: PageLoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState(initialColors.primaryColor || '33be00');
  const [secondaryColor, setSecondaryColor] = useState(initialColors.secondaryColor || '818cf8');
  const [accentColor, setAccentColor] = useState(initialColors.accentColor || 'f59e0b');
  const [animationComplete, setAnimationComplete] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState<LoadingScreenSettings>({
    loading_screen_enabled: 'true',
    loading_screen_animation_duration: '3000',
    loading_screen_min_duration: '1000',
    loading_screen_show_on_all_pages: 'false'
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  
  // Generate brand colors from the current state
  const brandColors = getBrandColors({
    primaryColor,
    secondaryColor,
    accentColor
  });

  // Fetch loading screen settings on mount
  useEffect(() => {
    async function fetchBrandingSettings() {
      try {
        const response = await axios.get('/api/settings/branding');
        
        if (response.data) {
          // Set primary color (with fallback to legacy company_color)
          if (response.data.primary_color) {
            setPrimaryColor(response.data.primary_color.replace('#', ''));
          } else if (response.data.company_color) {
            // Fallback to legacy company_color if primary_color is not set
            setPrimaryColor(response.data.company_color.replace('#', ''));
          }
          
          // Set secondary color if available
          if (response.data.secondary_color) {
            setSecondaryColor(response.data.secondary_color.replace('#', ''));
          }
          
          // Set accent color if available
          if (response.data.accent_color) {
            setAccentColor(response.data.accent_color.replace('#', ''));
          }
          
          // Get loading screen settings
          const settings: LoadingScreenSettings = {
            loading_screen_enabled: response.data.loading_screen_enabled,
            loading_screen_animation_duration: response.data.loading_screen_animation_duration,
            loading_screen_min_duration: response.data.loading_screen_min_duration,
            loading_screen_show_on_all_pages: response.data.loading_screen_show_on_all_pages
          };
          setLoadingSettings(settings);
        }
        
        setBrandingLoaded(true);
      } catch (error) {
        console.error('Failed to load branding settings:', error);
        setBrandingLoaded(true); // Continue even if settings fail to load
      }
    }
    
    fetchBrandingSettings();
  }, []);

  // Handle loading screen initial state
  useEffect(() => {
    if (brandingLoaded) {
      // If loading is disabled in settings, hide immediately
      const isEnabled = loadingSettings.loading_screen_enabled !== 'false';
      
      if (!isEnabled) {
        setIsLoading(false);
      }
    }
  }, [brandingLoaded, loadingSettings]);

  const showLoading = useCallback(() => {
    // Only show loading if it's enabled and not already loading
    const isEnabled = loadingSettings.loading_screen_enabled !== 'false';

    // Prevent showing loading screen if already loading or already completed an animation
    if (isEnabled && !isLoading && !animationComplete) {
      // Showing loading screen
      setIsLoading(true);
    }
  }, [loadingSettings.loading_screen_enabled, isLoading, animationComplete]);

  const hideLoading = useCallback(() => {
    // Allow the animation to complete before hiding
    if (animationComplete) {
      setIsLoading(false);
      setAnimationComplete(false);
    }
  }, [animationComplete]);

  // Handle animation complete event
  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    // Auto-hide the loading screen once animation is complete
    setIsLoading(false);
  };

  // Calculate animation duration from settings
  const getAnimationDuration = (): number => {
    if (loadingSettings.loading_screen_animation_duration) {
      const duration = parseInt(loadingSettings.loading_screen_animation_duration, 10);
      if (!isNaN(duration) && duration > 0) {
        return duration;
      }
    }
    return 3000; // Default 3 seconds
  };

  // Expose the loading context
  const contextValue: PageLoadingContextType = {
    showLoading,
    hideLoading,
    isLoading,
    primaryColor,
    secondaryColor,
    accentColor,
    brandColors,
    setPrimaryColor,
    setSecondaryColor,
    setAccentColor,
  };

  // Don't render anything until branding is loaded
  if (!brandingLoaded) {
    return null;
  }

  return (
    <PageLoadingContext.Provider value={contextValue}>
      {isLoading && (
        <VpsLoadingAnimation 
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
          onAnimationComplete={handleAnimationComplete}
          animationDuration={getAnimationDuration()}
        />
      )}
      <div className={isLoading ? 'invisible' : 'visible'}>
        {children}
      </div>
    </PageLoadingContext.Provider>
  );
}