import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface GoogleAnalyticsSettings {
  enabled: boolean;
  measurementId: string;
  apiKey?: string;
  customCode?: string;
  enhancedEcommerce: boolean;
  debugMode: boolean;
}

export const GoogleAnalytics: React.FC = () => {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Fetch Google Analytics settings - disabled to avoid duplicate API calls
  const { data: gaSettings } = useQuery<GoogleAnalyticsSettings>({
    queryKey: ['google-analytics-settings'],
    queryFn: async () => {
      const response = await axios.get('/api/settings/google-analytics');
      return response.data;
    },
    enabled: false, // We'll handle this in useEffect like HubSpot
  });

  useEffect(() => {
    const loadGoogleAnalytics = async () => {
      try {
        // Get Google Analytics settings
        const response = await axios.get('/api/settings/google-analytics');
        const settings = response.data;

        if (settings.enabled) {
          // Check if any GA script is already loaded to prevent duplicates
          if (document.getElementById('ga-script-loader') || 
              document.getElementById('ga-script') || 
              document.getElementById('ga-inline-config')) {
            setScriptLoaded(true);
            return;
          }

          // If custom code is provided, use that instead of Measurement ID
          if (settings.customCode && settings.customCode.trim()) {
            // Create a script element with the custom code
            const script = document.createElement('script');
            script.id = 'ga-script-loader';
            script.innerHTML = settings.customCode;
            
            script.onload = () => {
              setScriptLoaded(true);
              console.log('Google Analytics custom code loaded successfully');
            };
            
            script.onerror = () => {
              console.error('Failed to load Google Analytics custom code');
            };

            document.head.appendChild(script);
            return;
          }

          // Fall back to Measurement ID approach
          if (settings.measurementId) {
            // 1️⃣ External GA loader first
            const gaScript = document.createElement("script");
            gaScript.id = "ga-script";
            gaScript.async = true;
            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${settings.measurementId}`;

            gaScript.onload = () => {
              setScriptLoaded(true);
              console.log('Google Analytics script loaded successfully');
            };
            
            gaScript.onerror = () => {
              console.error('Failed to load Google Analytics script');
            };

            // 2️⃣ Inline configuration script
            const inlineScript = document.createElement("script");
            inlineScript.id = "ga-inline-config";
            inlineScript.innerHTML = `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${settings.measurementId}', {
                debug_mode: ${settings.debugMode},
                send_page_view: true${settings.enhancedEcommerce ? ", ecommerce: { enhanced: true }" : ""}
              });
            `;

            // Append scripts in the same order as the official snippet: loader first, config second
            document.head.appendChild(gaScript);
            document.head.appendChild(inlineScript);
          }
        }
      } catch (error) {
        console.error('Error loading Google Analytics settings:', error);
      }
    };

    loadGoogleAnalytics();

    // Cleanup function - only run when component unmounts
    return () => {
      const existingCustomScript = document.getElementById('ga-script-loader');
      const existingInlineScript = document.getElementById('ga-inline-config');
      const existingGaScript = document.getElementById('ga-script');
      
      if (existingCustomScript) {
        existingCustomScript.remove();
      }
      if (existingInlineScript) {
        existingInlineScript.remove();
      }
      if (existingGaScript) {
        existingGaScript.remove();
      }
    };
  }, []);

  return null; // The script handles the analytics tracking
};

export default GoogleAnalytics;
