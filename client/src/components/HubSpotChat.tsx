import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface HubSpotSettings {
  enabled: boolean;
  chatEnabled: boolean;
  portalId: string;
}

export const HubSpotChat: React.FC = () => {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Fetch HubSpot settings
  const { data: hubspotSettings } = useQuery<HubSpotSettings>({
    queryKey: ['hubspot-settings'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/settings/hubspot/config');
      return response.data;
    },
    enabled: false, // We'll enable this when needed
  });

  useEffect(() => {
    const loadHubSpotScript = async () => {
      try {
        // Get HubSpot settings
        const response = await axios.get('/api/admin/settings/hubspot/config');
        const settings = response.data;

        if (settings.enabled && settings.chatEnabled && settings.portalId) {
          // Check if script is already loaded
          if (document.getElementById('hs-script-loader')) {
            setScriptLoaded(true);
            return;
          }

          // Create and load the HubSpot script
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.id = 'hs-script-loader';
          script.async = true;
          script.defer = true;
          script.src = `//js-na3.hs-scripts.com/${settings.portalId}.js`;
          
          script.onload = () => {
            setScriptLoaded(true);
            console.log('HubSpot script loaded successfully');
          };
          
          script.onerror = () => {
            console.error('Failed to load HubSpot script');
          };

          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('Error loading HubSpot settings:', error);
      }
    };

    loadHubSpotScript();

    // Cleanup function
    return () => {
      const existingScript = document.getElementById('hs-script-loader');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Don't render anything if HubSpot is not enabled or chat is disabled
  if (!hubspotSettings?.enabled || !hubspotSettings?.chatEnabled) {
    return null;
  }

  return null; // The script handles the chat widget display
};

export default HubSpotChat; 