import React, { useState, useRef, createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Check, Copy, Code, FileText, Info, Key, Search, Server, CreditCard, User, X, RefreshCw, Terminal } from 'lucide-react';

// Context for API documentation
interface ApiDocsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ApiDocsContext = createContext<ApiDocsContextType | null>(null);

const useApiDocsContext = () => {
  const context = useContext(ApiDocsContext);
  if (!context) {
    throw new Error('useApiDocsContext must be used within an ApiDocsProvider');
  }
  return context;
};

// Type definitions
interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: string;
  }[];
  responseExample: string;
  requiresAuth: boolean;
  requiresAdmin?: boolean;
  tags?: string[];
}

interface ApiCategoryProps {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
  onTagSelect: (tag: string) => void;
  selectedTags: string[];
}

// API Key Management component
const ApiKeyManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expirationDays, setExpirationDays] = useState<number | null>(90);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  // Query for API keys
  const { data: apiKeys = [], refetch: refetchApiKeys } = useQuery<any[]>({
    queryKey: ["/api/user/api-keys"],
    onError: (error) => {
      console.error("Error fetching API keys:", error);
      toast({
        title: "Error fetching API keys",
        description: "Could not load your API keys. Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Available scopes
  const availableScopes = [
    { value: "read:user", label: "Read user information" },
    { value: "read:servers", label: "Read server information" },
    { value: "write:servers", label: "Modify servers" },
    { value: "read:billing", label: "Read billing information" },

  ];

  // Create API key
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Invalid name",
        description: "Please enter a name for your API key.",
        variant: "destructive",
      });
      return;
    }

    if (selectedScopes.length === 0) {
      toast({
        title: "No scopes selected",
        description: "Please select at least one scope for your API key.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: selectedScopes,
          expiresIn: expirationDays
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data = await response.json();

      // Show the API key
      setNewApiKey(data.key);

      // Reset form
      setNewKeyName('');
      setSelectedScopes([]);
      setExpirationDays(90);

      // Refetch keys
      refetchApiKeys();

    } catch (error) {
      toast({
        title: "Error creating API key",
        description: "Could not create API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete API key
  const handleDeleteApiKey = async (keyId: number) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      toast({
        title: "API Key Deleted",
        description: "Your API key has been deleted successfully.",
      });

      refetchApiKeys();

    } catch (error) {
      toast({
        title: "Error deleting API key",
        description: "Could not delete API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Copy API key to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "API key copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Create and manage your API keys for authenticating with the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              You have {apiKeys.length} API {apiKeys.length === 1 ? 'key' : 'keys'}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Key className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 border rounded-md bg-muted/50">
              <Key className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">No API Keys</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You haven't created any API keys yet.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create your first API key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex p-4 border rounded-md justify-between gap-4 items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{key.name}</h4>
                      {key.active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                      {key.expiresAt && (
                        <span> • Expires: {new Date(key.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {key.scopes.map((scope: string) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteApiKey(key.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to access the API. Make sure to copy your key as you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>

          {newApiKey ? (
            <div className="space-y-4">
              <Alert variant="info" className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This API key will only be shown once. Please copy it now and store it securely.
                </AlertDescription>
              </Alert>

              <div className="relative">
                <Input
                  value={newApiKey}
                  readOnly
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => copyToClipboard(newApiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewApiKey(null);
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">API Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="My Application"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A name to help you identify this key later.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Permissions (Scopes)</Label>
                <div className="grid gap-2">
                  {availableScopes.map((scope) => (
                    <div key={scope.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.value}
                        checked={selectedScopes.includes(scope.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedScopes([...selectedScopes, scope.value]);
                          } else {
                            setSelectedScopes(selectedScopes.filter((s) => s !== scope.value));
                          }
                        }}
                      />
                      <Label htmlFor={scope.value} className="text-sm font-normal">
                        {scope.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expiration</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Set expiration date</span>
                  <Switch
                    checked={expirationDays !== null}
                    onCheckedChange={(checked) => {
                      setExpirationDays(checked ? 90 : null);
                    }}
                  />
                </div>
                {expirationDays !== null && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="1"
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(parseInt(e.target.value) || 90)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of days before this key expires. Set to never expire by turning off expiration.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateApiKey}>
                  Create Key
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// API Endpoint Component
const EndpointCard = ({ endpoint, onTagSelect }: { endpoint: ApiEndpoint; onTagSelect: (tag: string) => void }) => {
  const [copied, setCopied] = useState(false);

  // Copy endpoint URL to clipboard
  const copyEndpointUrl = () => {
    navigator.clipboard.writeText(endpoint.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format the curl command for the API endpoint
  const getCurlCommand = (): string => {
    let cmd = `curl -X ${endpoint.method} \\
  "${window.location.origin}${endpoint.path}"`;

    if (endpoint.requiresAuth) {
      cmd += ` \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE"`;
    }

    if (endpoint.parameters && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      const exampleBody: Record<string, any> = {};
      endpoint.parameters.forEach(param => {
        if (param.example !== undefined) {
          try {
            // Try to parse the example as JSON if it's a string
            if (param.type === 'object' || param.type === 'array') {
              exampleBody[param.name] = JSON.parse(param.example);
            } else {
              exampleBody[param.name] = param.example;
            }
          } catch {
            exampleBody[param.name] = param.example;
          }
        }
      });

      if (Object.keys(exampleBody).length > 0) {
        cmd += ` \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(exampleBody, null, 2)}'`;
      }
    }

    return cmd;
  };

  // Get method color class
  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-amber-100 text-amber-800',
      PATCH: 'bg-purple-100 text-purple-800',
      DELETE: 'bg-red-100 text-red-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AccordionItem value={endpoint.path} className="border rounded-md overflow-hidden mb-4">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
        <div className="flex flex-1 items-center gap-3 text-left">
          <Badge className={`font-mono ${getMethodColor(endpoint.method)}`}>
            {endpoint.method}
          </Badge>
          <span className="font-mono text-sm">{endpoint.path}</span>
          {endpoint.requiresAdmin && (
            <Badge variant="destructive" className="ml-auto">Admin</Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-2">
        <div className="space-y-4">
          <div>
            <p className="text-sm">{endpoint.description}</p>

            <div className="flex flex-wrap gap-1 mt-2">
              {endpoint.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagSelect(tag);
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Endpoint URL</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 p-1"
                onClick={copyEndpointUrl}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <div className="bg-muted p-2 rounded-md font-mono text-xs mt-1">
              {endpoint.path}
            </div>
          </div>

          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Parameters</h4>
              <div className="grid grid-cols-12 gap-x-2 gap-y-1 text-xs">
                <div className="col-span-3 font-medium">Name</div>
                <div className="col-span-2 font-medium">Type</div>
                <div className="col-span-2 font-medium">Required</div>
                <div className="col-span-5 font-medium">Description</div>

                {endpoint.parameters.map((param, idx) => (
                  /* Using a div wrapper instead of React.Fragment to avoid Replit metadata attributes */
                  <div key={idx} className="contents">
                    <div className="col-span-3 font-mono">{param.name}</div>
                    <div className="col-span-2">{param.type}</div>
                    <div className="col-span-2">{param.required ? 'Yes' : 'No'}</div>
                    <div className="col-span-5">
                      {param.description}
                      {param.example && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Example: <code className="bg-muted rounded px-1">{param.example}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium text-sm mb-2">Example Response</h4>
            <pre className="bg-muted p-2 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap">
              {endpoint.responseExample}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">cURL Example</h4>
            <div className="relative">
              <pre className="bg-muted p-2 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                {getCurlCommand()}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(getCurlCommand());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {endpoint.requiresAuth && (
            <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                This endpoint requires authentication. Create an API key in the "API Keys" tab to authenticate with the API.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// Tag filter component
const TagFilter = ({ tags, selectedTags, onTagSelect }: {
  tags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
}) => {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={selectedTags.includes(tag) ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 hover:text-primary"
          onClick={() => onTagSelect(tag)}
        >
          {tag}
          {selectedTags.includes(tag) && (
            <X className="ml-1 h-3 w-3" />
          )}
        </Badge>
      ))}
    </div>
  );
};

// API Category Component
const ApiCategory = ({ title, description, endpoints, onTagSelect, selectedTags }: ApiCategoryProps) => {
  // Get all unique tags from endpoints
  const allTags = [...new Set(endpoints.flatMap(endpoint => endpoint.tags || []))].sort();

  // Filter endpoints based on selected tags
  const filteredEndpoints = selectedTags.length > 0
    ? endpoints.filter(endpoint =>
        endpoint.tags && endpoint.tags.some(tag => selectedTags.includes(tag))
      )
    : endpoints;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {allTags.length > 0 && (
        <CardContent className="pt-0 pb-2">
          <div className="mb-2 text-sm font-medium">Filter by tag:</div>
          <TagFilter
            tags={allTags}
            selectedTags={selectedTags}
            onTagSelect={onTagSelect}
          />
        </CardContent>
      )}
      <CardContent className="pt-2">
        {filteredEndpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="mx-auto h-8 w-8 mb-2" />
            <p>No endpoints match the selected filters.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {filteredEndpoints.map((endpoint, index) => (
              <EndpointCard
                key={index}
                endpoint={endpoint}
                onTagSelect={onTagSelect}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

// Endpoint Overview component
const EndpointOverview = () => {
  const { setActiveTab } = useApiDocsContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Authentication</CardTitle>
          <CardDescription>
            How to authenticate with the API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Most API endpoints require authentication using API keys. To authenticate, include your API key
            in the Authorization header of your request:
          </p>
          <div className="bg-muted p-3 rounded-md font-mono text-sm">
            Authorization: Bearer YOUR_API_KEY
          </div>
          <p>
            You can manage your API keys in the
            <Button
              variant="link"
              className="px-1 py-0 h-auto font-normal"
              onClick={() => setActiveTab("api-keys")}
            >
              API Keys
            </Button>
            tab.
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <h4 className="font-medium">Rate Limiting</h4>
            <p className="text-sm">
              API requests are limited to 100 requests per minute per API key. If you exceed this limit,
              you'll receive a 429 Too Many Requests response.
            </p>

            <h4 className="font-medium mt-2">Response Format</h4>
            <p className="text-sm">
              All API responses are returned in JSON format with appropriate HTTP status codes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Format</CardTitle>
          <CardDescription>
            Understanding API responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            All API responses follow a consistent format to make integration easier.
          </p>

          <div className="bg-muted rounded-md p-4">
            <h5 className="font-medium mb-2 text-sm">Success Response (200 OK)</h5>
            <pre className="font-mono text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "id": 123,
    "name": "Example Server",
    "created_at": "2025-01-01T00:00:00Z"
  }
}`}
            </pre>
          </div>

          <div className="bg-muted rounded-md p-4 mt-4">
            <h5 className="font-medium mb-2 text-sm">Error Response (400, 401, 403, 404, 500)</h5>
            <pre className="font-mono text-sm overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "The request parameters are invalid",
    "details": {...}
  }
}`}
            </pre>
          </div>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Tip</AlertTitle>
            <AlertDescription>
              Always check the "success" field in the response to determine if the request was successful.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

// DEFINE API ENDPOINTS
// User endpoints
const userEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/tickets",
    description: "Get all tickets for the authenticated user",
    responseExample: JSON.stringify([
      {
        id: 123,
        userId: 456,
        subject: "Server connection issue",
        status: "open",
        priority: "high",
        createdAt: "2025-04-28T15:30:00Z",
        updatedAt: "2025-04-28T16:45:00Z",
        lastMessageAt: "2025-04-28T16:45:00Z",
        messageCount: 3
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["tickets", "support"]
  },
  {
    method: "GET",
    path: "/api/tickets/:id",
    description: "Get details of a specific ticket",
    parameters: [
      { name: "id", type: "number", required: true, description: "The ticket ID", example: "123" }
    ],
    responseExample: JSON.stringify({
      id: 123,
      userId: 456,
      subject: "Server connection issue",
      status: "open",
      priority: "high",
      createdAt: "2025-04-28T15:30:00Z",
      updatedAt: "2025-04-28T16:45:00Z"
    }, null, 2),
    requiresAuth: true,
    tags: ["tickets", "support"]
  },
  {
    method: "POST",
    path: "/api/tickets",
    description: "Create a new support ticket with department selection",
    parameters: [
      { name: "subject", type: "string", required: true, description: "The ticket subject", example: "Server connection issue" },
      { name: "message", type: "string", required: true, description: "The initial ticket message", example: "I'm having trouble connecting to my server." },
      { name: "departmentId", type: "number", required: true, description: "The department ID for the ticket", example: "4" },
      { name: "priority", type: "string", required: false, description: "The ticket priority (low, medium, high)", example: "high" },
      { name: "vpsId", type: "number", required: false, description: "The VPS server ID (required if department is VPS-related)", example: "104" }
    ],
    responseExample: JSON.stringify({
      success: true,
      ticketId: 123,
      message: "Ticket created successfully. It will also be synced to Discord if integration is enabled."
    }, null, 2),
    requiresAuth: true,
    tags: ["tickets", "support", "discord", "virtfusion"]
  },
  {
    method: "GET",
    path: "/api/tickets/:id/messages",
    description: "Get all messages for a specific ticket",
    parameters: [
      { name: "id", type: "number", required: true, description: "The ticket ID", example: "123" }
    ],
    responseExample: JSON.stringify([
      {
        id: 456,
        ticketId: 123,
        userId: 789,
        message: "I'm having trouble connecting to my server.",
        createdAt: "2025-04-28T15:30:00Z",
        user: {
          id: 789,
          username: "johndoe",
          role: "user"
        }
      },
      {
        id: 457,
        ticketId: 123,
        userId: 1,
        message: "We'll look into this issue right away.",
        createdAt: "2025-04-28T16:45:00Z",
        user: {
          id: 1,
          username: "admin",
          role: "admin"
        }
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["tickets", "support", "messages"]
  },
  {
    method: "POST",
    path: "/api/tickets/:id/messages",
    description: "Add a message to a ticket (also syncs with Discord thread if enabled)",
    parameters: [
      { name: "id", type: "number", required: true, description: "The ticket ID", example: "123" },
      { name: "message", type: "string", required: true, description: "The message content", example: "Any updates on this issue?" }
    ],
    responseExample: JSON.stringify({
      success: true,
      messageId: 458,
      syncedToDiscord: true
    }, null, 2),
    requiresAuth: true,
    tags: ["tickets", "support", "messages", "discord"]
  },
  {
    method: "POST",
    path: "/api/tickets/:id/close",
    description: "Close a ticket (also updates Discord thread if enabled)",
    parameters: [
      { name: "id", type: "number", required: true, description: "The ticket ID", example: "123" }
    ],
    responseExample: JSON.stringify({
      success: true,
      ticketId: 123,
      status: "closed",
      discordThreadUpdated: true
    }, null, 2),
    requiresAuth: true,
    tags: ["tickets", "support", "discord"]
  },
  {
    method: "POST",
    path: "/api/tickets/:id/reopen",
    description: "Reopen a closed ticket (also updates Discord thread if enabled)",
    parameters: [
      { name: "id", type: "number", required: true, description: "The ticket ID", example: "123" }
    ],
    responseExample: JSON.stringify({
      success: true,
      ticketId: 123,
      status: "open",
      discordThreadUpdated: true
    }, null, 2),
    requiresAuth: true,
    tags: ["tickets", "support", "discord"]
  },
  {
    method: "GET",
    path: "/api/tickets/:id/download",
    description: "Download ticket conversation history as PDF",
    parameters: [
      { name: "id", type: "number", required: true, description: "The ticket ID", example: "123" }
    ],
    responseExample: "PDF binary data",
    requiresAuth: true,
    tags: ["tickets", "support", "export"]
  },
  {
    method: "GET",
    path: "/api/user",
    description: "Get information about the authenticated user",
    responseExample: JSON.stringify({
      success: true,
      data: {
        id: 456,
        username: "johndoe",
        email: "john@example.com",
        fullName: "John Doe",
        role: "user",
        credits: 100.50,
        virtFusionId: 123,
        isVerified: true,
        createdAt: "2025-01-15T10:30:00Z",
        updatedAt: "2025-04-20T14:15:00Z"
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "account"]
  },
  {
    method: "GET",
    path: "/api/user/usage",
    description: "Get resource usage for the authenticated user",
    responseExample: JSON.stringify({
      success: true,
      data: {
        servers: 3,
        total_cpu: 6,
        total_memory: 12288,
        total_disk: 240,
        bandwidth: {
          used: 128.5,
          limit: 1000,
          unit: "GB"
        }
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "usage"]
  },
  {
    method: "PUT",
    path: "/api/user/profile",
    description: "Update the current user's profile information",
    parameters: [
      {
        name: "fullName",
        type: "string",
        required: false,
        description: "The user's full name",
        example: "John Doe"
      },
      {
        name: "email",
        type: "string",
        required: false,
        description: "The user's email address",
        example: "john.doe@example.com"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: 1,
        username: "johndoe",
        fullName: "John Doe",
        email: "john.doe@example.com",
        role: "user",
        credits: 100,
        isVerified: true,
        isActive: true,
        createdAt: "2025-01-01T00:00:00Z",
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["profile", "account"],
  },
  {
    method: "POST",
    path: "/api/user/change-password",
    description: "Change the current user's password",
    parameters: [
      {
        name: "currentPassword",
        type: "string",
        required: true,
        description: "The user's current password",
        example: "YourCurrentPassword123"
      },
      {
        name: "newPassword",
        type: "string",
        required: true,
        description: "The new password to set",
        example: "YourNewPassword123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Password changed successfully",
    }, null, 2),
    requiresAuth: true,
    tags: ["security", "account"],
  },
  {
    method: "GET",
    path: "/api/verification-status",
    description: "Check if the user's email is verified",
    responseExample: JSON.stringify({
      verified: true
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "account"]
  },
  {
    method: "GET",
    path: "/api/user/ssh-keys",
    description: "Get SSH keys for the authenticated user",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "My SSH Key",
        publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB...",
        fingerprint: "SHA256:xyz123...",
        createdAt: "2025-05-01T12:00:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["user", "ssh-keys"]
  },
  {
    method: "POST",
    path: "/api/user/ssh-keys",
    description: "Add a new SSH key",
    parameters: [
      {
        name: "name",
        type: "string",
        required: true,
        description: "A name for the SSH key",
        example: "My Laptop"
      },
      {
        name: "publicKey",
        type: "string",
        required: true,
        description: "The SSH public key",
        example: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB..."
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      keyId: 1,
      message: "SSH key added successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "ssh-keys"]
  },
  {
    method: "DELETE",
    path: "/api/user/ssh-keys/:id",
    description: "Delete an SSH key",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The SSH key ID",
        example: "1"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "SSH key deleted successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "ssh-keys"]
  },
  {
    method: "GET",
    path: "/api/v1/me",
    description: "API-key authenticated endpoint to get current user information (requires 'read:user' scope)",
    responseExample: JSON.stringify({
      id: 1,
      username: "johndoe",
      email: "john@example.com",
      fullName: "John Doe",
      role: "user",
      isVerified: true,
      isActive: true
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "api-keys", "v1-api"]
  }
];

// Server endpoints
const serverEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/servers",
    description: "Get a list of all servers for the authenticated user",
    responseExample: JSON.stringify({
      success: true,
      data: [
        {
          id: 123,
          name: "web-server-01",
          status: "running",
          ip: "192.168.1.1",
          plan: "standard",
          location: "nyc1",
          created_at: "2025-04-01T12:00:00Z"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "list"]
  },
  {
    method: "GET",
    path: "/api/v1/servers",
    description: "API-key authenticated endpoint to get servers for a user (requires 'read:servers' scope)",
    responseExample: JSON.stringify({
      servers: [
        {
          id: 1,
          name: "Server 1",
          status: "running",
          created: "2025-05-07T06:22:00.000Z"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "api-keys", "v1-api"]
  },
  {
    method: "GET",
    path: "/api/servers/:id",
    description: "Get details for a specific server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      data: {
        id: 123,
        name: "web-server-01",
        status: "running",
        ip: "192.168.1.1",
        plan: "standard",
        location: "nyc1",
        cpu: 2,
        memory: 4096,
        disk: 80,
        bandwidth: {
          used: 128.5,
          limit: 1000,
          unit: "GB"
        },
        created_at: "2025-04-01T12:00:00Z"
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "details"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/power",
    description: "Perform a power action on a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "action",
        type: "string",
        required: true,
        description: "The power action to perform (start, stop, restart)",
        example: "restart"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server power action initiated",
      status: "processing"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "power"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/usage",
    description: "Get usage statistics for a specific server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "period",
        type: "string",
        required: false,
        description: "The time period for the statistics (day, week, month)",
        example: "week"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      data: {
        cpu: [
          { timestamp: "2025-04-01T12:00:00Z", value: 45.2 },
          { timestamp: "2025-04-01T13:00:00Z", value: 62.7 }
        ],
        memory: [
          { timestamp: "2025-04-01T12:00:00Z", value: 2048 },
          { timestamp: "2025-04-01T13:00:00Z", value: 2560 }
        ],
        disk: [
          { timestamp: "2025-04-01T12:00:00Z", value: 35.8 },
          { timestamp: "2025-04-01T13:00:00Z", value: 36.2 }
        ]
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "usage", "statistics"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/boot",
    description: "Boot a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server boot initiated"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "power"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/restart",
    description: "Restart a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server restart initiated"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "power"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/shutdown",
    description: "Shutdown a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server shutdown initiated"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "power"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/poweroff",
    description: "Power off a server (force)",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server poweroff initiated"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "power"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/reset-password",
    description: "Reset server root password",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "password",
        type: "string",
        required: true,
        description: "New password (minimum 8 characters)",
        example: "NewSecurePassword123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server password reset successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "security"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/vnc",
    description: "Get VNC console access URL for a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      vncUrl: "https://console.example.com/vnc/123?token=abcd1234",
      expires: "2025-05-01T12:00:00Z"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "console"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/traffic",
    description: "Get traffic statistics for a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      data: {
        inbound: 1024000000,
        outbound: 512000000,
        unit: "bytes",
        period: "last_24_hours"
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "traffic", "statistics"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/logs",
    description: "Get server logs",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      logs: [
        {
          timestamp: "2025-05-01T12:00:00Z",
          level: "info",
          message: "Server started successfully"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "logs"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/templates",
    description: "Get available OS templates for a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      templates: [
        {
          id: 1,
          name: "Ubuntu 22.04 LTS",
          version: "22.04",
          os: "ubuntu"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "templates"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/firewall/:interface",
    description: "Get firewall rules for a server interface",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "interface",
        type: "string",
        required: true,
        description: "Network interface name",
        example: "eth0"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      rules: [
        {
          port: 22,
          protocol: "tcp",
          action: "allow",
          source: "0.0.0.0/0"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "firewall", "security"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/backups",
    description: "Get available backups for a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      backups: [
        {
          id: 1,
          name: "daily-backup-2025-05-01",
          created: "2025-05-01T02:00:00Z",
          size: "10GB"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "backups"]
  },
  {
    method: "GET",
    path: "/api/servers/:id/notes",
    description: "Get notes for a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      notes: [
        {
          id: 1,
          title: "Server Configuration",
          content: "Updated nginx configuration",
          createdAt: "2025-05-01T12:00:00Z"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "notes"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/notes",
    description: "Add a note to a server",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "title",
        type: "string",
        required: true,
        description: "Note title",
        example: "Configuration Update"
      },
      {
        name: "content",
        type: "string",
        required: true,
        description: "Note content",
        example: "Updated nginx configuration for better performance"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      noteId: 1,
      message: "Note added successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "notes"]
  },
  {
    method: "PUT",
    path: "/api/servers/:id/notes/:noteId",
    description: "Update a server note",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "noteId",
        type: "number",
        required: true,
        description: "The note ID",
        example: "1"
      },
      {
        name: "title",
        type: "string",
        required: false,
        description: "Updated note title",
        example: "Configuration Update - Completed"
      },
      {
        name: "content",
        type: "string",
        required: false,
        description: "Updated note content",
        example: "Nginx configuration successfully updated and tested"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Note updated successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "notes"]
  },
  {
    method: "DELETE",
    path: "/api/servers/:id/notes/:noteId",
    description: "Delete a server note",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The server ID",
        example: "123"
      },
      {
        name: "noteId",
        type: "number",
        required: true,
        description: "The note ID",
        example: "1"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Note deleted successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "notes"]
  }
];

// Billing endpoints
const billingEndpoints: ApiEndpoint[] = [



  {
    method: "GET",
    path: "/api/transactions",
    description: "Get all transactions for the authenticated user",
    responseExample: JSON.stringify([
      {
        id: 123,
        userId: 456,
        amount: 29.99,
        type: "payment",
        status: "completed",
        description: "PayPal Credit Purchase",
        paymentMethod: "credit_card",
        paymentId: "ch_1Abc123Def456",
        createdAt: "2025-05-10T15:30:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["billing", "transactions"]
  },
  {
    method: "GET",
    path: "/api/transactions/:id",
    description: "Get details of a specific transaction",
    parameters: [
      { name: "id", type: "number", required: true, description: "The transaction ID", example: "123" }
    ],
    responseExample: JSON.stringify({
      id: 123,
      userId: 456,
      amount: 29.99,
      type: "payment",
      status: "completed",
      description: "PayPal Credit Purchase",
      paymentMethod: "credit_card",
      paymentId: "ch_1Abc123Def456",
      createdAt: "2025-05-10T15:30:00Z",

    }, null, 2),
    requiresAuth: true,
    tags: ["billing", "transactions"]
  },
  {
    method: "GET",
    path: "/api/billing/balance",
    description: "Get the current user's balance information",
    responseExample: JSON.stringify({
      credits: 100,
      virtFusionCredits: 100.50,
      virtFusionTokens: "10000.0000000000"
    }, null, 2),
    requiresAuth: true,
    tags: ["account", "credits"],
  },
  {
    method: "GET",
    path: "/api/v1/balance",
    description: "API-key authenticated endpoint to get user's balance (requires 'read:billing' scope)",
    responseExample: JSON.stringify({
      credits: 100,
      currency: "USD"
    }, null, 2),
    requiresAuth: true,
    tags: ["account", "credits", "api-keys", "v1-api"],
  },

  {
    method: "GET",
    path: "/api/billing/usage/last30days",
    description: "Get the user's usage for the last 30 days",
    responseExample: JSON.stringify({
      usage: 25.5,
      rawData: {
        period: "May 2025",
        monthlyTotal: {
          hours: 255,
          value: "25.50",
          tokens: false
        }
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["usage", "stats"],
  },
  {
    method: "GET",
    path: "/api/billing/transactions",
    description: "Get a list of the user's transactions",
    responseExample: JSON.stringify([
      {
        id: 1,
        amount: 50,
        type: "deposit",
        description: "Credit purchase",
        status: "completed",
        paymentMethod: "paypal",
        paymentId: "PAY-1234567890",
        createdAt: "2025-01-01T00:00:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["transactions", "payments"],
  },
  {
    method: "POST",
    path: "/api/billing/credits/add",
    description: "Add credits to the account",
    parameters: [
      {
        name: "amount",
        type: "number",
        required: true,
        description: "The amount of credits to add",
        example: 50
      },
      {
        name: "payment_method",
        type: "string",
        required: true,
        description: "The payment method to use",
        example: "credit_card"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      data: {
        transaction_id: "tx_123456",
        added_credits: 50,
        new_balance: 150.50
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["billing", "credits"]
  }
];

// DNS endpoints
const dnsEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/dns/domains",
    description: "Get all DNS domains for the authenticated user",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "example.com",
        status: "active",
        recordCount: 5,
        createdAt: "2025-05-01T12:00:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["dns", "domains"]
  },
  {
    method: "POST",
    path: "/api/dns/domains",
    description: "Add a new DNS domain",
    parameters: [
      {
        name: "domain",
        type: "string",
        required: true,
        description: "The domain name to add",
        example: "example.com"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      domainId: 1,
      message: "Domain added successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["dns", "domains"]
  },
  {
    method: "DELETE",
    path: "/api/dns/domains/:id",
    description: "Delete a DNS domain",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The domain ID",
        example: "1"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Domain deleted successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["dns", "domains"]
  },
  {
    method: "GET",
    path: "/api/dns/domains/:id/records",
    description: "Get DNS records for a domain",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The domain ID",
        example: "1"
      }
    ],
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "@",
        type: "A",
        content: "192.168.1.1",
        ttl: 300,
        priority: null
      },
      {
        id: 2,
        name: "www",
        type: "CNAME",
        content: "example.com",
        ttl: 300,
        priority: null
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["dns", "records"]
  },
  {
    method: "POST",
    path: "/api/dns/domains/:id/records",
    description: "Add a DNS record to a domain",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The domain ID",
        example: "1"
      },
      {
        name: "name",
        type: "string",
        required: true,
        description: "Record name",
        example: "www"
      },
      {
        name: "type",
        type: "string",
        required: true,
        description: "Record type (A, AAAA, CNAME, MX, TXT)",
        example: "A"
      },
      {
        name: "content",
        type: "string",
        required: true,
        description: "Record content",
        example: "192.168.1.1"
      },
      {
        name: "ttl",
        type: "number",
        required: false,
        description: "Time to live in seconds",
        example: "300"
      },
      {
        name: "priority",
        type: "number",
        required: false,
        description: "Priority (for MX records)",
        example: "10"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      recordId: 1,
      message: "DNS record added successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["dns", "records"]
  },
  {
    method: "PUT",
    path: "/api/dns/domains/:domainId/records/:recordId",
    description: "Update a DNS record",
    parameters: [
      {
        name: "domainId",
        type: "number",
        required: true,
        description: "The domain ID",
        example: "1"
      },
      {
        name: "recordId",
        type: "number",
        required: true,
        description: "The record ID",
        example: "1"
      },
      {
        name: "name",
        type: "string",
        required: false,
        description: "Updated record name",
        example: "api"
      },
      {
        name: "content",
        type: "string",
        required: false,
        description: "Updated record content",
        example: "192.168.1.2"
      },
      {
        name: "ttl",
        type: "number",
        required: false,
        description: "Updated TTL",
        example: "600"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "DNS record updated successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["dns", "records"]
  },
  {
    method: "DELETE",
    path: "/api/dns/domains/:domainId/records/:recordId",
    description: "Delete a DNS record",
    parameters: [
      {
        name: "domainId",
        type: "number",
        required: true,
        description: "The domain ID",
        example: "1"
      },
      {
        name: "recordId",
        type: "number",
        required: true,
        description: "The record ID",
        example: "1"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "DNS record deleted successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["dns", "records"]
  },
  {
    method: "GET",
    path: "/api/dns-plans",
    description: "Get available DNS plans",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "Basic",
        description: "Basic DNS hosting",
        price: 0,
        maxDomains: 5,
        maxRecords: 50,
        features: ["Basic DNS", "Email Support"]
      },
      {
        id: 2,
        name: "Pro",
        description: "Professional DNS hosting",
        price: 5.00,
        maxDomains: 25,
        maxRecords: 500,
        features: ["Advanced DNS", "Priority Support", "API Access"]
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["dns", "plans"]
  },
  {
    method: "GET",
    path: "/api/dns-plans/subscriptions",
    description: "Get user's DNS plan subscriptions",
    responseExample: JSON.stringify([
      {
        id: 1,
        planId: 2,
        planName: "Pro",
        status: "active",
        expiresAt: "2025-06-01T00:00:00Z",
        autoRenew: true
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["dns", "plans", "subscriptions"]
  },
  {
    method: "POST",
    path: "/api/dns-plans/purchase",
    description: "Purchase a DNS plan",
    parameters: [
      {
        name: "planId",
        type: "number",
        required: true,
        description: "The plan ID to purchase",
        example: "2"
      },
      {
        name: "duration",
        type: "number",
        required: true,
        description: "Duration in months",
        example: "12"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      subscriptionId: 1,
      message: "DNS plan purchased successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["dns", "plans", "purchase"]
  }
];

// Coupon endpoints
const couponEndpoints: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/coupons/claim",
    description: "Claim a coupon code for credits or discounts",
    parameters: [
      {
        name: "code",
        type: "string",
        required: true,
        description: "The coupon code to claim",
        example: "SAVE20"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Coupon claimed successfully",
      creditsAdded: 20,
      discount: 20
    }, null, 2),
    requiresAuth: true,
    tags: ["coupons", "billing"]
  },
  {
    method: "GET",
    path: "/api/coupons/history",
    description: "Get coupon claim history for the authenticated user",
    responseExample: JSON.stringify([
      {
        id: 1,
        code: "SAVE20",
        claimedAt: "2025-05-01T12:00:00Z",
        value: 20,
        type: "credits"
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["coupons", "history"]
  }
];

// OAuth endpoints  
const oauthEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/oauth/providers/enabled/public",
    description: "Get publicly available OAuth providers (no authentication required)",
    responseExample: JSON.stringify([
      {
        name: "google",
        displayName: "Google",
        enabled: true
      },
      {
        name: "github",
        displayName: "GitHub", 
        enabled: true
      }
    ], null, 2),
    requiresAuth: false,
    tags: ["oauth", "authentication", "public"]
  },
  {
    method: "GET",
    path: "/api/oauth/login/:providerName",
    description: "Initiate OAuth login with a provider",
    parameters: [
      {
        name: "providerName",
        type: "string",
        required: true,
        description: "OAuth provider name (google, github, discord, etc.)",
        example: "google"
      }
    ],
    responseExample: JSON.stringify({
      redirectUrl: "https://accounts.google.com/oauth/authorize?client_id=..."
    }, null, 2),
    requiresAuth: false,
    tags: ["oauth", "authentication"]
  },
  {
    method: "GET",
    path: "/api/oauth/accounts",
    description: "Get linked OAuth accounts for the authenticated user",
    responseExample: JSON.stringify([
      {
        provider: "google",
        email: "user@gmail.com",
        linkedAt: "2025-05-01T12:00:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["oauth", "account"]
  },
  {
    method: "DELETE",
    path: "/api/oauth/accounts/:providerName",
    description: "Unlink an OAuth account",
    parameters: [
      {
        name: "providerName",
        type: "string",
        required: true,
        description: "OAuth provider name to unlink",
        example: "google"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "OAuth account unlinked successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["oauth", "account"]
  }
];

// API key management endpoints
const apiKeyEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/user/api-keys",
    description: "Retrieve API keys for the authenticated user",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "My API Key",
        scopes: ["read:user", "read:servers"],
        lastUsed: "2025-04-20T14:15:00Z",
        createdAt: "2025-04-15T10:30:00Z",
        expiresAt: null,
        active: true
      }
    ], null, 2),
    requiresAuth: true,
    tags: ["api-keys"]
  },
  {
    method: "POST",
    path: "/api/user/api-keys",
    description: "Generate a new API key",
    parameters: [
      { name: "name", type: "string", required: true, description: "A user-friendly name for the API key", example: "My Application" },
      { name: "scopes", type: "array", required: true, description: "Array of permission scopes for the API key", example: '["read:user", "read:servers"]' },
      { name: "expiresIn", type: "number", required: false, description: "Days until expiration (null for never)", example: 90 }
    ],
    responseExample: JSON.stringify({
      success: true,
      key: "sk_live_abcd1234...",
      id: 2,
      name: "My API Key",
      scopes: ["read:user", "read:servers"],
      expiresAt: "2025-07-20T00:00:00Z"
    }, null, 2),
    requiresAuth: true,
    tags: ["api-keys"]
  },
  {
    method: "DELETE",
    path: "/api/user/api-keys/:id",
    description: "Delete an API key",
    parameters: [
      { name: "id", type: "number", required: true, description: "The API key ID", example: "1" }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "API key deleted successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["api-keys"]
  },
  {
    method: "PUT",
    path: "/api/user/api-keys/:id/revoke",
    description: "Revoke an API key (deactivate it without deleting)",
    parameters: [
      { name: "id", type: "number", required: true, description: "The API key ID", example: "1" }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "API key revoked successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["api-keys"]
  },
  {
    method: "GET",
    path: "/api/validate-key",
    description: "Validate an API key and return its associated user and scope information",
    responseExample: JSON.stringify({
      valid: true,
      userId: 123,
      scopes: ["read:user", "read:servers"],
      expiresAt: "2025-07-20T00:00:00Z"
    }, null, 2),
    requiresAuth: true,
    tags: ["api-keys", "authentication"]
  }
];

// Admin endpoints
const adminEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/admin/settings",
    description: "Get all application settings including Discord integration settings",
    responseExample: JSON.stringify([
      {
        id: 1,
        key: "company_name",
        value: "SkyVPS360",
        isPublic: true
      },
      {
        id: 2,
        key: "discord_webhook_url",
        value: "https://discord.com/api/webhooks/123456789/abcdef",
        isPublic: false
      },
      {
        id: 3,
        key: "discord_bot_token",
        value: "••••••••••••••••••••••••••••••••••••••••••••",
        isPublic: false
      },
      {
        id: 4,
        key: "discord_guild_id",
        value: "123456789012345678",
        isPublic: false
      },
      {
        id: 5,
        key: "discord_channel_id",
        value: "123456789012345678",
        isPublic: false
      },
      {
        id: 6,
        key: "discord_allowed_role_ids",
        value: "123456789012345678,876543210987654321",
        isPublic: false
      },
      {
        id: 7,
        key: "discord_allowed_user_ids",
        value: "123456789012345678,876543210987654321",
        isPublic: false
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "settings", "discord"],
  },
  {
    method: "GET",
    path: "/api/admin/discord/ticket-threads",
    description: "Get a list of all Discord ticket threads for monitoring and management",
    responseExample: JSON.stringify([
      {
        id: 1,
        ticketId: 123,
        threadId: "123456789012345678",
        channelId: "876543210987654321",
        createdAt: "2025-05-01T10:00:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "discord", "tickets"],
  },
  {
    method: "POST",
    path: "/api/admin/discord/test-connection",
    description: "Test the Discord bot connection with current settings and permissions",
    responseExample: JSON.stringify({
      success: true,
      connected: true,
      botUsername: "SkyVPS360 Support",
      guildName: "SkyVPS360 Team",
      permissionSettings: {
        allowedRoles: ["Support Team", "Administrators"],
        allowedRoleIds: ["123456789012345678", "876543210987654321"],
        allowedUserIds: ["123456789012345678", "876543210987654321"]
      }
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "discord", "settings"],
  },
  {
    method: "GET",
    path: "/api/admin/discord/permissions",
    description: "Get Discord permission settings for ticket command access",
    responseExample: JSON.stringify({
      allowedRoleIds: ["123456789012345678", "876543210987654321"],
      allowedUserIds: ["123456789012345678", "876543210987654321"],
      effectivePermissions: {
        rolesAllowed: [
          { id: "123456789012345678", name: "Support Team" },
          { id: "876543210987654321", name: "Administrators" }
        ],
        usersAllowed: [
          { id: "123456789012345678", username: "support_manager" },
          { id: "876543210987654321", username: "admin_user" }
        ]
      }
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "discord", "permissions"],
  },
  {
    method: "PUT",
    path: "/api/admin/settings/:key",
    description: "Update a specific setting, including Discord permission settings",
    parameters: [
      {
        name: "key",
        type: "string",
        required: true,
        description: "The setting key to update",
        example: "discord_allowed_role_ids"
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "The new value for the setting",
        example: "123456789012345678,876543210987654321"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Setting updated successfully"
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "settings", "discord"],
  },
  {
    method: "GET",
    path: "/api/admin/tickets",
    description: "Get all tickets in the system (for admin monitoring)",
    responseExample: JSON.stringify([
      {
        id: 123,
        userId: 456,
        user: {
          username: "johndoe",
          email: "john@example.com"
        },
        subject: "Server connection issue",
        status: "open",
        priority: "high",
        createdAt: "2025-04-28T15:30:00Z",
        updatedAt: "2025-04-28T16:45:00Z",
        lastMessageAt: "2025-04-28T16:45:00Z",
        messageCount: 3,
        hasDiscordThread: true,
        discordThreadId: "123456789012345678"
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "tickets", "support"]
  },

  {
    method: "GET",
    path: "/api/admin/transactions",
    description: "Get all transactions in the system (for admin monitoring)",
    responseExample: JSON.stringify([
      {
        id: 123,
        userId: 456,
        user: {
          username: "johndoe",
          email: "john@example.com"
        },
        amount: 29.99,
        type: "payment",
        status: "completed",
        description: "Payment for server credits",
        paymentMethod: "credit_card",
        paymentId: "ch_1Abc123Def456",
        createdAt: "2025-05-10T15:30:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "billing", "transactions"]
  },
  {
    method: "GET",
    path: "/api/admin/users",
    description: "Get a list of all users in the system",
    responseExample: JSON.stringify([
      {
        id: 1,
        username: "johndoe",
        fullName: "John Doe",
        email: "john.doe@example.com",
        role: "user",
        credits: 100,
        isVerified: true,
        isActive: true,
        createdAt: "2025-01-01T00:00:00Z",
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "users"],
  },
  {
    method: "GET",
    path: "/api/admin/users/:id",
    description: "Get details for a specific user",
    parameters: [
      {
        name: "id",
        type: "number",
        required: true,
        description: "The user ID",
        example: "1"
      }
    ],
    responseExample: JSON.stringify({
      id: 1,
      username: "johndoe",
      fullName: "John Doe",
      email: "john.doe@example.com",
      role: "user",
      credits: 100,
      isVerified: true,
      isActive: true,
      createdAt: "2025-01-01T00:00:00Z",
      servers: [
        {
          id: 1,
          name: "web-server-01",
          status: "running"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "users"],
  },
  {
    method: "POST",
    path: "/api/maintenance/toggle",
    description: "Toggle maintenance mode for the platform",
    parameters: [
      {
        name: "enabled",
        type: "boolean",
        required: true,
        description: "Whether to enable or disable maintenance mode",
        example: true
      },
      {
        name: "message",
        type: "string",
        required: false,
        description: "Message to display to users during maintenance",
        example: "System maintenance in progress"
      },
      {
        name: "estimatedCompletion",
        type: "string",
        required: false,
        description: "Estimated date/time when maintenance will be complete",
        example: "2025-05-03T01:30:00Z"
      }
    ],
    responseExample: JSON.stringify({
      success: true,
      enabled: true,
      message: "System maintenance in progress",
      estimatedCompletion: "2025-05-03T01:30:00Z"
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "system"]
  }
];

// Public endpoints
const publicEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/public/service-status",
    description: "Retrieve real-time status information for all platform services",
    responseExample: JSON.stringify({
      overall: "operational",
      services: [
        {
          name: "API Services",
          status: "operational",
          uptimePercentage: 99.98
        },
        {
          name: "Network",
          status: "operational",
          uptimePercentage: 99.99
        },
        {
          name: "Storage Services",
          status: "degraded",
          uptimePercentage: 98.76
        },
        {
          name: "Compute",
          status: "operational",
          uptimePercentage: 99.97
        }
      ]
    }, null, 2),
    requiresAuth: false,
    tags: ["status", "monitoring", "public"]
  },
  {
    method: "GET",
    path: "/api/public/platform-stats",
    description: "Retrieve platform statistics including server and hypervisor counts",
    responseExample: JSON.stringify({
      serverCount: 48989,
      hypervisorCount: 501,
      activeServerCount: 45631,
      uptime: "99.99%"
    }, null, 2),
    requiresAuth: false,
    tags: ["statistics", "public"]
  },
  {
    method: "GET",
    path: "/api/plan-features",
    description: "Retrieve all active plan features without authentication",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "SSD Storage",
        description: "High-performance SSD storage for fast read/write operations",
        icon: "hard-drive",
        category: "storage",
        isHighlight: true,
        isActive: true
      },
      {
        id: 2,
        name: "24/7 Support",
        description: "Round-the-clock technical support via tickets and live chat",
        icon: "headset",
        category: "support",
        isHighlight: true,
        isActive: true
      }
    ], null, 2),
    requiresAuth: false,
    tags: ["plans", "features", "public"]
  },
  {
    method: "GET",
    path: "/api/public/packages",
    description: "Retrieve available packages for the platform",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "Starter",
        description: "Basic package for small workloads",
        price: 5.99,
        features: ["1 CPU", "1GB RAM", "25GB Storage"]
      },
      {
        id: 2,
        name: "Professional",
        description: "Recommended for most users",
        price: 15.99,
        features: ["2 CPU", "4GB RAM", "50GB Storage"]
      }
    ], null, 2),
    requiresAuth: false,
    tags: ["products", "pricing", "public"]
  },
  {
    method: "GET",
    path: "/api/datacenter-locations",
    description: "Retrieve list of available datacenter locations",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "New York",
        code: "nyc1",
        latitude: 40.7128,
        longitude: -74.0060,
        status: "active",
        countryCode: "US",
        continent: "North America",
        countryName: "United States"
      }
    ], null, 2),
    requiresAuth: false,
    tags: ["infrastructure"]
  }
];

// Main API Documentation page
export default function ApiDocsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Query for settings
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings/public"],
  });

  // Query for API keys
  const { data: apiKeys = [] } = useQuery<any[]>({
    queryKey: ["/api/user/api-keys"],
    onError: (error) => {
      console.error("Error fetching API keys:", error);
    }
  });

  // Create context value for child components
  const apiDocsContextValue: ApiDocsContextType = {
    activeTab,
    setActiveTab
  };

  // Function to get company name from settings
  const getCompanyName = (): string => {
    return settings.company_name || 'SkyVPS360';
  };

  // Search function
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchInputRef.current?.value || "";
    setSearchTerm(term);
  };

  // Tag filter handler
  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Clear search
  const clearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
    setSearchTerm("");
  };

  // Reset filters
  const resetFilters = () => {
    clearSearch();
    setSelectedTags([]);
  };

  // Filter endpoints based on search term
  const getFilteredEndpoints = (endpoints: ApiEndpoint[]) => {
    if (!searchTerm) return endpoints;

    return endpoints.filter(endpoint =>
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Get all unique tags from all endpoints
  const getAllTags = (): string[] => {
    const allTags = new Set<string>();

    [...userEndpoints, ...serverEndpoints, ...billingEndpoints, ...apiKeyEndpoints, ...adminEndpoints, ...publicEndpoints].forEach(endpoint => {
      endpoint.tags?.forEach(tag => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  };

  // No API key selection - removed

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            Learn how to integrate your applications with the {getCompanyName()} API.
          </p>
        </div>

        <ApiDocsContext.Provider value={apiDocsContextValue}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex justify-between flex-col md:flex-row gap-4">
              <TabsList>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>User</span>
                </TabsTrigger>
                <TabsTrigger value="servers" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span>Servers</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Billing</span>
                </TabsTrigger>
                <TabsTrigger value="dns" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>DNS</span>
                </TabsTrigger>
                <TabsTrigger value="coupons" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Coupons</span>
                </TabsTrigger>
                <TabsTrigger value="oauth" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span>OAuth</span>
                </TabsTrigger>
                <TabsTrigger value="api-keys" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span>API Keys</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span>Admin</span>
                </TabsTrigger>
                <TabsTrigger value="public" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>Public</span>
                </TabsTrigger>
              </TabsList>

              {activeTab !== "overview" && activeTab !== "api-keys" && (
                <div className="flex space-x-2">
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      ref={searchInputRef}
                      placeholder="Search endpoints..."
                      className="pr-10 h-9"
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>
                  {(searchTerm || selectedTags.length > 0) && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              )}
            </div>

            <TabsContent value="overview" className="space-y-6">
              <EndpointOverview />
            </TabsContent>

            <TabsContent value="user" className="space-y-6">
              <ApiCategory
                title="User Endpoints"
                description="Access and manage user account information, settings, and usage statistics."
                endpoints={getFilteredEndpoints(userEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="servers" className="space-y-6">
              <ApiCategory
                title="Server Endpoints"
                description="Manage your virtual servers, get status information, and perform server operations."
                endpoints={getFilteredEndpoints(serverEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <ApiCategory
                title="Billing Endpoints"
                description="Manage billing information, view invoices, and add credits to your account."
                endpoints={getFilteredEndpoints(billingEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="dns" className="space-y-6">
              <ApiCategory
                title="DNS Management"
                description="Endpoints for managing DNS domains and records."
                endpoints={getFilteredEndpoints(dnsEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="coupons" className="space-y-6">
              <ApiCategory
                title="Coupon Management"
                description="Endpoints for claiming and managing discount coupons."
                endpoints={getFilteredEndpoints(couponEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="oauth" className="space-y-6">
              <ApiCategory
                title="OAuth Authentication"
                description="Endpoints for OAuth provider integration and social login."
                endpoints={getFilteredEndpoints(oauthEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-6">
              <ApiKeyManagement />
              <ApiCategory
                title="API Key Management Endpoints"
                description="Programmatically manage your API keys."
                endpoints={getFilteredEndpoints(apiKeyEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="admin" className="space-y-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Admin Access</CardTitle>
                  <CardDescription>
                    These endpoints are only accessible to administrators.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert variant="warning" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Admin Only</AlertTitle>
                    <AlertDescription>
                      These endpoints require administrator privileges. Regular user API keys cannot access them.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <ApiCategory
                title="Admin Endpoints"
                description="Endpoints for system administration and user management."
                endpoints={getFilteredEndpoints(adminEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="public" className="space-y-6">
              <ApiCategory
                title="Public Endpoints"
                description="Public endpoints that don't require authentication."
                endpoints={getFilteredEndpoints(publicEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>
          </Tabs>
        </ApiDocsContext.Provider>
      </div>
    </DashboardLayout>
  );
}