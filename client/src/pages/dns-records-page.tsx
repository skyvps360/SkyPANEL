import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, Globe, Edit, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getDnsRecords, deleteDnsRecord } from "@/lib/api";
import { AddRecordDialog } from "@/components/dns/AddRecordDialog";
import { EditRecordDialog } from "@/components/dns/EditRecordDialog";
import { getBrandColors } from "@/lib/brand-theme";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

interface DnsRecord {
  id: number;
  name: string;
  type: string;
  content: string;
  ttl: number;
  priority: number;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DnsDomain {
  id: number;
  name: string;
  status: string;
}

interface DnsRecordsResponse {
  domain: DnsDomain;
  records: DnsRecord[];
  interServerRecords?: DnsRecord[];
  interServerRaw?: any[];
  warning?: string;
}

export default function DnsRecordsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const domainId = parseInt(params.id || "0");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null);
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

  // Fetch DNS records
  const {
    data: recordsData,
    isLoading,
    error
  } = useQuery<DnsRecordsResponse>({
    queryKey: ["dns-records", domainId],
    queryFn: () => getDnsRecords(domainId) as any,
    enabled: !!domainId && domainId > 0,
  });

  // Delete record mutation - now uses InterServer record ID directly
  const deleteMutation = useMutation({
    mutationFn: (recordId: number) => deleteDnsRecord(domainId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns-records", domainId] });
      toast({
        title: "Success",
        description: "DNS record deleted successfully from InterServer",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete DNS record from InterServer",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRecord = (recordId: number) => {
    if (confirm("Are you sure you want to delete this DNS record?")) {
      deleteMutation.mutate(recordId);
    }
  };

  const handleEditRecord = (record: DnsRecord) => {
    setEditingRecord(record);
  };

  const handleBackToDomains = () => {
    setLocation("/dns");
  };

  // Table columns
  const columns = [
    {
      header: "Name",
      accessorKey: "name" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <span className="font-mono text-sm">{record.name}</span>
      ),
    },
    {
      header: "Type",
      accessorKey: "type" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <Badge variant="outline">{record.type}</Badge>
      ),
    },
    {
      header: "Content",
      accessorKey: "content" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <span className="font-mono text-sm break-all">{record.content}</span>
      ),
    },
    {
      header: "TTL",
      accessorKey: "ttl" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <span className="text-sm">{record.ttl}s</span>
      ),
    },
    {
      header: "Priority",
      accessorKey: "priority" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <span className="text-sm">{record.priority || "-"}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "disabled" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <Badge variant={record.disabled ? "destructive" : "default"}>
          {record.disabled ? "Disabled" : "Active"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessorKey: "id" as keyof DnsRecord,
      cell: (record: DnsRecord) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditRecord(record)}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRecord(record.id)}
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

  if (!domainId || domainId <= 0) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Invalid Domain</h3>
                <p className="text-muted-foreground mb-4">
                  The domain ID is invalid or missing.
                </p>
                <Button onClick={handleBackToDomains}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Domains
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Error Loading DNS Records</h3>
                <p className="text-muted-foreground mb-4">
                  {(error as any)?.response?.data?.error || "Failed to load DNS records"}
                </p>
                <Button onClick={handleBackToDomains}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Domains
                </Button>
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
                  <Button
                    variant="outline"
                    onClick={handleBackToDomains}
                    className="hover:bg-primary hover:text-primary-foreground mr-2"
                    style={{ borderColor: brandColors.primary.border }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Domains
                  </Button>
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
                      {recordsData?.domain?.name || "Loading..."}
                    </h1>
                    <p className="text-gray-600 mt-1 text-lg">
                      Manage DNS records for {recordsData?.domain?.name} via {companyName} InterServer integration
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 lg:mt-0">
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
                  className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow duration-200"
                  disabled={!recordsData?.domain}
                >
                  <Plus className="h-4 w-4" />
                  Add Record
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning message if InterServer API has issues */}
      {recordsData?.warning && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">{recordsData.warning}</p>
          </CardContent>
        </Card>
      )}

        {/* DNS Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            DNS Records ({recordsData?.records?.length || 0})
          </CardTitle>
          <CardDescription>
            Manage DNS records for {recordsData?.domain?.name} via {companyName} InterServer integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordsData?.records && recordsData.records.length > 0 ? (
            <DataTable
              data={recordsData.records}
              columns={columns}
              isLoading={isLoading}
              enableSearch={true}
              searchKey="name"
              searchPlaceholder="Search DNS records..."
              emptyMessage="No DNS records found"
            />
          ) : (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No DNS Records</h3>
              <p className="text-muted-foreground mb-4">
                This domain doesn't have any DNS records yet. Add your first record to get started.
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Record
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Add Record Dialog */}
      {recordsData?.domain && (
        <AddRecordDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          domainId={domainId}
          domainName={recordsData.domain.name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["dns-records", domainId] });
            setIsAddDialogOpen(false);
          }}
        />
      )}

        {/* Edit Record Dialog */}
      {editingRecord && recordsData?.domain && (
        <EditRecordDialog
          open={!!editingRecord}
          onOpenChange={(open) => !open && setEditingRecord(null)}
          domainId={domainId}
          domainName={recordsData.domain.name}
          record={editingRecord}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["dns-records", domainId] });
            setEditingRecord(null);
          }}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
