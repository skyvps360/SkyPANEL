import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Globe, Trash2, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getDnsDomains, deleteDnsDomain } from "@/lib/api";
import { AddDomainDialog } from "@/components/dns/AddDomainDialog";
import { getBrandColors } from "@/lib/brand-theme";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

interface DnsDomain {
  id: number;
  name: string;
  status: string;
  interserverId?: number;
  interServerStatus?: string;
  createdAt: string;
  updatedAt: string;
}

interface DnsDomainsResponse {
  domains: DnsDomain[];
  warning?: string;
}

export default function DnsDomainsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch branding data for consistent theming
  const { data: brandingData } = useQuery<{
    company_name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });

  const companyName = brandingData?.company_name || 'SkyVPS360';

  // Fetch DNS domains
  const { 
    data: domainsData, 
    isLoading, 
    error 
  } = useQuery<DnsDomainsResponse>({
    queryKey: ["/api/dns/domains"],
    queryFn: getDnsDomains,
  });

  // Delete domain mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDnsDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dns/domains"] });
      toast({
        title: "Success",
        description: "Domain deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete domain",
        variant: "destructive",
      });
    },
  });

  const handleDeleteDomain = (domainId: number) => {
    if (confirm("Are you sure you want to delete this domain? This will also delete all DNS records for this domain.")) {
      deleteMutation.mutate(domainId);
    }
  };

  const handleManageRecords = (domain: DnsDomain) => {
    // Navigate to DNS records page
    window.location.href = `/dns/domains/${domain.id}/records`;
  };

  // Table columns
  const columns = [
    {
      header: "Domain Name",
      accessorKey: "name" as keyof DnsDomain,
      cell: (domain: DnsDomain) => (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{domain.name}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as keyof DnsDomain,
      cell: (domain: DnsDomain) => (
        <div className="flex flex-col gap-1">
          <Badge variant={domain.status === 'active' ? 'default' : 'secondary'}>
            {domain.status}
          </Badge>
          {domain.interserverId && (
            <Badge
              variant="default"
              className="text-xs"
            >
              InterServer: {domain.interserverId}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt" as keyof DnsDomain,
      cell: (domain: DnsDomain) => (
        <span className="text-sm text-muted-foreground">
          {new Date(domain.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "id" as keyof DnsDomain,
      cell: (domain: DnsDomain) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleManageRecords(domain)}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            <Settings className="h-4 w-4" />
            Manage Records
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteDomain(domain.id)}
            className="hover:bg-destructive hover:text-destructive-foreground"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Error Loading DNS Domains</h3>
                <p className="text-muted-foreground">
                  {(error as any)?.response?.data?.error || "Failed to load DNS domains"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Modern Hero Header */}
        <div className="rounded-2xl bg-white border border-gray-300/60 shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: brandColors.primary.lighter }}
                  >
                    <Globe
                      className="h-6 w-6"
                      style={{ color: brandColors.primary.full }}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                      DNS Management
                    </h1>
                    <p className="text-gray-600 mt-1 text-lg">
                      Manage your DNS domains and records through {companyName} InterServer integration
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 lg:mt-0">
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
                  className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Domain
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning message if InterServer API has issues */}
      {domainsData?.warning && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">{domainsData.warning}</p>
          </CardContent>
        </Card>
      )}

        {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            DNS Domains ({domainsData?.domains?.length || 0})
          </CardTitle>
          <CardDescription>
            Manage your DNS domains and their records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domainsData?.domains?.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No DNS Domains</h3>
              <p className="text-muted-foreground mb-4">
                You haven't added any DNS domains yet. Add your first domain to get started.
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Domain
              </Button>
            </div>
          ) : (
            <DataTable
              data={domainsData?.domains || []}
              columns={columns}
              isLoading={isLoading}
              enableSearch={true}
              searchKey="name"
              searchPlaceholder="Search domains..."
              emptyMessage="No domains found"
            />
          )}
        </CardContent>
      </Card>

        {/* Add Domain Dialog */}
      <AddDomainDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/dns/domains"] });
          setIsAddDialogOpen(false);
        }}
      />
      </div>
    </DashboardLayout>
  );
}
