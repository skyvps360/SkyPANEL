import {useEffect} from "react";
import {queryClient} from "@/lib/queryClient";

export function BrandThemeProvider({children}: { children: React.ReactNode }) {
    const {data: brandingData} = queryClient.getQueryState<any>(["/api/settings/branding"]) || {};

    // Apply brand theme on mount and when branding data changes
    useEffect(() => {
        if (brandingData && brandingData.primary_color) {
            // Import dynamically to avoid circular dependencies
            import('@/lib/brand-theme').then(({applyBrandColorVars}) => {
                applyBrandColorVars({
                    primaryColor: brandingData.primary_color || '',
                    secondaryColor: brandingData.secondary_color || '',
                    accentColor: brandingData.accent_color || '',
                });
            });
        }
    }, [
        brandingData?.primary_color,
        brandingData?.secondary_color,
        brandingData?.accent_color
    ]);

    return <>{children}</>;
}