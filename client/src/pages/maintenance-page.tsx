import { useState, useEffect } from 'react';
import { AlertCircle, MessageSquare, Activity } from 'lucide-react';
import { getBrandColors, BrandColorsResult } from '@/lib/brand-theme';

interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  estimatedCompletion: string | null;
}

/**
 * Enhanced Maintenance Page component that fetches real maintenance status
 * and provides admin access through token validation
 * Uses the brand theme system for consistent styling
 */
export function MaintenancePage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>({
    enabled: true,
    message: 'System is currently under maintenance.',
    estimatedCompletion: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Initialize brand theme colors
  const [brandColors, setBrandColors] = useState<BrandColorsResult>(getBrandColors());
  
  // Fetch settings including brand colors and maintenance status when component mounts
  useEffect(() => {
    async function fetchSettings() {
      try {
        // Fetch settings to get brand colors
        const settingsResponse = await fetch('/api/admin/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          
          // Extract brand colors from settings
          const brandColorOptions = {
            primaryColor: getSettingValue(settingsData, "primary_color", "2563eb"),
            secondaryColor: getSettingValue(settingsData, "secondary_color", "10b981"),
            accentColor: getSettingValue(settingsData, "accent_color", "f59e0b")
          };
          
          // Update brand colors
          setBrandColors(getBrandColors(brandColorOptions));
        }
        
        // Fetch maintenance status
        const response = await fetch('/api/maintenance/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    }
    
    fetchSettings();
  }, []);
  
  // Helper function to get setting value with proper type safety
  function getSettingValue(settings: any, key: string, defaultValue: string = ""): string {
    if (!settings || !Array.isArray(settings)) {
      return defaultValue;
    }
    
    const setting = settings.find((s: any) => s.key === key);
    return setting ? setting.value : defaultValue;
  }
  
  // Function to handle form submission for token validation
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    if (!token || token.trim() === '') {
      setError('Please enter a maintenance token');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate via API, which will set the cookie
      const response = await fetch('/api/maintenance/token/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.trim() }),
        // Include credentials to ensure cookies are sent/received
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Token validated successfully! Redirecting...');
        
        // The cookie has been set, so redirect to home
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        // API validation failed
        setError(data.message || 'Invalid maintenance token');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Failed to validate token. Please try again.');
      setIsLoading(false);
    }
  }
  
  // Button style using brand colors
  const buttonStyle = (isLoading: boolean) => ({
    width: '100%',
    padding: '0.5rem 1rem',
    backgroundColor: isLoading ? `${brandColors.primary.full}80` : brandColors.primary.full,
    color: 'white',
    borderRadius: '0.375rem',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    border: 'none',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.7 : 1,
    transition: 'background-color 0.2s, opacity 0.2s',
  });
  
  // Link button style using brand colors
  const linkButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    border: `1px solid ${brandColors.primary.medium}`,
    borderRadius: '0.375rem',
    textDecoration: 'none',
    color: brandColors.primary.dark,
    fontWeight: '500',
    fontSize: '0.875rem',
    transition: 'background-color 0.2s',
    backgroundColor: 'white',
  };
  
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem', color: brandColors.primary.dark }}>System Maintenance</h1>
        
        <div style={{ margin: '2rem 0', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={brandColors.primary.full} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>
        
        <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>{status.message}</p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Estimated completion: {status.estimatedCompletion || 'as soon as possible'}
        </p>
        
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: brandColors.primary.dark }}>Administrator Access</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Enter your maintenance token to access the system during maintenance</p>
          </div>
          
          {error && (
            <div style={{ 
              backgroundColor: '#fee2e2', 
              color: '#b91c1c', 
              padding: '0.75rem', 
              borderRadius: '0.375rem',
              marginBottom: '1rem', 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div style={{ 
              backgroundColor: '#dcfce7', 
              color: '#15803d', 
              padding: '0.75rem', 
              borderRadius: '0.375rem',
              marginBottom: '1rem', 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={16} />
              <span>{success}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <label htmlFor="tokenInput" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem', color: brandColors.primary.dark }}>
                Maintenance Token
              </label>
              <input
                id="tokenInput"
                type="text"
                placeholder="Enter maintenance token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${brandColors.primary.border}`,
                  borderRadius: '0.375rem',
                  boxSizing: 'border-box',
                  backgroundColor: isLoading ? '#f9fafb' : 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  ':focus': {
                    borderColor: brandColors.primary.full
                  }
                }}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              style={buttonStyle(isLoading)}
            >
              {isLoading ? 'Validating...' : 'Access System'}
            </button>
          </form>
        </div>
        
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
          <div className="links" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem', 
            alignItems: 'center', 
            marginBottom: '1.5rem'
          }}>
            <a 
              href="/discord" 
              style={linkButtonStyle}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = brandColors.primary.lighter;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <MessageSquare size={18} />
              Join Discord for Updates
            </a>
            
            <a 
              href="https://status.skyvps360.xyz" 
              target="_blank"
              rel="noopener noreferrer" 
              style={linkButtonStyle}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = brandColors.primary.lighter;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <Activity size={18} />
              Status Page
            </a>
          </div>
          
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            <p>Our team is working to complete maintenance as quickly as possible.</p>
            <p style={{ marginTop: '0.5rem' }}>Thank you for your patience.</p>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          
          @media (min-width: 640px) {
            .links {
              flex-direction: row;
              justify-content: center;
            }
          }
        `
      }} />
    </div>
  );
}