import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface DocumentTitleProps {
  children?: React.ReactNode;
}

// Maps routes to page titles
const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/packages': 'Packages',
  '/billing': 'Billing',
  '/tickets': 'Support Tickets',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
  '/auth': 'Login',
};

export function DocumentTitle({ children }: DocumentTitleProps) {
  const [location] = useLocation();
  const [companyName, setCompanyName] = useState('');
  
  // Fetch company name from API
  useEffect(() => {
    fetch('/api/settings/branding')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch branding settings');
      })
      .then(data => {
        setCompanyName(data.company_name || 'VirtFusion Client Portal');
      })
      .catch(error => {
        console.error('Error fetching company name:', error);
        setCompanyName('VirtFusion Client Portal');
      });
  }, []);
  
  // Update document title when location or company name changes
  useEffect(() => {
    if (!companyName) return;
    
    // Get the route title or use a default
    const baseTitle = routeTitles[location] || 'Client Portal';
    
    // Set the document title with the company name
    document.title = `${baseTitle} | ${companyName}`;
  }, [location, companyName]);

  return <>{children}</>;
}

export default DocumentTitle;