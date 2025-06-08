import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Globe, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDnsDomains } from "@/lib/api";

interface DnsDomain {
  id: number;
  name: string;
  status: string;
  interserverId?: number;
  createdAt: string;
  recordUsage?: {
    total: number;
    userCreated: number;
    default: number;
  };
}

interface DnsDomainsResponse {
  domains: DnsDomain[];
  warning?: string;
}

interface DomainSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDomainIds: number[]) => void;
  currentPlanName: string;
  newPlanName: string;
  currentDomainLimit: number;
  newDomainLimit: number;
  isLoading?: boolean;
}

export function DomainSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlanName,
  newPlanName,
  currentDomainLimit,
  newDomainLimit,
  isLoading = false
}: DomainSelectionModalProps) {
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);

  // Fetch current domains
  const { data: domainsData, isLoading: domainsLoading } = useQuery<DnsDomainsResponse>({
    queryKey: ["dns-domains"],
    queryFn: () => getDnsDomains() as any,
    enabled: isOpen, // Only fetch when modal is open
  });

  const domains = domainsData?.domains || [];
  const currentDomainCount = domains.length;
  const domainsToRemove = currentDomainCount - newDomainLimit;

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDomainIds([]);
    }
  }, [isOpen]);

  const handleDomainToggle = (domainId: number) => {
    setSelectedDomainIds(prev => {
      if (prev.includes(domainId)) {
        return prev.filter(id => id !== domainId);
      } else if (prev.length < newDomainLimit) {
        return [...prev, domainId];
      }
      return prev;
    });
  };

  const handleSelectAll = () => {
    if (selectedDomainIds.length === newDomainLimit) {
      setSelectedDomainIds([]);
    } else {
      // Select the first N domains up to the limit
      const firstNDomains = domains.slice(0, newDomainLimit).map(d => d.id);
      setSelectedDomainIds(firstNDomains);
    }
  };

  const canConfirm = selectedDomainIds.length === newDomainLimit;
  const unselectedDomains = domains.filter(d => !selectedDomainIds.includes(d.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Domain Selection Required for Downgrade
          </DialogTitle>
          <DialogDescription>
            You're downgrading from <strong>{currentPlanName}</strong> to <strong>{newPlanName}</strong>.
            The new plan allows only <strong>{newDomainLimit} domain{newDomainLimit !== 1 ? 's' : ''}</strong>, 
            but you currently have <strong>{currentDomainCount} domain{currentDomainCount !== 1 ? 's' : ''}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Card */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">
                    {domainsToRemove} domain{domainsToRemove !== 1 ? 's' : ''} will be removed
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please select exactly <strong>{newDomainLimit}</strong> domain{newDomainLimit !== 1 ? 's' : ''} to keep. 
                    The remaining {domainsToRemove} domain{domainsToRemove !== 1 ? 's' : ''} will be permanently deleted 
                    along with all their DNS records.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection Summary */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Selected: {selectedDomainIds.length}/{newDomainLimit}</span>
              {selectedDomainIds.length < newDomainLimit && (
                <span className="text-red-600 ml-2">
                  (Select {newDomainLimit - selectedDomainIds.length} more)
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={domains.length === 0}
            >
              {selectedDomainIds.length === newDomainLimit ? 'Clear All' : `Select First ${newDomainLimit}`}
            </Button>
          </div>

          {/* Domain List */}
          {domainsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No domains found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {domains.map((domain) => {
                const isSelected = selectedDomainIds.includes(domain.id);
                const canSelect = isSelected || selectedDomainIds.length < newDomainLimit;
                
                return (
                  <div
                    key={domain.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-green-300 bg-green-50' 
                        : canSelect 
                          ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => canSelect && handleDomainToggle(domain.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!canSelect}
                      onCheckedChange={() => handleDomainToggle(domain.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{domain.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-green-600" />}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <Badge variant={domain.status === 'active' ? 'default' : 'secondary'}>
                          {domain.status}
                        </Badge>
                        
                        {domain.recordUsage && (
                          <span>
                            {domain.recordUsage.userCreated} records
                          </span>
                        )}
                        
                        <span>
                          Created {new Date(domain.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {!isSelected && !canSelect && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Domains to be removed preview */}
          {unselectedDomains.length > 0 && selectedDomainIds.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800">
                  Domains to be removed ({unselectedDomains.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {unselectedDomains.map((domain) => (
                    <div key={domain.id} className="flex items-center gap-2 text-sm text-red-700">
                      <X className="h-3 w-3" />
                      <span>{domain.name}</span>
                      {domain.recordUsage && (
                        <span className="text-red-600">
                          ({domain.recordUsage.total} records will be deleted)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel Downgrade
          </Button>
          <Button
            onClick={() => onConfirm(selectedDomainIds)}
            disabled={!canConfirm || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              `Confirm Downgrade & Remove ${domainsToRemove} Domain${domainsToRemove !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
