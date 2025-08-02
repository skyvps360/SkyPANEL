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

  // Fetch Google Analytics settings
  const { data: gaSettings } = useQuery<GoogleAnalyticsSettings>({
    queryKey: ['google-analytics-settings'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/settings/google-analytics/config');
      return response.data;
    },
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds to get latest settings
  });

  useEffect(() => {
    const loadGoogleAnalytics = async () => {
      try {
        // Get Google Analytics settings
        const response = await axios.get('/api/admin/settings/google-analytics/config');
        const settings = response.data;

        if (settings.enabled) {
          // Check if script is already loaded
          if (document.getElementById('ga-script-loader')) {
            setScriptLoaded(true);
            return;
          }

          // If custom code is provided, use that instead of Measurement ID
          if (settings.customCode && settings.customCode.trim()) {
            // Create a script element with the custom code
            const script = document.createElement('script');
            script.id = 'ga-script-loader';
            script.innerHTML = settings.customCode;
            document.head.appendChild(script);
            
            setScriptLoaded(true);
            console.log('Google Analytics custom code loaded successfully');
            return;
          }

          // Fall back to Measurement ID approach
          if (settings.measurementId) {
            // 1️⃣ Inline configuration script
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

            // 2️⃣ External GA loader
            const gaScript = document.createElement("script");
            gaScript.id = "ga-script";
            gaScript.async = true;
            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${settings.measurementId}`;

            // Append scripts in the same order as the official snippet: loader first, config second
            document.head.appendChild(gaScript);
            document.head.appendChild(inlineScript);

            setScriptLoaded(true);
            console.log('Google Analytics script loaded successfully');
          }
        }
      } catch (error) {
        console.error('Error loading Google Analytics settings:', error);
      }
    };

    loadGoogleAnalytics();

    // Cleanup function
    return () => {
      const existingScript = document.getElementById('ga-script-loader');
      const existingInlineScript = document.getElementById('ga-inline-config');
      const existingGaScript = document.getElementById('ga-script');
      
      if (existingScript) {
        existingScript.remove();
      }
      if (existingInlineScript) {
        existingInlineScript.remove();
      }
      if (existingGaScript) {
        existingGaScript.remove();
      }
    };
  }, []);

  // Don't render anything if Google Analytics is not enabled
  if (!gaSettings?.enabled) {
    return null;
  }

  return null; // The script handles the analytics tracking
};

export default GoogleAnalytics;
