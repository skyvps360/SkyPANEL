import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { getBrandColors } from "@/lib/brand-theme";
import {
  CheckCircle,
  Server,
  Wifi,
  ExternalLink,
  Info,
  ArrowRight,
  MapPin,
  Radio,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles/leaflet-overrides.css";

// Define datacenter location type
interface DatacenterLocation {
  id: number;
  name: string;
  code: string;
  city: string;
  country: string;
  regionName: string;
  regionCode: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  status?: string;
  isComingSoon?: boolean;
  displayOrder: number;
  uptime?: number;
  networkSpeedMbps?: number;
  description?: string;
  address?: string;
  provider?: string;
  tier?: string;
  features?: string[];
}

// Fix for Leaflet icon images
// This is needed because Leaflet's default marker icons have relative URLs that don't work in the build
// Custom marker icons for different datacenter statuses
const createCustomIcon = (
  status: string | undefined, 
  isDark: boolean,
  brandColors?: any
) => {
  // Base SVG with different colors for different statuses
  let iconColor;

  // Determine color based on status and brand colors if available
  if (status === "active") {
    // Use primary color from brand theme if available, or fallback to green
    iconColor = brandColors?.primary?.full || "#84cc16";
  } else if (status === "coming_soon") {
    // Use secondary color from brand theme if available, or fallback to yellow
    iconColor = brandColors?.secondary?.full || "#facc15";
  } else {
    // Use slate gray for inactive
    iconColor = "#94a3b8";
  }

  // Create SVG data URL with the appropriate color
  const svgBase64 = btoa(
    `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12" fill="${iconColor}" fill-opacity="0.8"/><circle cx="16" cy="16" r="6" fill="${iconColor}"/></svg>`,
  );

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${svgBase64}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// New datacenter map with Leaflet implementation
export function DatacenterLeafletMap() {
  const [selectedLocation, setSelectedLocation] =
    useState<DatacenterLocation | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<number | null>(
    null,
  );
  const { isDark } = useTheme();
  const [, navigate] = useLocation();

  // Fetch all datacenter locations
  const { data: locations = [], isLoading } = useQuery<DatacenterLocation[]>({
    queryKey: ["/api/datacenter-locations"],
  });

  // Fetch branding settings
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    company_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  // Generate brand colors using the brand theme system
  const brandColors = useMemo(() => {
    return getBrandColors({
      primaryColor: brandingData?.primary_color || brandingData?.company_color,
      secondaryColor: brandingData?.secondary_color,
      accentColor: brandingData?.accent_color
    });
  }, [brandingData]);

  // Helper function to determine status for legacy data format
  const getLocationStatus = (location: DatacenterLocation): string => {
    // If status is directly provided, use it
    if (location.status) {
      return location.status;
    }
    // Fall back to legacy format
    if (location.isComingSoon) {
      return "coming_soon";
    }
    return location.isActive ? "active" : "inactive";
  };

  // Create custom icons for different status types
  const activeIcon = useMemo(
    () => createCustomIcon("active", isDark, brandColors),
    [isDark, brandColors],
  );
  const comingSoonIcon = useMemo(
    () => createCustomIcon("coming_soon", isDark, brandColors),
    [isDark, brandColors],
  );
  const inactiveIcon = useMemo(
    () => createCustomIcon("inactive", isDark, brandColors),
    [isDark, brandColors],
  );

  // Group locations by region
  const locationsByRegion = locations.reduce(
    (acc, location) => {
      const region = location.regionName;
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region].push(location);
      return acc;
    },
    {} as Record<string, DatacenterLocation[]>,
  );

  // Sort regions based on order
  const regionOrder = [
    "North America",
    "Europe",
    "Asia Pacific",
    "South America",
    "Africa",
    "Australia",
  ];
  const sortedRegions = Object.keys(locationsByRegion).sort(
    (a, b) => regionOrder.indexOf(a) - regionOrder.indexOf(b),
  );

  const handleLocationClick = (location: DatacenterLocation) => {
    setSelectedLocation(location);
  };

  const handleLocationHover = (locationId: number | null) => {
    setHoveredLocationId(locationId);
  };

  // Calculate map bounds to ensure all datacenters are visible
  const getBounds = useMemo(() => {
    if (locations.length === 0) return undefined;

    const bounds = L.latLngBounds(
      locations.map((loc) => [loc.latitude, loc.longitude]),
    );

    // Add some padding to the bounds
    return bounds.pad(0.1);
  }, [locations]);

  return (
    <div>
      <div className="relative w-full overflow-hidden border rounded-lg border-gray-200 shadow-md">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[450px] bg-gray-50">
            <div className="flex flex-col items-center">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
              <p className="text-sm text-gray-500">
                Loading datacenter locations...
              </p>
            </div>
          </div>
        ) : locations.length === 0 ? (
          <div className="flex items-center justify-center min-h-[450px] bg-gray-50">
            <div className="flex flex-col items-center">
              <Info className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-gray-600">
                No datacenter locations available.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Datacenter List Panel */}
            <div className="md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Datacenter Locations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select a location to view details
                </p>
              </div>
              <ScrollArea className="h-[400px] md:h-[350px]">
                <div className="p-2">
                  {sortedRegions.map((region) => (
                    <div key={region} className="mb-4">
                      <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-md mb-2">
                        {region}
                      </div>
                      {locationsByRegion[region].map((location) => (
                        <div
                          key={location.id}
                          style={
                            selectedLocation?.id === location.id
                              ? brandColors?.primary?.hex 
                                ? { backgroundColor: `rgba(${parseInt(brandColors.primary.hex.substring(0,2), 16)}, ${parseInt(brandColors.primary.hex.substring(2,4), 16)}, ${parseInt(brandColors.primary.hex.substring(4,6), 16)}, 0.2)` } 
                                : { backgroundColor: 'rgba(var(--primary), 0.2)' }
                              : hoveredLocationId === location.id
                                ? brandColors?.primary?.hex 
                                  ? { backgroundColor: `rgba(${parseInt(brandColors.primary.hex.substring(0,2), 16)}, ${parseInt(brandColors.primary.hex.substring(2,4), 16)}, ${parseInt(brandColors.primary.hex.substring(4,6), 16)}, 0.1)` } 
                                  : { backgroundColor: 'rgba(var(--primary), 0.1)' }
                                : undefined
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer mb-1 transition-colors",
                            !hoveredLocationId && !selectedLocation?.id && brandColors?.primary?.hex
                              ? `hover:bg-[#${brandColors.primary.hex}]/10`
                              : !hoveredLocationId && !selectedLocation?.id 
                                ? "hover:bg-primary/10"
                                : ""
                          )}
                          onClick={() => handleLocationClick(location)}
                          onMouseEnter={() => handleLocationHover(location.id)}
                          onMouseLeave={() => handleLocationHover(null)}
                        >
                          <div className="relative">
                            <MapPin
                              className={cn(
                                "w-4 h-4",
                                getLocationStatus(location) === "active"
                                  ? brandColors?.primary?.hex ? `text-[#${brandColors.primary.hex}]` : "text-primary"
                                  : getLocationStatus(location) === "coming_soon"
                                    ? brandColors?.secondary?.hex ? `text-[#${brandColors.secondary.hex}]` : "text-yellow-500"
                                    : "text-slate-400",
                              )}
                            />
                            {getLocationStatus(location) === "active" && (
                              <span 
                                className="absolute -top-[2px] -right-[2px] w-2 h-2 rounded-full animate-pulse"
                                style={{ 
                                  backgroundColor: brandColors?.primary?.full || '' 
                                }}
                              ></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {location.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {location.city}, {location.country}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getLocationStatus(location) === "active"
                                ? brandColors?.primary?.hex 
                                  ? `bg-opacity-10 bg-[#${brandColors.primary.hex}] text-[#${brandColors.primary.hex}] dark:text-[#${brandColors.primary.hex}]` 
                                  : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : getLocationStatus(location) === "coming_soon"
                                  ? brandColors?.secondary?.hex 
                                    ? `bg-opacity-10 bg-[#${brandColors.secondary.hex}] text-[#${brandColors.secondary.hex}] dark:text-[#${brandColors.secondary.hex}]`  
                                    : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
                            )}
                          >
                            {location.code}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Leaflet Map */}
            <div className="md:w-2/3 lg:w-3/4 relative h-[300px] md:h-[400px]">
              <MapContainer
                bounds={getBounds}
                zoom={2}
                minZoom={2}
                maxZoom={10}
                zoomControl={false}
                style={{
                  height: "100%",
                  width: "100%",
                  background: isDark ? "#0f172a" : "#f1f5f9",
                }}
                attributionControl={false}
              >
                <ZoomControl position="bottomright" />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={
                    isDark
                      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  }
                />

                {locations.map((location) => {
                  // Get the appropriate icon based on status
                  const status = getLocationStatus(location);
                  const icon =
                    status === "active"
                      ? activeIcon
                      : status === "coming_soon"
                        ? comingSoonIcon
                        : inactiveIcon;

                  return (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                      icon={icon}
                      eventHandlers={{
                        click: () => handleLocationClick(location),
                        mouseover: () => handleLocationHover(location.id),
                        mouseout: () => handleLocationHover(null),
                      }}
                    >
                      <Popup className="leaflet-popup-higher">
                        <div className="text-center">
                          <h3 className="font-bold text-base">
                            {location.name}
                          </h3>
                          <div className="text-sm">
                            {location.city}, {location.country}
                          </div>
                          <div className="text-xs mt-1">
                            <Badge
                              variant={
                                status === "active" ? "default" : "outline"
                              }
                              className={cn(
                                status === "active"
                                  ? "bg-lime-500 text-white hover:bg-lime-600"
                                  : status === "coming_soon"
                                    ? "bg-yellow-50 text-yellow-600 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-slate-50 text-slate-500 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400",
                              )}
                            >
                              {status === "active"
                                ? "Active"
                                : status === "coming_soon"
                                  ? "Coming Soon"
                                  : "Inactive"}
                            </Badge>
                          </div>

                          {/* Datacenter details section */}
                          <div className="mt-3 border-t border-gray-200 pt-2">
                            {(location.provider ||
                              location.tier ||
                              location.address) && (
                              <div className="grid grid-cols-1 gap-1 text-left text-xs mb-2">
                                {location.provider && (
                                  <div className="flex">
                                    <span className="font-medium w-16">
                                      Provider:
                                    </span>
                                    <span className="text-gray-600">
                                      {location.provider}
                                    </span>
                                  </div>
                                )}
                                {location.tier && (
                                  <div className="flex">
                                    <span className="font-medium w-16">
                                      Tier:
                                    </span>
                                    <span className="text-gray-600">
                                      {location.tier}
                                    </span>
                                  </div>
                                )}
                                {location.address && (
                                  <div className="flex">
                                    <span className="font-medium w-16">
                                      Address:
                                    </span>
                                    <span className="text-gray-600">
                                      {location.address}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Description section */}
                            {location.description && (
                              <div className="mt-2">
                                <div className="text-left text-xs font-medium mb-1">
                                  Additional Information:
                                </div>
                                <ScrollArea className="h-[80px] w-[200px]">
                                  <div className="text-left text-xs text-gray-600 p-1">
                                    {location.description}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-16 right-3 bg-white dark:bg-gray-800 p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700 text-xs flex items-center gap-3 z-[5]">
                <div className="flex items-center gap-1">
                  <span 
                    className="inline-block w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: brandColors?.primary?.full || '#84cc16' 
                    }}
                  ></span>
                  <Badge
                    variant="default"
                    style={brandColors?.primary?.hex 
                      ? { backgroundColor: `#${brandColors.primary.hex}`, color: 'white' }
                      : { backgroundColor: '#84cc16', color: 'white' }
                    }
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span 
                    className="inline-block w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: brandColors?.secondary?.full || '#facc15' 
                    }}
                  ></span>
                  <Badge
                    variant="outline"
                    style={brandColors?.secondary?.hex
                      ? { 
                          backgroundColor: `rgba(${parseInt(brandColors.secondary.hex.substring(0,2), 16)}, ${parseInt(brandColors.secondary.hex.substring(2,4), 16)}, ${parseInt(brandColors.secondary.hex.substring(4,6), 16)}, 0.1)`,
                          color: `#${brandColors.secondary.hex}`,
                          borderColor: `#${brandColors.secondary.hex}`
                        }
                      : { 
                          backgroundColor: 'rgba(250, 204, 21, 0.1)',
                          color: '#b45309',
                          borderColor: '#facc15' 
                        }
                    }
                  >
                    Coming Soon
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-slate-400"></span>
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-500 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400"
                  >
                    Inactive
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Region Stats - Shows totals by region */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {!isLoading && locations.length > 0 && (
          <>
            {[
              {
                name: "North America",
                code: "NA",
                icon: <Globe className="w-5 h-5 text-black-500" />,
                abbr: "NA",
              },
              {
                name: "Europe",
                code: "EU",
                icon: <Server className="w-5 h-5 text-green-500" />,
                abbr: "EU",
              },
              {
                name: "Asia Pacific",
                code: "APAC",
                icon: <Wifi className="w-5 h-5 text-purple-500" />,
                abbr: "AP",
              },
              {
                name: "Global Network",
                code: "ALL",
                icon: <ExternalLink className="w-5 h-5 text-gray-500" />,
                abbr: "",
              },
            ].map((region) => {
              const regionLocations =
                region.code === "ALL"
                  ? locations
                  : locations.filter((l) => l.regionCode === region.code);

              // Count by status type
              const statuses = regionLocations.reduce(
                (acc, loc) => {
                  const status = getLocationStatus(loc);
                  acc[status] = (acc[status] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              );

              const activeCount = statuses.active || 0;
              const comingSoonCount = statuses.coming_soon || 0;
              const inactiveCount = statuses.inactive || 0;

              return (
                <Card
                  key={region.code}
                  className="group transition-all hover:border-primary/50"
                  style={
                    brandColors?.primary?.hex
                      ? { 
                          borderColor: 'transparent', 
                          transition: 'all 0.2s ease-in-out',
                        } 
                      : {}
                  }
                  onMouseOver={(e) => {
                    if (brandColors?.primary?.hex) {
                      e.currentTarget.style.borderColor = `#${brandColors.primary.hex}`;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (brandColors?.primary?.hex) {
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <CardContent 
                    className="p-4 flex justify-between items-center group-hover:bg-primary/5"
                    style={{}}
                    onMouseOver={(e) => {
                      if (brandColors?.primary?.hex) {
                        e.currentTarget.style.backgroundColor = `rgba(${parseInt(brandColors.primary.hex.substring(0,2), 16)}, ${parseInt(brandColors.primary.hex.substring(2,4), 16)}, ${parseInt(brandColors.primary.hex.substring(4,6), 16)}, 0.05)`;
                      }
                    }}
                    onMouseOut={(e) => {
                      if (brandColors?.primary?.hex) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        {region.abbr ? (
                          <span
                            className="font-bold text-sm"
                            style={{
                              color: brandColors?.primary?.hex
                                ? `#${brandColors.primary.hex}`
                                : region.code === "NA"
                                  ? "#3b82f6"
                                  : region.code === "EU"
                                    ? "#22c55e"
                                    : "#a855f7",
                            }}
                          >
                            {region.abbr}
                          </span>
                        ) : (
                          region.icon
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{region.name}</div>
                        <div className="text-xs space-y-1 mt-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColors?.primary?.full || '#84cc16' }}></div>
                            <span className="text-muted-foreground">
                              {activeCount} active
                            </span>
                          </div>
                          {comingSoonCount > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColors?.secondary?.full || '#facc15' }}></div>
                              <span className="text-muted-foreground">
                                {comingSoonCount} coming soon
                              </span>
                            </div>
                          )}
                          {inactiveCount > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                              <span className="text-muted-foreground">
                                {inactiveCount} inactive
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className={brandColors?.primary?.hex 
                      ? `w-4 h-4 text-[#${brandColors.primary.hex}] opacity-0 group-hover:opacity-100 transition-opacity` 
                      : "w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"} 
                    />
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Location Details Dialog */}
      <Dialog
        open={!!selectedLocation}
        onOpenChange={(open) => !open && setSelectedLocation(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[2000] mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className={brandColors?.primary?.hex ? `w-5 h-5 text-[#${brandColors.primary.hex}]` : "w-5 h-5 text-primary"} />
              <span>Datacenter Information</span>
            </DialogTitle>
            <DialogDescription>
              Details about our {selectedLocation?.name} datacenter
            </DialogDescription>
          </DialogHeader>

          {selectedLocation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedLocation.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedLocation.city}, {selectedLocation.country}
                  </p>
                </div>
                {/* Status badge with proper status handling */}
                <Badge
                  variant={
                    getLocationStatus(selectedLocation) === "active"
                      ? "default"
                      : "outline"
                  }
                  className={cn(
                    getLocationStatus(selectedLocation) === "active"
                      ? brandColors?.primary?.hex
                        ? `bg-[#${brandColors.primary.hex}] text-white hover:bg-[#${brandColors.primary.dark}]`
                        : "bg-lime-500 text-white hover:bg-lime-600"
                      : getLocationStatus(selectedLocation) === "coming_soon"
                        ? brandColors?.secondary?.hex
                          ? `bg-opacity-10 bg-[#${brandColors.secondary.hex}] text-[#${brandColors.secondary.hex}] border-[#${brandColors.secondary.hex}] dark:text-[#${brandColors.secondary.hex}]`
                          : "bg-yellow-50 text-yellow-600 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-slate-50 text-slate-500 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400",
                  )}
                >
                  {getLocationStatus(selectedLocation) === "active"
                    ? "Active"
                    : getLocationStatus(selectedLocation) === "coming_soon"
                      ? "Coming Soon"
                      : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Region
                  </div>
                  <div className="font-medium text-sm">
                    {selectedLocation.regionName} ({selectedLocation.regionCode}
                    )
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Location Code
                  </div>
                  <div className="font-medium text-sm">{selectedLocation.code}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Uptime
                  </div>
                  <div className="font-medium text-sm">
                    {selectedLocation.uptime || "99.9"}%
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Network Speed
                  </div>
                  <div className="font-medium text-sm">
                    {selectedLocation.networkSpeedMbps || 10000} Mbps
                  </div>
                </div>
                {selectedLocation.provider && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      Provider
                    </div>
                    <div className="font-medium text-sm">
                      {selectedLocation.provider}
                    </div>
                  </div>
                )}
                {selectedLocation.tier && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      Tier
                    </div>
                    <div className="font-medium text-sm">{selectedLocation.tier}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {selectedLocation.address && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      Address
                    </div>
                    <div className="text-sm">{selectedLocation.address}</div>
                  </div>
                )}

                {selectedLocation.description && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      About this location
                    </div>
                    <div className="text-sm max-h-20 overflow-y-auto">{selectedLocation.description}</div>
                  </div>
                )}

                {selectedLocation.features &&
                  selectedLocation.features.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-2">
                        Available Features
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedLocation.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs py-0.5 px-2">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border h-9 px-3 py-1 text-black hover:text-black hover:bg-gray-100"
                  style={{
                    borderColor: brandColors?.primary?.hex ? `#${brandColors.primary.hex}` : '#e2e8f0'
                  }}
                >
                  Close
                </button>
                {getLocationStatus(selectedLocation) === "active" && (
                  <Button
                    size="sm"
                    style={brandColors?.primary?.hex ? { backgroundColor: `#${brandColors.primary.hex}` } : {}}
                    onClick={() => navigate("/dashboard")}
                  >
                    Deploy to {selectedLocation.code}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple theme variant of the map for compact displays
export function SimpleDatacenterLeafletMap() {
  const { data: locations = [], isLoading } = useQuery<DatacenterLocation[]>({
    queryKey: ["/api/datacenter-locations"],
  });
  const { isDark } = useTheme();

  // Fetch branding settings
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    company_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  // Generate brand colors using the brand theme system
  const brandColors = useMemo(() => {
    return getBrandColors({
      primaryColor: brandingData?.primary_color || brandingData?.company_color,
      secondaryColor: brandingData?.secondary_color,
      accentColor: brandingData?.accent_color
    });
  }, [brandingData]);

  // Create marker icons
  // Create marker icons for each status (memoized to avoid recreating on each render)
  const activeIcon = useMemo(
    () => createCustomIcon("active", isDark, brandColors),
    [isDark, brandColors],
  );
  const comingSoonIcon = useMemo(
    () => createCustomIcon("coming_soon", isDark, brandColors),
    [isDark, brandColors],
  );
  const inactiveIcon = useMemo(
    () => createCustomIcon("inactive", isDark, brandColors),
    [isDark, brandColors],
  );

  // Helper function to determine status for legacy data format
  const getLocationStatus = (location: DatacenterLocation): string => {
    // If status is directly provided, use it
    if (location.status) {
      return location.status;
    }
    // Fall back to legacy format
    if (location.isComingSoon) {
      return "coming_soon";
    }
    return location.isActive ? "active" : "inactive";
  };

  // Count locations by region and status
  const locationCountsByRegion = locations.reduce(
    (acc, location) => {
      const region = location.regionName;
      const status = getLocationStatus(location);

      if (!acc[region]) {
        acc[region] = { total: 0, active: 0, comingSoon: 0, inactive: 0 };
      }

      acc[region].total++;

      if (status === "active") {
        acc[region].active++;
      } else if (status === "coming_soon") {
        acc[region].comingSoon++;
      } else {
        acc[region].inactive++;
      }

      return acc;
    },
    {} as Record<
      string,
      { total: number; active: number; comingSoon: number; inactive: number }
    >,
  );

  // Calculate map bounds to ensure all datacenters are visible
  const getBounds = useMemo(() => {
    if (locations.length === 0) return undefined;

    const bounds = L.latLngBounds(
      locations.map((loc) => [loc.latitude, loc.longitude]),
    );

    // Add some padding to the bounds
    return bounds.pad(0.1);
  }, [locations]);

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Globe className={brandColors?.primary?.hex ? `w-5 h-5 text-[#${brandColors.primary.hex}]` : "w-5 h-5 text-primary"} />
          Global Infrastructure
        </CardTitle>
        <CardDescription>
          Our datacenters span the globe for low-latency performance
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row h-[200px]">
          {/* Simple List of Regions */}
          <div className="md:w-1/3 border-r border-gray-200 dark:border-gray-700 p-2">
            <ul className="text-sm space-y-1">
              {Object.entries(locationCountsByRegion).map(
                ([region, counts]) => (
                  <li
                    key={region}
                    className="flex justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span>{region}</span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={brandColors?.primary?.hex 
                          ? `text-xs bg-opacity-10 bg-[#${brandColors.primary.hex}] text-[#${brandColors.primary.hex}] dark:text-[#${brandColors.primary.hex}]`
                          : "text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }
                      >
                        {counts.active}
                      </Badge>
                      {counts.comingSoon > 0 && (
                        <Badge
                          variant="outline"
                          className={brandColors?.secondary?.hex 
                            ? `text-xs bg-opacity-10 bg-[#${brandColors.secondary.hex}] text-[#${brandColors.secondary.hex}] dark:text-[#${brandColors.secondary.hex}]`
                            : "text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          {counts.comingSoon}
                        </Badge>
                      )}
                      {counts.inactive > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                        >
                          {counts.inactive}
                        </Badge>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Simple Leaflet Map */}
          <div className="md:w-2/3 h-full">
            <div className="relative h-full">
              <MapContainer
                bounds={getBounds}
                zoom={1}
                minZoom={1}
                maxZoom={8}
                zoomControl={false}
                style={{
                  height: "100%",
                  width: "100%",
                  background: isDark ? "#0f172a" : "#f1f5f9",
                }}
                attributionControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={
                    isDark
                      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  }
                />

                {locations.map((location) => {
                  // Get the appropriate icon based on status
                  const status = getLocationStatus(location);
                  const icon =
                    status === "active"
                      ? activeIcon
                      : status === "coming_soon"
                        ? comingSoonIcon
                        : inactiveIcon;

                  return (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                      icon={icon}
                    >
                      <Popup className="leaflet-popup-higher">
                        <div className="text-center">
                          <h3 className="font-bold text-base">
                            {location.name}
                          </h3>
                          <div className="text-sm">
                            {location.city}, {location.country}
                          </div>
                          <div className="text-xs mt-1">
                            <Badge
                              variant={
                                status === "active" ? "default" : "outline"
                              }
                              className={cn(
                                status === "active"
                                  ? "bg-lime-500 text-white hover:bg-lime-600"
                                  : status === "coming_soon"
                                    ? "bg-yellow-50 text-yellow-600 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-slate-50 text-slate-500 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400",
                              )}
                            >
                              {status === "active"
                                ? "Active"
                                : status === "coming_soon"
                                  ? "Coming Soon"
                                  : "Inactive"}
                            </Badge>
                          </div>

                          {/* Datacenter details section */}
                          <div className="mt-3 border-t border-gray-200 pt-2">
                            {(location.provider ||
                              location.tier ||
                              location.address) && (
                              <div className="grid grid-cols-1 gap-1 text-left text-xs mb-2">
                                {location.provider && (
                                  <div className="flex">
                                    <span className="font-medium w-16">
                                      Provider:
                                    </span>
                                    <span className="text-gray-600">
                                      {location.provider}
                                    </span>
                                  </div>
                                )}
                                {location.tier && (
                                  <div className="flex">
                                    <span className="font-medium w-16">
                                      Tier:
                                    </span>
                                    <span className="text-gray-600">
                                      {location.tier}
                                    </span>
                                  </div>
                                )}
                                {location.address && (
                                  <div className="flex">
                                    <span className="font-medium w-16">
                                      Address:
                                    </span>
                                    <span className="text-gray-600">
                                      {location.address}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Description section */}
                            {location.description && (
                              <div className="mt-2">
                                <div className="text-left text-xs font-medium mb-1">
                                  Additional Information:
                                </div>
                                <ScrollArea className="h-[80px] w-[200px]">
                                  <div className="text-left text-xs text-gray-600 p-1">
                                    {location.description}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-14 right-2 bg-white dark:bg-gray-800 p-1.5 rounded-md shadow-md border border-gray-200 dark:border-gray-700 text-[10px] flex items-center gap-2 z-[5]">
                <div className="flex items-center gap-1">
                  <span 
                    className="inline-block w-2 h-2 rounded-full" 
                    style={{ 
                      backgroundColor: brandColors?.primary?.full || '#84cc16' 
                    }}
                  ></span>
                  <Badge
                    variant="default"
                    style={brandColors?.primary?.hex 
                      ? { 
                          backgroundColor: `#${brandColors.primary.hex}`, 
                          color: 'white',
                          fontSize: '10px',
                          padding: '0px 4px'
                        }
                      : { 
                          backgroundColor: '#84cc16', 
                          color: 'white',
                          fontSize: '10px',
                          padding: '0px 4px'
                        }
                    }
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span 
                    className="inline-block w-2 h-2 rounded-full" 
                    style={{ 
                      backgroundColor: brandColors?.secondary?.full || '#facc15' 
                    }}
                  ></span>
                  <Badge
                    variant="outline"
                    style={brandColors?.secondary?.hex
                      ? { 
                          backgroundColor: `rgba(${parseInt(brandColors.secondary.hex.substring(0,2), 16)}, ${parseInt(brandColors.secondary.hex.substring(2,4), 16)}, ${parseInt(brandColors.secondary.hex.substring(4,6), 16)}, 0.1)`,
                          color: `#${brandColors.secondary.hex}`,
                          borderColor: `#${brandColors.secondary.hex}`,
                          fontSize: '10px',
                          padding: '0px 4px'
                        }
                      : { 
                          backgroundColor: 'rgba(250, 204, 21, 0.1)',
                          color: '#b45309',
                          borderColor: '#facc15',
                          fontSize: '10px',
                          padding: '0px 4px'
                        }
                    }
                  >
                    Coming Soon
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-500 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400 text-[10px] px-1 py-0"
                  >
                    Inactive
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
