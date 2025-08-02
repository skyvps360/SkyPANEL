import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLocation } from 'wouter';

interface GoogleAnalyticsSettings {
  enabled: boolean;
  measurementId: string;
  enhancedEcommerce: boolean;
  enabledPages: string[];
}

export const GoogleAnalytics: React.FC = () => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [location] = useLocation();

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

        // Check if Google Analytics is enabled and if the current page should have it
        if (settings.enabled) {
          // Check if current page is in the enabled pages list
          const currentPath = location;
          const enabledPages = settings.enabledPages || [];
          
          console.log(`Checking Google Analytics for page: ${currentPath}`);
          console.log(`Enabled pages:`, enabledPages);
          
          const isPageEnabled = enabledPages.some((enabledPage: string) => {
            // Exact match
            if (enabledPage === currentPath) {
              console.log(`Exact match found for: ${enabledPage}`);
              return true;
            }
            
            // Wildcard match (if page ends with *)
            if (enabledPage.endsWith('*')) {
              const pattern = enabledPage.slice(0, -1);
              if (currentPath.startsWith(pattern)) {
                console.log(`Wildcard match found for: ${enabledPage}`);
                return true;
              }
            }
            
            // Prefix match (for nested routes) - only if it's not just "/"
            if (enabledPage.endsWith('/') && enabledPage !== '/') {
              if (currentPath.startsWith(enabledPage)) {
                console.log(`Prefix match found for: ${enabledPage}`);
                return true;
              }
            }
            
            return false;
          });

          if (!isPageEnabled) {
            console.log(`Google Analytics disabled for page: ${currentPath}`);
            return;
          }

          console.log(`Google Analytics enabled for page: ${currentPath}`);
          
          // Check if any GA script is already loaded to prevent duplicates
          if (document.getElementById('ga-script') || 
              document.getElementById('ga-inline-config')) {
            console.log('Google Analytics script already loaded');
            setScriptLoaded(true);
            return;
          }

          // Load Google Analytics using Measurement ID
          if (settings.measurementId) {
            console.log(`Loading Google Analytics with measurement ID: ${settings.measurementId}`);
            
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
      const existingInlineScript = document.getElementById('ga-inline-config');
      const existingGaScript = document.getElementById('ga-script');
      
      if (existingInlineScript) {
        existingInlineScript.remove();
      }
      if (existingGaScript) {
        existingGaScript.remove();
      }
    };
  }, [location]); // Add location to dependency array so it runs on page changes

  return null; // The script handles the analytics tracking
};

export default GoogleAnalytics;
