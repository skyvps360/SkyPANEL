import {useEffect, useState} from "react";
import {useLocation} from "wouter";

// Component to handle maintenance mode redirects
export function MaintenanceGuard({children}: { children: React.ReactNode }) {
    const [location, setLocation] = useLocation();
    const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [bypassGranted, setBypassGranted] = useState<boolean>(false);

    // Check if a bypass token exists in localStorage, URL, or cookie
    useEffect(() => {
        // Check if the maintenance_bypass cookie is already set
        const cookies = document.cookie.split(';').map(cookie => cookie.trim());
        const maintenanceBypassCookie = cookies.find(cookie => cookie.startsWith('maintenance_bypass='));

        if (maintenanceBypassCookie) {
            console.log('Maintenance bypass cookie already exists');
            setBypassGranted(true);
            return;
        }

        // Check for bypass token in localStorage
        const savedBypassToken = localStorage.getItem('maintenanceBypassToken');

        // Check for URL token parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        // If either token exists, validate it
        if (savedBypassToken || urlToken) {
            const tokenToValidate = urlToken || savedBypassToken;

            // Call the API to validate the token
            fetch('/api/maintenance/token/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({token: tokenToValidate}),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // If token is valid, grant bypass and save to localStorage
                        console.log('Maintenance bypass granted via token validation');
                        setBypassGranted(true);
                        if (tokenToValidate) {
                            localStorage.setItem('maintenanceBypassToken', tokenToValidate);
                        }

                        // If there was a token in the URL, remove it to clean the URL
                        if (urlToken) {
                            const cleanUrl = window.location.pathname;
                            window.history.replaceState({}, document.title, cleanUrl);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error validating maintenance token:', error);
                });
        }
    }, []);

    // Allowed paths during maintenance (don't redirect these)
    const allowedPaths = [
        '/maintenance',         // The maintenance page itself
        '/',                    // Landing page should be accessible
        '/tos',                 // Terms of Service page
        '/privacy',             // Privacy Policy page
        '/api/maintenance',     // API endpoints for maintenance
        '/blog',                // Public blog listing
        '/docs',                // Public documentation
        '/status',              // Status page
    ];

    // Check if current path is allowed during maintenance
    const isPathAllowed = () => {
        // Always allow the home page (exact match only)
        if (location === '/' || location === '' || location === '/index.html') {
            console.log('Home page access allowed during maintenance');
            return true;
        }

        // Always allow the maintenance page itself and any variants with query params
        if (location === '/maintenance' || location.startsWith('/maintenance')) {
            console.log('Maintenance page access allowed');
            return true;
        }

        // Direct match for exact paths
        if (allowedPaths.includes(location)) {
            console.log(`Path ${location} is explicitly allowed during maintenance`);
            return true;
        }

        // Prefix match for subpaths
        const isAllowed = allowedPaths.some(path => path !== '/' && location.startsWith(path)) ||
            location.startsWith('/blog/') ||
            location.startsWith('/docs/');

        if (isAllowed) {
            console.log(`Path ${location} is allowed during maintenance due to prefix match`);
        } else {
            console.log(`Path ${location} is not allowed during maintenance`);
        }

        return isAllowed;
    };

    // Check user role
    useEffect(() => {
        async function checkUser() {
            try {
                const response = await fetch('/api/user');
                if (response.ok) {
                    const user = await response.json();
                    setIsAdmin(user?.role === 'admin');
                }
            } catch (error) {
                console.error('Error checking user:', error);
            }
        }

        checkUser();
    }, []);

    // Check maintenance status when component mounts or location changes
    useEffect(() => {
        let isMounted = true;

        async function checkMaintenanceStatus() {
            try {
                const response = await fetch('/api/maintenance/status');
                if (!isMounted) return;

                if (response.ok) {
                    const data = await response.json();
                    setIsMaintenanceMode(data.enabled);

                    // If maintenance is enabled and we're not on an allowed path,
                    // redirect to maintenance page (unless user is admin)
                    if (data.enabled && !isPathAllowed() && !isAdmin && !bypassGranted && location !== '/maintenance') {
                        setLocation('/maintenance');
                    }
                }
            } catch (error) {
                console.error('Error checking maintenance status:', error);
            }
        }

        checkMaintenanceStatus();

        // Cleanup function to prevent state updates after unmount
        return () => {
            isMounted = false;
        };
    }, [location, isAdmin, bypassGranted]);

    // If still loading maintenance status, show loading spinner
    if (isMaintenanceMode === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-lg text-gray-700">Loading...</p>
            </div>
        );
    }

    // Render children if not in maintenance mode or user is admin or on allowed path
    return <>{children}</>;
}