import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface CacheStatus {
  betterstack: {
    cacheSize: number;
    lastFetch: number;
    cacheAge: number;
  };
  gemini: {
    activeUsers: number;
  };
  modules: {
    cachedModules: number;
  };
}

export const CacheClearButton: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const clearAllCaches = async () => {
    setIsClearing(true);
    try {
      const response = await apiRequest<{
        success: boolean;
        message: string;
        clearedCaches: string[];
        errors?: string[];
      }>("/api/admin/cache/clear", {
        method: "POST"
      });

      if (response.success) {
        // Clear React Query cache as well
        queryClient.clear();
        
        toast({
          title: "Cache Cleared Successfully",
          description: `Cleared: ${response.clearedCaches.join(", ")}`,
        });
      } else {
        toast({
          title: "Partial Cache Clear",
          description: `Cleared: ${response.clearedCaches.join(", ")}. Errors: ${response.errors?.join(", ")}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear caches",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const clearSpecificCache = async (cacheType: 'betterstack' | 'gemini' | 'modules') => {
    setIsClearing(true);
    try {
      await apiRequest(`/api/admin/cache/clear/${cacheType}`, {
        method: "POST"
      });

      // If clearing modules cache, also clear React Query cache
      if (cacheType === 'modules') {
        queryClient.clear();
      }

      toast({
        title: "Cache Cleared",
        description: `${cacheType} cache cleared successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to clear ${cacheType} cache`,
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const clearReactQueryCache = () => {
    queryClient.clear();
    toast({
      title: "Frontend Cache Cleared",
      description: "React Query cache has been cleared",
    });
  };

  const getCacheStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await apiRequest<{
        success: boolean;
        data: CacheStatus;
      }>("/api/admin/cache/status");

      if (response.success) {
        const { betterstack, gemini, modules } = response.data;
        const cacheAgeMinutes = Math.floor(betterstack.cacheAge / (1000 * 60));
        
        toast({
          title: "Cache Status",
          description: `BetterStack: ${betterstack.cacheSize} items (${cacheAgeMinutes}m old), Gemini: ${gemini.activeUsers} users, Modules: ${modules.cachedModules} cached`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get cache status",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-orange-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30"
          disabled={isClearing || isLoadingStatus}
        >
          {isClearing || isLoadingStatus ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
          <span className="sr-only">Cache Management</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={getCacheStatus} disabled={isLoadingStatus}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Check Cache Status
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={clearAllCaches} disabled={isClearing}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear All Caches
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={clearReactQueryCache}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Clear Frontend Cache
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => clearSpecificCache('betterstack')} disabled={isClearing}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear BetterStack Cache
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => clearSpecificCache('gemini')} disabled={isClearing}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Gemini Cache
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => clearSpecificCache('modules')} disabled={isClearing}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Module Cache
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CacheClearButton;
