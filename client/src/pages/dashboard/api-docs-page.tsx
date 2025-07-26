import React, { useState, useMemo, createContext, useContext, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Code, Search, Tag, X, Key, Server, CreditCard, User, Globe, Gift, Ticket, Copy, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2, RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet";

// Types
interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: ApiParameter[];
  responseExample: string;
  requiresAuth: boolean;
  adminOnly?: boolean;
  tags?: string[];
  scopes?: string[];
}

interface ApiCategoryProps {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
  onTagSelect: (tag: string) => void;
  selectedTags: string[];
}

interface ApiScope {
  name: string;
  description: string;
}

// Context for API documentation
interface ApiDocsContextType {
  setActiveTab: (tab: string) => void;
  apiScopes: ApiScope[];
}

const ApiDocsContext = createContext<ApiDocsContextType | undefined>(undefined);

const useApiDocsContext = () => {
  const context = useContext(ApiDocsContext);
  if (!context) {
    throw new Error('useApiDocsContext must be used within ApiDocsProvider');
  }
  return context;
};

// Method color mapping
const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'POST':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PUT':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'PATCH':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Copy to clipboard utility function
const copyToClipboard = async (text: string, label: string, toastFn: any) => {
  try {
    await navigator.clipboard.writeText(text);
    toastFn({
      title: "Success",
      description: `${label} copied to clipboard!`,
    });
  } catch (err) {
    toastFn({
      title: "Error",
      description: "Failed to copy to clipboard",
      variant: "destructive",
    });
  }
};

// Endpoint Card Component
const EndpointCard = ({ endpoint, onTagSelect, toast }: { endpoint: ApiEndpoint; onTagSelect: (tag: string) => void; toast: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getCurlCommand = () => {
    const baseUrl = window.location.origin;
    let curlCommand = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`;
    
    if (endpoint.requiresAuth) {
      curlCommand += ` \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
    }
    
    curlCommand += ` \\
  -H "Content-Type: application/json"`;
    
    if (endpoint.method !== 'GET' && endpoint.parameters && endpoint.parameters.length > 0) {
      const bodyParams = endpoint.parameters.filter(p => p.required);
      if (bodyParams.length > 0) {
        const exampleBody = bodyParams.reduce((acc, param) => {
          acc[param.name] = param.example || `"${param.type} value"`;
          return acc;
        }, {} as Record<string, any>);
        
        curlCommand += ` \\
  -d '${JSON.stringify(exampleBody, null, 2)}'`;
      }
    }
    
    return curlCommand;
  };
  
  const getJavaScriptExample = () => {
    const baseUrl = window.location.origin;
    let jsCode = `// Using fetch API\nconst response = await fetch('${baseUrl}${endpoint.path}', {\n  method: '${endpoint.method}',\n  headers: {`;
    
    if (endpoint.requiresAuth) {
      jsCode += `\n    'Authorization': 'Bearer YOUR_API_KEY',`;
    }
    
    jsCode += `\n    'Content-Type': 'application/json'\n  }`;
    
    if (endpoint.method !== 'GET' && endpoint.parameters && endpoint.parameters.length > 0) {
      const bodyParams = endpoint.parameters.filter(p => p.required);
      if (bodyParams.length > 0) {
        const exampleBody = bodyParams.reduce((acc, param) => {
          acc[param.name] = param.example || `"${param.type} value"`;
          return acc;
        }, {} as Record<string, any>);
        
        jsCode += `,\n  body: JSON.stringify(${JSON.stringify(exampleBody, null, 4)})`;
      }
    }
    
    jsCode += `\n});\n\nconst data = await response.json();\nconsole.log(data);`;
    return jsCode;
  };

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${getMethodColor(endpoint.method)} font-mono text-sm px-3 py-1 font-semibold`}>
                {endpoint.method}
              </Badge>
              <code className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md font-mono border">
                {endpoint.path}
              </code>
              {endpoint.adminOnly && (
                <Badge variant="destructive" className="text-xs">
                  Admin Only
                </Badge>
              )}
              {endpoint.requiresAuth && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  Auth Required
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {endpoint.description}
            </CardTitle>
            {endpoint.scopes && endpoint.scopes.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Required scopes: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {endpoint.scopes.map((scope, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        
        {endpoint.tags && endpoint.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {endpoint.tags.map((tag, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                onClick={() => onTagSelect(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  Parameters
                </h4>
                <div className="space-y-3">
                  {endpoint.parameters.map((param, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {param.name}
                        </code>
                        <Badge variant={param.required ? "default" : "secondary"} className="text-xs font-medium">
                          {param.required ? "Required" : "Optional"}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800">
                          {param.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{param.description}</p>
                      {param.example && (
                        <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded border">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Example: </span>
                          <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono">
                            {param.example}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-green-600" />
                Code Examples
              </h4>
              
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="curl-example" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="font-medium">cURL</span>
                      <Badge variant="outline" className="text-xs">Terminal</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getCurlCommand(), 'cURL command', toast)}
                          className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="rounded-md bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm overflow-x-auto border">
                        <pre className="text-green-400 whitespace-pre-wrap">{getCurlCommand()}</pre>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="javascript-example" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">JavaScript</span>
                      <Badge variant="outline" className="text-xs">Fetch API</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getJavaScriptExample(), 'JavaScript code', toast)}
                          className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="rounded-md bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm overflow-x-auto border">
                        <pre className="text-blue-400 whitespace-pre-wrap">{getJavaScriptExample()}</pre>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="response-example" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Response Example</span>
                      <Badge variant="outline" className="text-xs">JSON</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(endpoint.responseExample, 'Response example', toast)}
                          className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="rounded-md bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm overflow-x-auto border">
                        <pre className="text-emerald-400 whitespace-pre-wrap">{endpoint.responseExample}</pre>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// API Category Component
const ApiCategory = ({ title, description, endpoints, onTagSelect, selectedTags, toast }: ApiCategoryProps & { toast: any }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  // Filter endpoints by selected tags
  const filteredEndpoints = endpoints.filter(endpoint =>
    selectedTags.length === 0 ||
    (endpoint.tags && endpoint.tags.some(tag => selectedTags.includes(tag)))
  );

  // Get category icon based on title
  const getCategoryIcon = (title: string) => {
    switch (title.toLowerCase()) {
      case 'user management':
        return <User className="h-6 w-6" />;
      case 'server management':
        return <Server className="h-6 w-6" />;
      case 'billing & transactions':
        return <CreditCard className="h-6 w-6" />;
      case 'api keys':
        return <Key className="h-6 w-6" />;
      case 'coupons':
        return <Gift className="h-6 w-6" />;
      default:
        return <Globe className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                {getCategoryIcon(title)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700">
                    {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? 's' : ''}
                  </Badge>
                  {filteredEndpoints.length !== endpoints.length && (
                    <Badge variant="secondary" className="text-xs">
                      {endpoints.length - filteredEndpoints.length} filtered
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-4">
            {filteredEndpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <AlertCircle className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
                <h4 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">No Endpoints Found</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  No endpoints match your current filters. Try changing or clearing your filters to see more results.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} onTagSelect={onTagSelect} toast={toast} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// API Endpoint Overview
const EndpointOverview = () => {
  const { setActiveTab, apiScopes } = useApiDocsContext();

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
          <div className="flex flex-col gap-2 mt-4">
            <h4 className="font-medium">Rate Limiting</h4>
            <p className="text-sm">
              API requests are limited to 100 requests per minute per API key. If you exceed this limit,
              you'll receive a 429 Too Many Requests response.
            </p>

            <h4 className="font-medium mt-2">Response Format</h4>
            <p className="text-sm">
              All API responses are returned in JSON format. Successful responses typically include
              a data field containing the requested information. Error responses include an error
              field with a message describing the error.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Scopes</CardTitle>
          <CardDescription>
            Understanding the permissions required for different API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            API keys are created with specific scopes that determine what actions they can perform. When creating an API key,
            you'll need to select which scopes to include. Below is a list of available scopes and what they allow:
          </p>

          <div className="mt-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium">Scope</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {apiScopes.map((scope, index) => (
                  <tr key={index} className={index !== apiScopes.length - 1 ? "border-b" : ""}>
                    <td className="px-4 py-2 font-mono text-xs">{scope.name}</td>
                    <td className="px-4 py-2">{scope.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-amber-50 text-amber-800 rounded-md flex gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <h4 className="font-medium">Important</h4>
              <p className="text-sm">
                Always follow the principle of least privilege when creating API keys. Only grant the minimum
                scopes necessary for your integration to function.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
          <CardDescription>
            Understanding API error responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            When an API request fails, the response will include an HTTP status code and a JSON body with error details.
            Common error status codes include:
          </p>

          <div className="mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium">Status Code</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">400</td>
                  <td className="px-4 py-2">Bad Request - The request was malformed or invalid</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">401</td>
                  <td className="px-4 py-2">Unauthorized - Authentication is required or failed</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">403</td>
                  <td className="px-4 py-2">Forbidden - Your API key lacks the required scope</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">404</td>
                  <td className="px-4 py-2">Not Found - The requested resource doesn't exist</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">429</td>
                  <td className="px-4 py-2">Too Many Requests - Rate limit exceeded</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">500</td>
                  <td className="px-4 py-2">Internal Server Error - Something went wrong on our end</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <h4 className="font-medium">Example Error Response</h4>
            <div className="bg-muted p-3 rounded-md font-mono text-xs mt-2 overflow-x-auto">
              <pre>{JSON.stringify({
                error: {
                  code: "invalid_scope",
                  message: "The API key does not have the required scope to access this resource",
                  required_scope: "write:servers"
                }
              }, null, 2)}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// API Key Management Component
const ApiKeyManagement = () => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expirationDays, setExpirationDays] = useState<number | null>(90);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewApiKey, setShowNewApiKey] = useState(false);

  const availableScopes = [
    { value: "read:user", label: "Read user information", description: "Access user profile and account information" },
    { value: "read:servers", label: "Read server information", description: "View server details, status, and configurations" },
    { value: "write:servers", label: "Modify servers", description: "Create, update, restart, and manage servers" },
    { value: "read:billing", label: "Read billing information", description: "View billing history, invoices, and credit balance" },
    { value: "write:billing", label: "Modify billing", description: "Add credits and manage billing settings" },
    { value: "read:tickets", label: "Read support tickets", description: "View support tickets and messages" },
    { value: "write:tickets", label: "Manage support tickets", description: "Create, update, and respond to support tickets" }
  ];

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      setNewApiKey(data.key || data.apiKey);
      setShowNewApiKey(true);

      // Reset form
      setNewKeyName('');
      setSelectedScopes([]);
      setExpirationDays(90);

      // Refetch keys
      await fetchApiKeys();

      toast({
        title: "API Key Created",
        description: "Your new API key has been created successfully.",
      });

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

      await fetchApiKeys();

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
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard.",
    });
  };

  // Format date
  const formatDate = (date: Date | null | string) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  // Load API keys on component mount
  useEffect(() => {
    fetchApiKeys();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading API keys...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-muted-foreground">
            Create and manage API keys for secure access to the API.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys ({apiKeys.length})
          </CardTitle>
          <CardDescription>
            Manage your API keys for accessing the API programmatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any API keys yet. Create one to start using the API.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{key.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Created: {formatDate(key.createdAt)}</span>
                          {key.lastUsed && (
                            <>
                              <span>•</span>
                              <span>Last used: {formatDate(key.lastUsed)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={key.isActive || key.active ? "default" : "secondary"}>
                        {key.isActive || key.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteApiKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Key Prefix</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {key.prefix}...
                        </code>
                        <span className="text-sm text-muted-foreground">
                          (Only prefix shown for security)
                        </span>
                      </div>
                    </div>
                    
                    {key.scopes && key.scopes.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Scopes</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {key.scopes.map((scope: string) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {key.expiresAt && (
                      <div>
                        <Label className="text-sm font-medium">Expires</Label>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(key.expiresAt)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to access the API. Choose the appropriate scopes for your use case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">API Key Name</Label>
              <Input
                id="key-name"
                placeholder="My Application"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to help you identify this key later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration</Label>
              <Select value={expirationDays?.toString() || "never"} onValueChange={(value) => setExpirationDays(value === "never" ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Permissions (Scopes)</Label>
              <p className="text-sm text-muted-foreground">
                Select the permissions this API key should have. Only grant the minimum permissions needed.
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-3">
                {availableScopes.map((scope) => (
                  <div key={scope.value} className="flex items-start space-x-3">
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
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={scope.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {scope.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {scope.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApiKey} disabled={!newKeyName.trim() || selectedScopes.length === 0}>
              Create API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New API Key Display Dialog */}
      <Dialog open={showNewApiKey} onOpenChange={setShowNewApiKey}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Please copy your API key now. You won't be able to see it again for security reasons.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Store this API key securely. It won't be shown again.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={newApiKey || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => newApiKey && copyToClipboard(newApiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Usage Example</Label>
              <Textarea
                value={`curl -H "Authorization: Bearer ${newApiKey || 'YOUR_API_KEY'}" \\
  ${window.location.origin}/api/user`}
                readOnly
                className="font-mono text-sm"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => {
              setShowNewApiKey(false);
              setNewApiKey(null);
            }}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function DashboardApiDocsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // API Scopes definition
  const apiScopes: ApiScope[] = [
    { name: "read:user", description: "Read user profile information" },
    { name: "write:user", description: "Update user profile information" },
    { name: "read:servers", description: "View server information and status" },
    { name: "write:servers", description: "Control servers (start, stop, restart)" },
    { name: "read:billing", description: "View billing information and transactions" },
    { name: "write:billing", description: "Add credits and manage billing" },
    { name: "read:dns", description: "View DNS domains and records" },
    { name: "write:dns", description: "Manage DNS domains and records" },
    { name: "read:tickets", description: "View support tickets" },
    { name: "write:tickets", description: "Create and update support tickets" },
  ];

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery("");
  };

  // API endpoint definitions (filtered to exclude admin-only endpoints)
  const userEndpoints: ApiEndpoint[] = [
    {
      method: "GET",
      path: "/api/user",
      description: "Get information about the currently authenticated user",
      responseExample: JSON.stringify({
        id: 1,
        email: "user@example.com",
        username: "exampleuser",
        fullName: "Example User",
        role: "user",
        credits: 100,
        virtFusionId: 12345,
        isVerified: true,
        isActive: true,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-04-15T12:34:56Z"
      }, null, 2),
      requiresAuth: true,
      tags: ["user", "authentication"]
    },
    {
      method: "PATCH",
      path: "/api/user",
      description: "Update user profile information",
      parameters: [
        { name: "fullName", type: "string", required: false, description: "The user's full name", example: "John Doe" },
        { name: "email", type: "string", required: false, description: "The user's email address", example: "johndoe@example.com" }
      ],
      responseExample: JSON.stringify({
        success: true,
        user: {
          id: 1,
          email: "johndoe@example.com",
          username: "exampleuser",
          fullName: "John Doe"
        }
      }, null, 2),
      requiresAuth: true,
      tags: ["user", "profile"]
    },
    {
      method: "POST",
      path: "/api/user/change-password",
      description: "Change user password",
      parameters: [
        { name: "currentPassword", type: "string", required: true, description: "Current password", example: "oldpassword123" },
        { name: "newPassword", type: "string", required: true, description: "New password (min 8 characters)", example: "newpassword123" }
      ],
      responseExample: JSON.stringify({
        success: true
      }, null, 2),
      requiresAuth: true,
      tags: ["user", "authentication", "password"]
    },
    {
      method: "GET",
      path: "/api/user/ssh-keys",
      description: "Get user's SSH keys",
      responseExample: JSON.stringify([
        {
          id: 1,
          name: "My SSH Key",
          publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...",
          createdAt: "2025-01-01T00:00:00Z"
        }
      ], null, 2),
      requiresAuth: true,
      tags: ["user", "ssh", "keys"]
    },
    {
      method: "POST",
      path: "/api/user/ssh-keys",
      description: "Add a new SSH key",
      parameters: [
        { name: "name", type: "string", required: true, description: "SSH key name", example: "My Laptop Key" },
        { name: "publicKey", type: "string", required: true, description: "SSH public key", example: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..." }
      ],
      responseExample: JSON.stringify({
        id: 2,
        name: "My Laptop Key",
        publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...",
        createdAt: "2025-01-01T00:00:00Z"
      }, null, 2),
      requiresAuth: true,
      tags: ["user", "ssh", "keys"]
    },
    {
      method: "DELETE",
      path: "/api/user/ssh-keys/:id",
      description: "Delete an SSH key",
      parameters: [
        { name: "id", type: "string", required: true, description: "SSH key ID", example: "1" }
      ],
      responseExample: JSON.stringify({
        success: true
      }, null, 2),
      requiresAuth: true,
      tags: ["user", "ssh", "keys"]
    }
  ];

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
      path: "/api/servers/:id",
      description: "Get details for a specific server",
      parameters: [
        {
          name: "id",
          type: "string",
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
          storage: 80,
          bandwidth: 4000,
          created_at: "2025-04-01T12:00:00Z"
        }
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "details"]
    },
    {
      method: "POST",
      path: "/api/servers/:id/boot",
      description: "Boot a server",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
      ],
      responseExample: JSON.stringify({
        success: true
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "power"]
    },
    {
      method: "POST",
      path: "/api/servers/:id/restart",
      description: "Restart a server",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
      ],
      responseExample: JSON.stringify({
        success: true
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "power"]
    },
    {
      method: "POST",
      path: "/api/servers/:id/shutdown",
      description: "Shutdown a server",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
      ],
      responseExample: JSON.stringify({
        success: true
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "power"]
    },
    {
      method: "POST",
      path: "/api/servers/:id/poweroff",
      description: "Power off a server",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
      ],
      responseExample: JSON.stringify({
        success: true
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "power"]
    },
    {
      method: "POST",
      path: "/api/servers/:id/reset-password",
      description: "Reset server password",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" },
        { name: "password", type: "string", required: true, description: "New password (min 8 characters)", example: "newpassword123" }
      ],
      responseExample: JSON.stringify({
        success: true,
        message: "Password reset successfully"
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "password"]
    },
    {
      method: "GET",
      path: "/api/servers/:id/templates",
      description: "Get available templates for a server",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
      ],
      responseExample: JSON.stringify([
        {
          id: 1,
          name: "Ubuntu 22.04 LTS",
          description: "Ubuntu 22.04 Long Term Support",
          category: "linux"
        },
        {
          id: 2,
          name: "CentOS 8",
          description: "CentOS 8 Server",
          category: "linux"
        }
      ], null, 2),
      requiresAuth: true,
      tags: ["servers", "templates"]
    },
    {
      method: "GET",
      path: "/api/servers/:id/traffic",
      description: "Get server traffic statistics",
      parameters: [
        { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
      ],
      responseExample: JSON.stringify({
        inbound: 1024000,
        outbound: 512000,
        total: 1536000,
        period: "monthly",
        limit: 10240000
      }, null, 2),
      requiresAuth: true,
      tags: ["servers", "traffic", "statistics"]
    }
  ];

  const billingEndpoints: ApiEndpoint[] = [
    {
      method: "GET",
      path: "/api/billing/balance",
      description: "Get account balance information",
      responseExample: JSON.stringify({
        credits: 125.50,
        virtFusionCredits: 125.00,
        virtFusionTokens: 12500.00
      }, null, 2),
      requiresAuth: true,
      tags: ["billing", "balance"]
    },
    {
      method: "GET",
      path: "/api/billing/usage/last30days",
      description: "Get usage data for the last 30 days",
      responseExample: JSON.stringify({
        usage: 12.34,
        rawData: {
          periodId: 0,
          period: "May 2025",
          previousPeriod: "April 2025",
          nextPeriod: "June 2025",
          monthlyTotal: {
            hours: 1234,
            tokens: "12.3456",
            value: "12.34"
          },
          servers: 2,
          credit: {
            tokens: "12345.6789",
            value: "123.45"
          },
          currency: {
            code: "USD",
            prefix: "$",
            suffix: "",
            value: "0.0100000000",
            currentValue: "0.0100000000"
          }
        }
      }, null, 2),
      requiresAuth: true,
      tags: ["billing", "usage"]
    },
    {
      method: "GET",
      path: "/api/transactions",
      description: "Get transaction history",
      responseExample: JSON.stringify([
        {
          id: 1,
          userId: 1,
          amount: 20.00,
          type: "credit",
          description: "Account credit purchase",
          status: "completed",
          createdAt: "2025-04-01T10:00:00Z"
        },
        {
          id: 2,
          userId: 1,
          amount: 5.25,
          type: "debit",
          description: "Server usage charges",
          status: "completed",
          createdAt: "2025-04-15T14:30:00Z"
        }
      ], null, 2),
      requiresAuth: true,
      tags: ["billing", "transactions"]
    },
    {
      method: "GET",
      path: "/api/transactions/:id",
      description: "Get details for a specific transaction",
      parameters: [
        { name: "id", type: "string", required: true, description: "Transaction ID", example: "1" }
      ],
      responseExample: JSON.stringify({
        id: 1,
        userId: 1,
        amount: 20.00,
        type: "credit",
        description: "Account credit purchase",
        status: "completed",
        paymentMethod: "credit_card",
        cardLast4: "1234",
        createdAt: "2025-04-01T10:00:00Z"
      }, null, 2),
      requiresAuth: true,
      tags: ["billing", "transactions"]
    },
    {
      method: "POST",
      path: "/api/billing/add-credits",
      description: "Add credits to account",
      parameters: [
        { name: "amount", type: "string", required: true, description: "Amount to add in USD", example: "50" },
        { name: "paymentMethodId", type: "string", required: true, description: "Payment method ID", example: "pm_card_visa" }
      ],
      responseExample: JSON.stringify({
        success: true,
        transaction: {
          id: 3,
          amount: 50.00,
          type: "credit",
          description: "Account credit purchase",
          status: "completed",
          createdAt: "2025-04-20T11:15:00Z"
        },
        newBalance: 175.50
      }, null, 2),
      requiresAuth: true,
      tags: ["billing", "payments"]
    }
  ];

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
        { name: "scopes", type: "string", required: true, description: "Array of permission scopes for the API key", example: '["read:user", "read:servers"]' },
        { name: "expiresIn", type: "string", required: false, description: "Days until expiration (null for never)", example: "90" }
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
        { name: "id", type: "string", required: true, description: "API key ID", example: "1" }
      ],
      responseExample: JSON.stringify({
        success: true,
        message: "API key deleted successfully"
      }, null, 2),
      requiresAuth: true,
      tags: ["api-keys"]
    }
  ];

  const couponEndpoints: ApiEndpoint[] = [
    {
      method: "POST",
      path: "/api/coupons/claim",
      description: "Claim a coupon code",
      parameters: [
        { name: "code", type: "string", required: true, description: "Coupon code to claim", example: "SAVE20" }
      ],
      responseExample: JSON.stringify({
        success: true,
        message: "Coupon claimed successfully",
        coupon: {
          code: "SAVE20",
          discount: 20.00,
          type: "percentage"
        }
      }, null, 2),
      requiresAuth: true,
      tags: ["coupons"]
    },
    {
      method: "GET",
      path: "/api/coupons/history",
      description: "Get user's coupon usage history",
      responseExample: JSON.stringify([
        {
          id: 1,
          code: "SAVE20",
          discount: 20.00,
          type: "percentage",
          claimedAt: "2025-04-15T10:30:00Z",
          usedAt: "2025-04-15T11:00:00Z"
        }
      ], null, 2),
      requiresAuth: true,
      tags: ["coupons"]
    },
    {
      method: "POST",
      path: "/api/coupons/validate",
      description: "Validate a coupon code",
      parameters: [
        { name: "code", type: "string", required: true, description: "Coupon code to validate", example: "SAVE20" }
      ],
      responseExample: JSON.stringify({
        valid: true,
        coupon: {
          code: "SAVE20",
          discount: 20.00,
          type: "percentage",
          expiresAt: "2025-12-31T23:59:59Z"
        }
      }, null, 2),
      requiresAuth: true,
      tags: ["coupons"]
    }
  ];

  // Get all unique tags from endpoints
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    [...userEndpoints, ...serverEndpoints, ...billingEndpoints, ...apiKeyEndpoints, ...couponEndpoints].forEach(endpoint => {
      endpoint.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  return (
    <DashboardLayout>
      <Helmet>
        <title>API Documentation - Dashboard</title>
        <meta name="description" content="Complete API documentation for developers" />
      </Helmet>
      
      <ApiDocsContext.Provider value={{ setActiveTab, apiScopes }}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Enhanced Header */}
          <div className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                    <Code className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                      API Documentation
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
                      Complete reference for integrating with our API
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                  Build powerful applications and automate your workflows with our comprehensive REST API. 
                  Get started with authentication, explore endpoints, and see real examples.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                      <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">API Status</p>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100">Operational</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Version</p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-100">v1.0</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filter Bar */}
          <div className="mb-8 space-y-6">
            <Card className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 border-slate-200 dark:border-slate-700">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="Search endpoints, methods, or descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 text-base border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800"
                  />
                </div>
                
                <div className="flex gap-3">
                  {/* Quick Filter Tags */}
                  <div className="flex flex-wrap gap-2">
                    {['user', 'servers', 'billing', 'api-keys'].map((quickTag) => (
                      <Button
                        key={quickTag}
                        variant={selectedTags.includes(quickTag) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTagSelect(quickTag)}
                        className="h-10 px-4 capitalize"
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        {quickTag.replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                  
                  {(selectedTags.length > 0 || searchQuery) && (
                    <Button variant="outline" onClick={clearFilters} className="h-10 px-4 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Filters */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Active filters:
                  </span>
                  {selectedTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors px-3 py-1" 
                      onClick={() => handleTagSelect(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-2" />
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Search Results Summary */}
              {(searchQuery || selectedTags.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {searchQuery && `Searching for "${searchQuery}"`}
                    {searchQuery && selectedTags.length > 0 && ' with '}
                    {selectedTags.length > 0 && `${selectedTags.length} filter${selectedTags.length !== 1 ? 's' : ''} applied`}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-auto grid-cols-3 h-12">
                <TabsTrigger value="overview" className="px-6 py-3 text-base font-medium">
                  <Globe className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="endpoints" className="px-6 py-3 text-base font-medium">
                  <Code className="h-4 w-4 mr-2" />
                  API Endpoints
                </TabsTrigger>
                <TabsTrigger value="api-keys" className="px-6 py-3 text-base font-medium">
                  <Key className="h-4 w-4 mr-2" />
                  API Keys
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {[...userEndpoints, ...serverEndpoints, ...billingEndpoints, ...apiKeyEndpoints, ...couponEndpoints].length} Total Endpoints
                </Badge>
              </div>
            </div>

            <TabsContent value="overview" className="mt-0">
              <EndpointOverview />
            </TabsContent>

            <TabsContent value="endpoints" className="mt-0">
              <div className="space-y-8">
                <ApiCategory
                  title="User Management"
                  description="Endpoints for managing user accounts, profiles, and authentication"
                  endpoints={userEndpoints}
                  onTagSelect={handleTagSelect}
                  selectedTags={selectedTags}
                  toast={toast}
                />
                
                <ApiCategory
                  title="Server Management"
                  description="Endpoints for managing virtual servers and their configurations"
                  endpoints={serverEndpoints}
                  onTagSelect={handleTagSelect}
                  selectedTags={selectedTags}
                  toast={toast}
                />
                
                <ApiCategory
                  title="Billing & Transactions"
                  description="Endpoints for managing account billing, credits, and transaction history"
                  endpoints={billingEndpoints}
                  onTagSelect={handleTagSelect}
                  selectedTags={selectedTags}
                  toast={toast}
                />
                
                <ApiCategory
                  title="API Keys"
                  description="Endpoints for managing API authentication keys"
                  endpoints={apiKeyEndpoints}
                  onTagSelect={handleTagSelect}
                  selectedTags={selectedTags}
                  toast={toast}
                />
                
                <ApiCategory
                  title="Coupons"
                  description="Endpoints for managing discount coupons and promotions"
                  endpoints={couponEndpoints}
                  onTagSelect={handleTagSelect}
                  selectedTags={selectedTags}
                  toast={toast}
                />
              </div>
            </TabsContent>

            <TabsContent value="api-keys" className="mt-0">
              <ApiKeyManagement />
            </TabsContent>
          </Tabs>
        </div>
      </ApiDocsContext.Provider>
    </DashboardLayout>
  );
}