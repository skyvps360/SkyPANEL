import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";

import AdminLayout from "@/components/layout/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  PencilIcon,
  Plus,
  Save,
  Server,
  Trash2,
  FilterIcon,
  Search
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

// Form schema for datacenter location management with better validation
const datacenterLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  regionName: z.string().min(1, "Region name is required"),
  regionCode: z.string().min(1, "Region code is required"),
  latitude: z.coerce.number()
    .min(-90, "Latitude must be between -90° and +90°")
    .max(90, "Latitude must be between -90° and +90°"),
  longitude: z.coerce.number()
    .min(-180, "Longitude must be between -180° and +180°")
    .max(180, "Longitude must be between -180° and +180°"),
  status: z.enum(["active", "coming_soon", "inactive"]).default("active"),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0, "Display order must be a positive integer"),
  uptime: z.coerce.number()
    .min(0, "Uptime must be between 0% and 100%")
    .max(100, "Uptime must be between 0% and 100%")
    .default(99.9),
  networkSpeedMbps: z.coerce.number()
    .int("Network speed must be a whole number")
    .min(1, "Network speed must be positive")
    .default(10000),
  description: z.string().optional(),
  address: z.string().optional(),
  provider: z.string().optional(),
  tier: z.string().optional(),
  features: z.array(z.string()).default([]),
});

type DatacenterLocation = z.infer<typeof datacenterLocationSchema>;

export default function DatacenterLocationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  
  // Fetch branding settings
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    company_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });
  
  // Generate brand colors
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || brandingData?.company_color,
    secondaryColor: brandingData?.secondary_color,
  });
  
  // Fetch all datacenter locations
  const { data: locations = [], isLoading } = useQuery<DatacenterLocation[]>({
    queryKey: ['/api/admin/datacenter-locations'],
  });
  
  // Form setup for adding new locations
  const addForm = useForm<DatacenterLocation>({
    resolver: zodResolver(datacenterLocationSchema),
    defaultValues: {
      name: "",
      code: "",
      city: "",
      country: "",
      regionName: "",
      regionCode: "",
      latitude: 0,
      longitude: 0,
      status: "active",
      isActive: true,
      displayOrder: 0,
      uptime: 99.9,
      networkSpeedMbps: 10000,
      description: "",
      address: "",
      provider: "",
      tier: "",
      features: [],
    },
  });
  
  // Form setup for editing existing locations
  const editForm = useForm<DatacenterLocation>({
    resolver: zodResolver(datacenterLocationSchema),
    defaultValues: {
      name: "",
      code: "",
      city: "",
      country: "",
      regionName: "",
      regionCode: "",
      latitude: 0,
      longitude: 0,
      status: "active",
      isActive: true,
      displayOrder: 0,
      uptime: 99.9,
      networkSpeedMbps: 10000,
      description: "",
      address: "",
      provider: "",
      tier: "",
      features: [],
    },
  });
  
  // Add new datacenter location
  const addMutation = useMutation({
    mutationFn: async (data: DatacenterLocation) => {
      // Ensure isActive is set based on status
      const isActive = data.status !== "inactive";
      
      // Create submission data
      const submissionData = {
        ...data,
        isActive,
        // Ensure features is an array even if it's empty
        features: Array.isArray(data.features) ? data.features : [],
      };
      
      console.log("Creating datacenter location:", submissionData);
      return await apiRequest('/api/admin/datacenter-locations', {
        method: 'POST',
        data: submissionData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/datacenter-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/datacenter-locations'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Success",
        description: "Datacenter location has been added.",
      });
    },
    onError: (error: any) => {
      console.error("Error adding datacenter location:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add datacenter location. Please check the logs for details.",
        variant: "destructive",
      });
    },
  });
  
  // Update existing datacenter location
  const updateMutation = useMutation({
    mutationFn: async (data: DatacenterLocation & { id: number }) => {
      const { id, ...updateData } = data;
      
      // Ensure isActive is set based on status
      const isActive = updateData.status !== "inactive";
      
      // Create submission data
      const submissionData = {
        ...updateData,
        isActive,
        // Ensure features is an array even if it's empty
        features: Array.isArray(updateData.features) ? updateData.features : [],
      };
      
      console.log("Updating datacenter location:", id, submissionData);
      return await apiRequest(`/api/admin/datacenter-locations/${id}`, {
        method: 'PUT',
        data: submissionData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/datacenter-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/datacenter-locations'] });
      setIsEditDialogOpen(false);
      editForm.reset();
      toast({
        title: "Success",
        description: "Datacenter location has been updated.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating datacenter location:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update datacenter location. Please check the logs for details.",
        variant: "destructive",
      });
    },
  });
  
  // Delete datacenter location
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/datacenter-locations/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/datacenter-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/datacenter-locations'] });
      setIsDeleteDialogOpen(false);
      setSelectedLocation(null);
      toast({
        title: "Success",
        description: "Datacenter location has been deleted.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting datacenter location:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete datacenter location. Please check the logs for details.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submissions
  const onSubmitAdd = (data: DatacenterLocation) => {
    addMutation.mutate(data);
  };
  
  const onSubmitEdit = (data: DatacenterLocation) => {
    if (!selectedLocation) return;
    updateMutation.mutate({ ...data, id: selectedLocation.id });
  };
  
  const onDelete = () => {
    if (!selectedLocation) return;
    deleteMutation.mutate(selectedLocation.id);
  };
  
  // Handle opening the edit dialog and populating the form
  const handleEdit = (location: any) => {
    setSelectedLocation(location);
    
    // Make sure features is an array
    let features: string[] = [];
    if (location.features) {
      if (Array.isArray(location.features)) {
        features = location.features;
      } else if (typeof location.features === 'string') {
        features = location.features.split(',').map((f: string) => f.trim()).filter(Boolean);
      }
    }
    
    // Determine status from existing data
    let status: "active" | "coming_soon" | "inactive" = location.status || (location.isActive ? "active" : "inactive");
    
    // Reset form with location data
    editForm.reset({
      name: location.name,
      code: location.code,
      city: location.city,
      country: location.country,
      regionName: location.regionName,
      regionCode: location.regionCode,
      latitude: location.latitude,
      longitude: location.longitude,
      status: status,
      isActive: location.isActive,
      displayOrder: location.displayOrder || 0,
      uptime: location.uptime || 99.9,
      networkSpeedMbps: location.networkSpeedMbps || 10000,
      description: location.description || "",
      address: location.address || "",
      provider: location.provider || "",
      tier: location.tier || "",
      features: features,
    });
    
    setIsEditDialogOpen(true);
  };
  
  // Handle opening the delete confirmation dialog
  const handleDeleteClick = (location: any) => {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  };

  // Helper function to handle feature input in add/edit forms
  const handleFeaturesInput = (value: string, onChange: (value: string[]) => void) => {
    const features = value.split(',').map(f => f.trim()).filter(Boolean);
    onChange(features);
  };
  
  // Filter and search functions
  const getUniqueRegions = () => {
    const regions = locations.map(loc => loc.regionCode);
    return Array.from(new Set(regions));
  };
  
  const filteredLocations = locations.filter((location: DatacenterLocation) => {
    // Apply search query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      searchQuery === "" || 
      location.name.toLowerCase().includes(searchLower) ||
      location.code.toLowerCase().includes(searchLower) ||
      location.city.toLowerCase().includes(searchLower) || 
      location.country.toLowerCase().includes(searchLower) ||
      location.regionName.toLowerCase().includes(searchLower);
      
    // Apply status filter
    const matchesStatus = statusFilter === null || statusFilter === "all" || location.status === statusFilter;
    
    // Apply region filter
    const matchesRegion = regionFilter === null || regionFilter === "all" || location.regionCode === regionFilter;
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  // Get status badge color based on brand colors
  const getStatusBadgeStyles = (status: string) => {
    if (status === "active") {
      return {
        backgroundColor: brandColors.primary?.light,
        color: brandColors.primary?.dark,
        borderColor: 'transparent'
      };
    } else if (status === "coming_soon") {
      return {
        backgroundColor: brandColors.secondary?.light,
        color: brandColors.secondary?.dark,
        borderColor: 'transparent'  
      };
    }
    return {};
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">Datacenter Locations</h1>
            <p className="text-muted-foreground mt-1">
              Manage datacenter locations displayed on the interactive map
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={() => setIsAddDialogOpen(true)} style={{ backgroundColor: brandColors.primary?.full }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{
                    borderColor: searchQuery ? brandColors.primary?.light : undefined,
                    boxShadow: searchQuery ? `0 0 0 1px ${brandColors.primary?.light}` : undefined
                  }}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">              
                {/* Status filter */}
                <div className="w-full sm:w-1/2 md:w-64">
                  <Select
                    value={statusFilter || "all"}
                    onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <FilterIcon className="mr-2 h-4 w-4" />
                        <span>{statusFilter || "Filter by Status"}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="coming_soon">Coming Soon</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Region filter */}
                <div className="w-full sm:w-1/2 md:w-64">
                  <Select
                    value={regionFilter || "all"}
                    onValueChange={(value) => setRegionFilter(value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        <span>{regionFilter || "Filter by Region"}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {getUniqueRegions().map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-6">
                <Alert>
                  <AlertTitle>No datacenter locations found</AlertTitle>
                  <AlertDescription>
                    {locations.length > 0 
                      ? "No locations match your current search or filters. Try changing your criteria."
                      : "Add your first datacenter location to display it on the interactive map."}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] hidden sm:table-cell">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="hidden md:table-cell">Region</TableHead>
                      <TableHead className="hidden lg:table-cell">Coordinates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map((location: any) => (
                      <TableRow key={location.id}>
                        <TableCell className="hidden sm:table-cell">{location.displayOrder}</TableCell>
                        <TableCell>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-muted-foreground">{location.code}</div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {location.city}, {location.country}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {location.city}, {location.country}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>{location.regionName}</div>
                          <div className="text-sm text-muted-foreground">{location.regionCode}</div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={location.status === "inactive" ? "outline" : "default"} 
                            style={getStatusBadgeStyles(location.status)}
                          >
                            {location.status === "active" ? "Active" : 
                             location.status === "coming_soon" ? "Coming Soon" : 
                             "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(location)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Datacenter Location Dialog - Improved single dialog approach */}
        <Dialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
        >
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Add Datacenter Location</DialogTitle>
              <DialogDescription>
                Fill in the details for the new datacenter location
              </DialogDescription>
            </DialogHeader>

            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onSubmitAdd)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Basic Information */}
                  <div className="space-y-4">
                    <div className="flex items-center mb-2">
                      <MapPin className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Basic Information</h3>
                    </div>

                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ashburn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={addForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input placeholder="ASH" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Short code (e.g., ASH, NYC)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Ashburn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <div className="flex items-center mb-2">
                      <Globe className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Region</h3>
                    </div>

                    <FormField
                      control={addForm.control}
                      name="regionName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region Name</FormLabel>
                          <FormControl>
                            <Input placeholder="North America" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addForm.control}
                      name="regionCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region Code</FormLabel>
                          <FormControl>
                            <Input placeholder="NA" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Short code for the region (e.g., NA, EU)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Right Column - Location and Technical Details */}
                <div className="space-y-4">
                  <div className="flex items-center mb-2">
                    <Server className="mr-2 h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Technical Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="38.7957" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addForm.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="-77.4716" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="coming_soon">Coming Soon</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Determines visibility and appearance on the map
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="displayOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addForm.control}
                      name="uptime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uptime (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="networkSpeedMbps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network Speed (Mbps)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="KVM Virtualization, 24/7 Support, 100% SSD" 
                            className="resize-none" 
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                            onChange={(e) => handleFeaturesInput(e.target.value, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Comma-separated features
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Additional Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="Equinix" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <FormControl>
                          <Input placeholder="Tier 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe this datacenter location..."
                          className="h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Location
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Datacenter Location Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
      >
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Datacenter Location</DialogTitle>
            <DialogDescription>
              Update the details for {selectedLocation?.name}
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center mb-2">
                    <MapPin className="mr-2 h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Basic Information</h3>
                  </div>

                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ashburn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input placeholder="ASH" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Short code (e.g., ASH, NYC)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Ashburn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <div className="flex items-center mb-2">
                      <Globe className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Region</h3>
                    </div>

                    <FormField
                      control={editForm.control}
                      name="regionName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region Name</FormLabel>
                          <FormControl>
                            <Input placeholder="North America" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="regionCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region Code</FormLabel>
                          <FormControl>
                            <Input placeholder="NA" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Short code for the region (e.g., NA, EU)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Right Column - Location and Technical Details */}
                <div className="space-y-4">
                  <div className="flex items-center mb-2">
                    <Server className="mr-2 h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Technical Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="38.7957" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="-77.4716" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="coming_soon">Coming Soon</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Determines visibility and appearance on the map
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="displayOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="uptime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uptime (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="networkSpeedMbps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network Speed (Mbps)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="KVM Virtualization, 24/7 Support, 100% SSD" 
                            className="resize-none" 
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                            onChange={(e) => handleFeaturesInput(e.target.value, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Comma-separated features
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Additional Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="Equinix" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <FormControl>
                          <Input placeholder="Tier 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe this datacenter location..."
                          className="h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Location
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Datacenter Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedLocation?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Deleting this location will remove it from the interactive map and may affect server listings.
              </AlertDescription>
            </Alert>
          </div>
          
          {selectedLocation && (
            <div className="space-y-4 my-2">
              <div className="flex items-center p-3 border rounded-md bg-muted">
                <div className="flex-1">
                  <div className="font-semibold">{selectedLocation.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedLocation.code}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedLocation.city}, {selectedLocation.country} ({selectedLocation.regionCode})
                  </div>
                </div>
                <Badge 
                  variant={selectedLocation.status === "inactive" ? "outline" : "default"} 
                  style={getStatusBadgeStyles(selectedLocation.status)}
                >
                  {selectedLocation.status === "active" ? "Active" : 
                  selectedLocation.status === "coming_soon" ? "Coming Soon" : 
                  "Inactive"}
                </Badge>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}