import {useEffect, useMemo} from "react";
import {useQuery} from "@tanstack/react-query";

export function BrandThemeProvider({children}: { children: React.ReactNode }) {
    // Use proper useQuery hook instead of queryClient.getQueryState to avoid infinite re-renders
    const {data: brandingData} = useQuery<{
        primary_color?: string;
        secondary_color?: string;
        accent_color?: string;
        company_color?: string;
    }>({
        queryKey: ["/api/settings/branding"],
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // Memoize the brand color options to prevent unnecessary re-renders
    const brandColorOptions = useMemo(() => ({
        primaryColor: brandingData?.primary_color || brandingData?.company_color || '',
        secondaryColor: brandingData?.secondary_color || '',
        accentColor: brandingData?.accent_color || '',
    }), [
        brandingData?.primary_color,
        brandingData?.company_color,
        brandingData?.secondary_color,
        brandingData?.accent_color
    ]);

    // Apply brand theme on mount and when branding data changes
    useEffect(() => {
        if (brandColorOptions.primaryColor) {
            // Import dynamically to avoid circular dependencies
            import('@/lib/brand-theme').then(({applyBrandColorVars}) => {
                applyBrandColorVars(brandColorOptions);
            });
        }
    }, [brandColorOptions]);

    return <>{children}</>;
}