import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Trash2, AlertCircle, Info, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";

interface BackupsTabProps {
  serverId: number;
}

interface BackupPlan {
  id: number;
  name: string;
  description?: string;
  price?: number;
  frequency?: string;
  retention?: string;
}

interface ServerBackup {
  id: number;
  name: string;
  size?: string;
  created: string;
  status: string;
  planId?: number;
}

/**
 * BackupsTab component for displaying and managing server backup plans
 * Allows users to view current backups and manage backup plans
 */
export const BackupsTab = ({ serverId }: BackupsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  // Fetch server backups
  const { data: backupsData, isLoading: backupsLoading, error: backupsError } = useQuery({
    queryKey: ['server-backups', serverId],
    queryFn: async () => {
      const response = await fetch(`/api/servers/${serverId}/backups`);
      if (!response.ok) {
        throw new Error('Failed to fetch server backups');
      }
      return response.json();
    },
    enabled: !!serverId,
  });

  // Fetch available backup plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['backup-plans'],
    queryFn: async () => {
      const response = await fetch('/api/servers/backup-plans');
      if (!response.ok) {
        throw new Error('Failed to fetch backup plans');
      }
      return response.json();
    },
  });

  // Update backup plan mutation
  const updateBackupPlanMutation = useMutation({
    mutationFn: async ({ planId }: { planId: number }) => {
      const response = await fetch(`/api/servers/${serverId}/backups/plan/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update backup plan');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Backup Plan Updated",
        description: variables.planId === 0 
          ? "Backup plan has been removed successfully"
          : "Backup plan has been updated successfully",
      });
      
      // Invalidate and refetch backup data
      queryClient.invalidateQueries({ queryKey: ['server-backups', serverId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update backup plan",
        variant: "destructive",
      });
    },
  });

  const handleUpdateBackupPlan = (planId: number) => {
    updateBackupPlanMutation.mutate({ planId });
  };

  // Extract data from API responses
  const backups: ServerBackup[] = backupsData?.data || backupsData || [];
  const availablePlans: BackupPlan[] = plansData?.data || plansData || [];

  // Determine current backup plan status
  const currentBackupPlan = backups.find(backup => backup.planId)?.planId;
  const currentPlan = availablePlans.find(plan => plan.id === currentBackupPlan);

  if (backupsLoading || plansLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (backupsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load backup information. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Backup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Backup Status
          </CardTitle>
          <CardDescription>
            Current backup configuration and status for this server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentPlan ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                    <span className="font-medium">{currentPlan.name}</span>
                  </div>
                  {currentPlan.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPlan.description}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    {currentPlan.frequency && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {currentPlan.frequency}
                      </span>
                    )}
                    {currentPlan.retention && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Keep for {currentPlan.retention}
                      </span>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Backup Plan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove the backup plan for this server? This action will disable automatic backups.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleUpdateBackupPlan(0)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={updateBackupPlanMutation.isPending}
                      >
                        {updateBackupPlanMutation.isPending ? "Removing..." : "Remove Plan"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No Backup Plan</AlertTitle>
                <AlertDescription>
                  This server does not have an active backup plan. Select a plan below to enable automatic backups.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Backup Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Available Backup Plans
          </CardTitle>
          <CardDescription>
            Choose a backup plan to protect your server data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availablePlans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors ${
                    plan.id === currentBackupPlan ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{plan.name}</h3>
                      {plan.id === currentBackupPlan && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    )}
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {plan.frequency && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{plan.frequency}</span>
                        </div>
                      )}
                      {plan.retention && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Keep for {plan.retention}</span>
                        </div>
                      )}
                      {plan.price && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">${plan.price}/month</span>
                        </div>
                      )}
                    </div>

                    {plan.id !== currentBackupPlan && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            className="w-full mt-3"
                            variant={plan.id === selectedPlan ? "default" : "outline"}
                            onClick={() => setSelectedPlan(plan.id)}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Select Plan
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apply Backup Plan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apply "{plan.name}" backup plan to this server? This will enable automatic backups according to the plan settings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedPlan(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => {
                                handleUpdateBackupPlan(plan.id);
                                setSelectedPlan(null);
                              }}
                              disabled={updateBackupPlanMutation.isPending}
                            >
                              {updateBackupPlanMutation.isPending ? "Applying..." : "Apply Plan"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Plans Available</AlertTitle>
              <AlertDescription>
                There are currently no backup plans available for this server.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Backup History
          </CardTitle>
          <CardDescription>
            Recent backups created for this server
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length > 0 ? (
            <div className="space-y-3">
              {backups.slice(0, 10).map((backup, index) => (
                <div
                  key={backup.id || index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{backup.name || `Backup ${backup.id}`}</div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(backup.created).toLocaleString()}
                      {backup.size && ` • Size: ${backup.size}`}
                    </div>
                  </div>
                  <Badge variant={
                    backup.status === 'completed' ? 'default' :
                    backup.status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {backup.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {backup.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                    {backup.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
                    {backup.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Backups</AlertTitle>
              <AlertDescription>
                No backups have been created for this server yet. Set up a backup plan to begin automatic backups.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};