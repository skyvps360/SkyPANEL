import { useState, useEffect } from 'react';
import { AlertCircle, MessageSquare, Activity, ExternalLink, Settings, Clock, Shield, Wrench } from 'lucide-react';
import { getBrandColors, BrandColorsResult } from '@/lib/brand-theme';
import HubSpotChat from '@/components/HubSpotChat';

interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  estimatedCompletion: string | null;
}

interface BrandingSettings {
  company_name?: string;
  primary_color?: string;
  secondary_color?: string;
  company_color?: string;
  accent_color?: string;
}

interface VirtFusionSettings {
  virtfusion_api_url?: string;
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
  const [virtfusionUrl, setVirtfusionUrl] = useState<string | null>(null);

  // Initialize brand theme colors
  const [brandColors, setBrandColors] = useState<BrandColorsResult>(getBrandColors());

  // Fetch settings including brand colors and maintenance status when component mounts
  useEffect(() => {
    async function fetchSettings() {
      try {
        // Fetch branding settings using the newer branding API endpoint
        const brandingResponse = await fetch('/api/settings/branding');
        if (brandingResponse.ok) {
          const brandingData: BrandingSettings = await brandingResponse.json();

          // Extract brand colors from branding settings
          const brandColorOptions = {
            primaryColor: brandingData.primary_color || brandingData.company_color || "2563eb",
            secondaryColor: brandingData.secondary_color || "10b981",
            accentColor: brandingData.accent_color || "f59e0b"
          };

          // Update brand colors
          setBrandColors(getBrandColors(brandColorOptions));
        }

        // Fetch VirtFusion settings to get the panel URL from public settings
        const settingsResponse = await fetch('/api/settings/public');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          const virtfusionApiUrl = getPublicSettingValue(settingsData, "virtfusion_api_url", "");

          if (virtfusionApiUrl) {
            // Convert API URL to panel URL by removing /api/v1 suffix
            let panelUrl = virtfusionApiUrl;
            if (panelUrl.endsWith('/api/v1')) {
              panelUrl = panelUrl.replace('/api/v1', '');
            }
            setVirtfusionUrl(panelUrl);
          }
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

  // Helper function to get public setting value (different format)
  function getPublicSettingValue(settings: any, key: string, defaultValue: string = ""): string {
    if (!settings || typeof settings !== 'object') {
      return defaultValue;
    }

    return settings[key] || defaultValue;
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



  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${brandColors.primary.full}15 0%, ${brandColors.secondary.full}10 100%)`,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Main Content Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: `1px solid ${brandColors.primary.full}20`
        }}>
          {/* Header Section */}
          <div style={{
            background: `linear-gradient(135deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`,
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `radial-gradient(circle at 20% 50%, ${brandColors.primary.light}30 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${brandColors.primary.light}30 0%, transparent 50%)`,
              pointerEvents: 'none'
            }} />

            {/* Animated Icon */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '120px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                animation: 'maintenancePulse 3s ease-in-out infinite'
              }}>
                <Settings
                  size={48}
                  style={{
                    animation: 'maintenanceRotate 4s linear infinite',
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
                  }}
                />
              </div>
            </div>

            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              zIndex: 1
            }}>
              System Maintenance
            </h1>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              zIndex: 1
            }}>
              <p style={{
                fontSize: '1.125rem',
                marginBottom: '0.75rem',
                fontWeight: '500'
              }}>
                {status.message}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                opacity: 0.9
              }}>
                <Clock size={16} />
                <span>
                  Estimated completion: {status.estimatedCompletion || 'as soon as possible'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{
            padding: '2rem',
            display: 'grid',
            gap: '2rem'
          }}>

            {/* VirtFusion Direct Access - Most Prominent */}
            {virtfusionUrl && (
              <div style={{
                background: `linear-gradient(135deg, ${brandColors.primary.full}08 0%, ${brandColors.secondary.full}05 100%)`,
                border: `2px solid ${brandColors.primary.full}20`,
                borderRadius: '1rem',
                padding: '2rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-50%',
                  width: '200%',
                  height: '200%',
                  background: `radial-gradient(circle, ${brandColors.primary.full}05 0%, transparent 70%)`,
                  pointerEvents: 'none'
                }} />

                <div style={{
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    backgroundColor: brandColors.primary.full,
                    borderRadius: '50%',
                    marginBottom: '1.5rem',
                    boxShadow: `0 8px 32px ${brandColors.primary.full}40`
                  }}>
                    <ExternalLink size={32} color="white" />
                  </div>

                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: brandColors.primary.dark
                  }}>
                    Continue Managing Your Servers
                  </h2>

                  <p style={{
                    color: '#6b7280',
                    fontSize: '1rem',
                    marginBottom: '2rem',
                    lineHeight: '1.6'
                  }}>
                    Access your servers directly through VirtFusion during maintenance.
                    All server management features remain fully available.
                  </p>

                  <a
                    href={virtfusionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem 2rem',
                      backgroundColor: brandColors.primary.full,
                      color: 'white',
                      borderRadius: '0.75rem',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease',
                      boxShadow: `0 4px 16px ${brandColors.primary.full}40`,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = brandColors.primary.dark;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${brandColors.primary.full}50`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = brandColors.primary.full;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 16px ${brandColors.primary.full}40`;
                    }}
                  >
                    <ExternalLink size={20} />
                    Access VirtFusion Panel
                  </a>
                </div>
              </div>
            )}

            {/* Administrator Access Section */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '1rem',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  backgroundColor: brandColors.primary.full,
                  borderRadius: '0.75rem'
                }}>
                  <Shield size={24} color="white" />
                </div>
                <div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '0.25rem',
                    color: brandColors.primary.dark
                  }}>
                    Administrator Access
                  </h2>
                  <p style={{
                    color: '#64748b',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Enter your maintenance token to access the system during maintenance
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '50%'
                  }}>
                    <AlertCircle size={16} color="#dc2626" />
                  </div>
                  <span style={{
                    color: '#dc2626',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {error}
                  </span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '50%'
                  }}>
                    <AlertCircle size={16} color="#16a34a" />
                  </div>
                  <span style={{
                    color: '#16a34a',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {success}
                  </span>
                </div>
              )}

              {/* Token Form */}
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label
                    htmlFor="tokenInput"
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      color: brandColors.primary.dark
                    }}
                  >
                    Maintenance Token
                  </label>
                  <input
                    id="tokenInput"
                    type="text"
                    placeholder="Enter your maintenance token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      fontSize: '1rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      boxSizing: 'border-box',
                      backgroundColor: isLoading ? '#f8fafc' : 'white',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = brandColors.primary.full;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColors.primary.full}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    backgroundColor: isLoading ? `${brandColors.primary.full}80` : brandColors.primary.full,
                    color: 'white',
                    borderRadius: '0.75rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: `0 4px 16px ${brandColors.primary.full}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = brandColors.primary.dark;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${brandColors.primary.full}40`;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = brandColors.primary.full;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 16px ${brandColors.primary.full}30`;
                    }
                  }}
                >
                  {isLoading && (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                  {isLoading ? 'Validating...' : 'Access System'}
                </button>
              </form>
            </div>

            {/* Quick Links Section */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '1rem',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  backgroundColor: brandColors.secondary.full,
                  borderRadius: '0.75rem'
                }}>
                  <Activity size={24} color="white" />
                </div>
                <div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '0.25rem',
                    color: brandColors.primary.dark
                  }}>
                    Stay Updated
                  </h2>
                  <p style={{
                    color: '#64748b',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Get real-time updates and support during maintenance
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <a
                  href="/discord"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    textDecoration: 'none',
                    color: '#374151',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    backgroundColor: 'white'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = brandColors.primary.full;
                    e.currentTarget.style.backgroundColor = `${brandColors.primary.full}05`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#5865f2',
                    borderRadius: '0.5rem'
                  }}>
                    <MessageSquare size={16} color="white" />
                  </div>
                  <span>Join Discord for Updates</span>
                </a>

                <a
                  href="https://status.skyvps360.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    textDecoration: 'none',
                    color: '#374151',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    backgroundColor: 'white'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = brandColors.secondary.full;
                    e.currentTarget.style.backgroundColor = `${brandColors.secondary.full}05`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: brandColors.secondary.full,
                    borderRadius: '0.5rem'
                  }}>
                    <Activity size={16} color="white" />
                  </div>
                  <span>Status Page</span>
                </a>
              </div>
            </div>

            {/* Footer Message */}
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#64748b',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                backgroundColor: `${brandColors.primary.full}10`,
                borderRadius: '50%',
                marginBottom: '1rem'
              }}>
                <Wrench size={20} color={brandColors.primary.full} />
              </div>
              <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                Our team is working to complete maintenance as quickly as possible.
              </p>
              <p style={{ margin: 0 }}>
                Thank you for your patience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes maintenancePulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
            }
          }

          @keyframes maintenanceRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Responsive Design */
          @media (max-width: 768px) {
            .maintenance-card {
              margin: 0.5rem;
              border-radius: 0.75rem;
            }

            .maintenance-header {
              padding: 2rem 1.5rem !important;
            }

            .maintenance-content {
              padding: 1.5rem !important;
            }

            .maintenance-title {
              font-size: 2rem !important;
            }

            .virtfusion-section {
              padding: 1.5rem !important;
            }

            .admin-section {
              padding: 1.5rem !important;
            }

            .links-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 480px) {
            .maintenance-title {
              font-size: 1.75rem !important;
            }

            .maintenance-icon {
              width: 80px !important;
              height: 80px !important;
            }

            .maintenance-icon svg {
              width: 32px !important;
              height: 32px !important;
            }
          }
        `
      }} />
      <HubSpotChat />
      {/* GoogleAnalytics is loaded globally in App.tsx */}
    </div>
  );
}