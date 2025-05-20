import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyDialog = ({ isOpen, onClose }: ApiKeyDialogProps) => {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setScopes([]);
      setApiKey(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const availableScopes = [
    { id: "read:user", name: "Read user information" },
    { id: "read:servers", name: "Read server information" },
    { id: "write:servers", name: "Modify servers" },
    { id: "read:billing", name: "Read billing information" },
    { id: "read:tickets", name: "Read support tickets" },
    { id: "write:tickets", name: "Create and update tickets" }
  ];

  const handleScopeToggle = (scopeId: string) => {
    if (scopes.includes(scopeId)) {
      setScopes(scopes.filter(s => s !== scopeId));
    } else {
      setScopes([...scopes, scopeId]);
    }
  };

  const handleCreateKey = async () => {
    if (!name || scopes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and select at least one scope",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the API endpoint to create a new API key
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          scopes
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Use the actual API key returned from the server
        if (data.key) {
          setApiKey(data.key);
        } else {
          toast({
            title: "API Key Creation Issue",
            description: "The key was created but the full key is not available. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error creating API key",
          description: data.message || "An unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "API Key Creation Failed",
        description: "An error occurred while creating your API key. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setName("");
    setScopes([]);
    setApiKey(null);
    onClose();
  };

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast({
        title: "API Key Copied",
        description: "API key has been copied to clipboard"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {apiKey ? "Your API Key" : "Create API Key"}
          </DialogTitle>
          <DialogDescription>
            {apiKey 
              ? "Your API key has been created. Please copy it now as you won't be able to see it again."
              : "API keys allow secure access to the API on your behalf."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!apiKey ? (
          // API Key Creation Form
          <>
            <div className="space-y-4 py-2 pb-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input
                  id="name"
                  placeholder="My Application"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Give your API key a memorable name to identify its purpose.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Scopes</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {availableScopes.map((scope) => (
                    <div key={scope.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`scope-${scope.id}`}
                        checked={scopes.includes(scope.id)}
                        onChange={() => handleScopeToggle(scope.id)}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor={`scope-${scope.id}`} className="text-sm">{scope.name}</label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the permissions this API key should have.
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex flex-row justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateKey}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create API Key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // API Key Display
          <>
            <div className="py-4">
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center justify-between">
                  <code className="font-mono text-sm break-all">{apiKey}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong>Important:</strong> Store this API key safely. You cannot view it again after closing this dialog.
              </p>
            </div>
            
            <DialogFooter>
              <Button type="button" onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};