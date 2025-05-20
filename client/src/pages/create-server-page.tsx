import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateServerForm } from "@/components/servers/CreateServerForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Hypervisor {
  id: number;
  name: string;
  maxCpu: number;
  maxMemory: number;
  enabled: boolean;
}

interface OsTemplate {
  id: string;
  name: string;
}

export default function CreateServerPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch hypervisors
  const { data: hypervisors = [], isLoading: hypervisorsLoading } = useQuery<Hypervisor[]>({
    queryKey: ["/api/hypervisors"],
  });

  // Fetch OS templates
  const { data: osTemplates = [], isLoading: templatesLoading } = useQuery<OsTemplate[]>({
    queryKey: ["/api/os-templates"],
  });

  // Fetch credit balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ credits: number }>({
    queryKey: ["/api/billing/balance"],
  });

  // Create server mutation
  const createServerMutation = useMutation({
    mutationFn: async (serverData: any) => {
      return await apiRequest("/api/servers", {
        method: "POST",
        body: serverData
      });
    },
    onSuccess: () => {
      toast({
        title: "Server created",
        description: "Your new server is being deployed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      navigate("/servers");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating server",
        description: error.message || "Failed to create server",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleCreateServer = (data: any) => {
    createServerMutation.mutate(data);
  };

  // Check if data is loading
  const isLoading = hypervisorsLoading || templatesLoading || balanceLoading;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          size="icon"
          className="mr-4"
          onClick={() => navigate("/servers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create New Server</h1>
          <p className="text-gray-500 mt-1">Deploy a new virtual server</p>
        </div>
      </div>

      {/* Server Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
          <CardDescription>
            Configure the specifications for your new server
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2">Loading configuration options...</p>
            </div>
          ) : (
            <CreateServerForm 
              hypervisors={hypervisors}
              osTemplates={osTemplates}
              availableCredits={balanceData?.credits || 0}
              onSubmit={handleCreateServer}
              isLoading={createServerMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
