import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Server, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
    lastSync: Date | null;
    totalServers: number;
    syncedServers: number;
    externalServers: number;
    billingRecords: number;
}

interface SyncResult {
    success: boolean;
    message: string;
    data: {
        syncedServers: number;
        newServers: number;
        updatedServers: number;
        errors: string[];
    };
}

interface ServerSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ServerSyncModal({ isOpen, onClose }: ServerSyncModalProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch sync status
    const { data: syncStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{ success: boolean; data: SyncStatus }>({
        queryKey: ['server-sync-status'],
        queryFn: async () => {
            const response = await fetch('/api/user/servers/sync/status');
            if (!response.ok) {
                throw new Error('Failed to fetch sync status');
            }
            return response.json();
        },
        enabled: isOpen,
        staleTime: 30000, // 30 seconds
    });

    // Sync servers mutation
    const syncMutation = useMutation<SyncResult, Error>({
        mutationFn: async () => {
            const response = await fetch('/api/user/servers/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to sync servers');
            }

            return response.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Server synchronization completed successfully!', {
                    description: data.message,
                });

                // Refresh server list and sync status
                queryClient.invalidateQueries({ queryKey: ['/api/user/servers'] });
                refetchStatus();
            } else {
                toast.error('Server synchronization failed', {
                    description: data.message,
                });
            }
        },
        onError: (error) => {
            toast.error('Server synchronization failed', {
                description: error.message,
            });
        },
        onSettled: () => {
            setIsSyncing(false);
        },
    });

    const handleSync = async () => {
        setIsSyncing(true);
        syncMutation.mutate();
    };

    const handleRefresh = () => {
        refetchStatus();
    };

    if (!isOpen) return null;

    const status = syncStatus?.data;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                <CardTitle>Server Synchronization</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardDescription>
                            Synchronize your servers with VirtFusion to ensure all external servers are properly tracked and billed.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Sync Status */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Sync Status</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={statusLoading}
                                >
                                    {statusLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    Refresh
                                </Button>
                            </div>

                            {statusLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="ml-2">Loading sync status...</span>
                                </div>
                            ) : status ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-primary">{status.totalServers}</div>
                                        <div className="text-sm text-muted-foreground">Total Servers</div>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{status.syncedServers}</div>
                                        <div className="text-sm text-muted-foreground">Synced Servers</div>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">{status.externalServers}</div>
                                        <div className="text-sm text-muted-foreground">External Servers</div>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{status.billingRecords}</div>
                                        <div className="text-sm text-muted-foreground">Billing Records</div>
                                    </div>
                                </div>
                            ) : (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Failed to load sync status. Please try refreshing.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {/* External Servers Warning */}
                        {status && status.externalServers > 0 && (
                            <Alert className="border-orange-200 bg-orange-50">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800">
                                    <strong>{status.externalServers} external server(s)</strong> detected.
                                    These servers were created directly in VirtFusion and need to be synchronized
                                    with SkyPANEL for proper billing and management.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Sync Actions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Synchronization</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Sync your servers to ensure all external servers are properly tracked.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleSync}
                                    disabled={isSyncing || syncMutation.isPending}
                                    className="min-w-[120px]"
                                >
                                    {isSyncing || syncMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Syncing...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Sync Servers
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Sync Results */}
                            {syncMutation.data && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        {syncMutation.data.success ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <span className="font-medium">
                                            {syncMutation.data.success ? 'Sync Completed' : 'Sync Failed'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="text-center p-3 bg-muted rounded-lg">
                                            <div className="text-lg font-bold text-blue-600">
                                                {syncMutation.data.data.syncedServers}
                                            </div>
                                            <div className="text-muted-foreground">Total Synced</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted rounded-lg">
                                            <div className="text-lg font-bold text-green-600">
                                                {syncMutation.data.data.newServers}
                                            </div>
                                            <div className="text-muted-foreground">New Servers</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted rounded-lg">
                                            <div className="text-lg font-bold text-orange-600">
                                                {syncMutation.data.data.updatedServers}
                                            </div>
                                            <div className="text-muted-foreground">Updated</div>
                                        </div>
                                    </div>

                                    {syncMutation.data.data.errors.length > 0 && (
                                        <Alert className="border-red-200 bg-red-50">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <AlertDescription className="text-red-800">
                                                <strong>Errors encountered:</strong>
                                                <ul className="mt-2 space-y-1">
                                                    {syncMutation.data.data.errors.map((error, index) => (
                                                        <li key={index} className="text-sm">• {error}</li>
                                                    ))}
                                                </ul>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">What is Server Synchronization?</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• <strong>External Servers:</strong> Servers created directly in VirtFusion (outside SkyPANEL)</li>
                                <li>• <strong>Cross-checking:</strong> Verifies server UUIDs between VirtFusion and SkyPANEL</li>
                                <li>• <strong>Billing Integration:</strong> Ensures proper billing records for all servers</li>
                                <li>• <strong>Management:</strong> Allows you to manage all servers through SkyPANEL</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
