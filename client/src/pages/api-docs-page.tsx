import React, { useState, useRef, createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Copy,
  Code,
  Search,
  Server,
  CreditCard,
  User,
  RefreshCw,
  X,
  ChevronDown
} from 'lucide-react';
import { DocumentTitle } from '@/components/DocumentTitle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Context for API documentation
interface ApiDocsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  apiScopes: { name: string; description: string }[];
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
    // Safe access to window.location in case it's not available
    const origin = typeof window !== 'undefined' && window.location ?
      window.location.origin : 'https://example.com';

    let cmd = `curl -X ${endpoint.method} \\
  "${origin}${endpoint.path}"`;

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
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="border-b bg-muted/50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getMethodColor(endpoint.method)}>{endpoint.method}</Badge>
            <div className="font-mono text-sm font-medium">{endpoint.path}</div>
            {endpoint.requiresAdmin && (
              <Badge variant="destructive" className="ml-1">Admin Only</Badge>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={copyEndpointUrl}>
            {copied ? <><RefreshCw className="h-3.5 w-3.5 mr-1" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copy URL</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="mb-4">
          <p className="text-sm">{endpoint.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {endpoint.tags && endpoint.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => onTagSelect(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {endpoint.parameters && endpoint.parameters.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Parameters</h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Required</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.parameters.map((param, i) => (
                    <tr key={i} className={i !== endpoint.parameters!.length - 1 ? "border-b" : ""}>
                      <td className="px-4 py-2 font-mono text-xs">{param.name}</td>
                      <td className="px-4 py-2">{param.type}</td>
                      <td className="px-4 py-2">{param.required ? "Yes" : "No"}</td>
                      <td className="px-4 py-2">{param.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="curl-example">
            <AccordionTrigger>
              <div className="flex items-center">
                <Code className="h-4 w-4 mr-2" />
                CURL Example
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap">{getCurlCommand()}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="response-example">
            <AccordionTrigger>
              <div className="flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Response Example
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap">{endpoint.responseExample}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

// API Category Component
const ApiCategory = ({ title, description, endpoints, onTagSelect, selectedTags }: ApiCategoryProps) => {
  // Filter endpoints by selected tags
  const filteredEndpoints = endpoints.filter(endpoint =>
    selectedTags.length === 0 ||
    (endpoint.tags && endpoint.tags.some(tag => selectedTags.includes(tag)))
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {filteredEndpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/40 rounded-lg">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
          <h4 className="text-lg font-medium mb-1">No Endpoints Found</h4>
          <p className="text-sm text-muted-foreground">
            No endpoints match your current filters. Try changing or clearing your filters.
          </p>
        </div>
      ) : (
        <div>
          {filteredEndpoints.map((endpoint, index) => (
            <EndpointCard key={index} endpoint={endpoint} onTagSelect={onTagSelect} />
          ))}
        </div>
      )}
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

            <h4 className="font-medium mt-2">Admin Endpoints</h4>
            <p className="text-sm">
              Admin endpoints require admin privileges and cannot be accessed with regular user credentials.
              These endpoints are marked with an "Admin Only" badge.
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

// API endpoint definitions
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
    path: "/api/auth/login",
    description: "Authenticate a user and get a session cookie",
    parameters: [
      { name: "username", type: "string", required: true, description: "The user's username", example: "exampleuser" },
      { name: "password", type: "string", required: true, description: "The user's password", example: "securepassword" }
    ],
    responseExample: JSON.stringify({
      success: true,
      user: {
        id: 1,
        email: "user@example.com",
        username: "exampleuser",
        fullName: "Example User",
        role: "user"
      }
    }, null, 2),
    requiresAuth: false,
    tags: ["user", "authentication"]
  },
  {
    method: "POST",
    path: "/api/auth/register",
    description: "Register a new user account",
    parameters: [
      { name: "username", type: "string", required: true, description: "Desired username", example: "newuser" },
      { name: "email", type: "string", required: true, description: "Email address", example: "newuser@example.com" },
      { name: "password", type: "string", required: true, description: "Password", example: "securepassword" },
      { name: "fullName", type: "string", required: true, description: "Full name", example: "New User" }
    ],
    responseExample: JSON.stringify({
      success: true,
      user: {
        id: 2,
        email: "newuser@example.com",
        username: "newuser",
        fullName: "New User",
        role: "user"
      }
    }, null, 2),
    requiresAuth: false,
    tags: ["user", "authentication", "registration"]
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    description: "Log out the currently authenticated user",
    responseExample: JSON.stringify({
      success: true,
      message: "Logged out successfully"
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "authentication"]
  },
  {
    method: "POST",
    path: "/api/auth/forgot-password",
    description: "Request a password reset link",
    parameters: [
      { name: "email", type: "string", required: true, description: "Email address associated with the account", example: "user@example.com" }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent."
    }, null, 2),
    requiresAuth: false,
    tags: ["user", "authentication", "password"]
  },
  {
    method: "POST",
    path: "/api/auth/reset-password",
    description: "Reset a user's password using a reset token",
    parameters: [
      { name: "token", type: "string", required: true, description: "Password reset token", example: "abc123def456" },
      { name: "password", type: "string", required: true, description: "New password", example: "newSecurePassword" }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Password has been reset successfully"
    }, null, 2),
    requiresAuth: false,
    tags: ["user", "authentication", "password"]
  },
  {
    method: "GET",
    path: "/api/user/notifications",
    description: "Get user notifications",
    responseExample: JSON.stringify({
      notifications: [
        {
          id: 1,
          userId: 1,
          title: "Server Created",
          message: "Your new server 'web-server-01' has been created successfully.",
          read: false,
          createdAt: "2025-04-15T10:30:00Z"
        }
      ]
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "notifications"]
  },
  {
    method: "PATCH",
    path: "/api/user/notifications/:id/read",
    description: "Mark a notification as read",
    parameters: [
      { name: "id", type: "string", required: true, description: "Notification ID", example: "1" }
    ],
    responseExample: JSON.stringify({
      success: true,
      notification: {
        id: 1,
        read: true
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["user", "notifications"]
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
    path: "/api/servers",
    description: "Create a new server",
    parameters: [
      { name: "name", type: "string", required: true, description: "Server name", example: "web-server-02" },
      { name: "plan", type: "string", required: true, description: "Server plan", example: "standard" },
      { name: "location", type: "string", required: true, description: "Server location code", example: "nyc1" },
      { name: "image", type: "string", required: true, description: "OS image", example: "ubuntu-22-04" }
    ],
    responseExample: JSON.stringify({
      success: true,
      data: {
        id: 124,
        name: "web-server-02",
        status: "provisioning",
        plan: "standard",
        location: "nyc1",
        image: "ubuntu-22-04",
        created_at: "2025-04-15T14:30:00Z"
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "creation"]
  },
  {
    method: "DELETE",
    path: "/api/servers/:id",
    description: "Delete a server",
    parameters: [
      { name: "id", type: "string", required: true, description: "Server ID", example: "123" }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server deletion initiated"
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "deletion"]
  },
  {
    method: "POST",
    path: "/api/servers/:id/action",
    description: "Perform an action on a server (restart, shutdown, power on)",
    parameters: [
      { name: "id", type: "string", required: true, description: "Server ID", example: "123" },
      { name: "action", type: "string", required: true, description: "Action to perform", example: "restart" }
    ],
    responseExample: JSON.stringify({
      success: true,
      message: "Server restart initiated",
      data: {
        id: 123,
        status: "restarting"
      }
    }, null, 2),
    requiresAuth: true,
    tags: ["servers", "actions"]
  },
  {
    method: "GET",
    path: "/api/server-packages",
    description: "Get available server packages/plans",
    responseExample: JSON.stringify({
      success: true,
      data: [
        {
          id: 1,
          name: "Starter",
          cpu: 1,
          memory: 1024,
          storage: 25,
          bandwidth: 1000,
          price_monthly: 5.00,
          price_hourly: 0.007
        },
        {
          id: 2,
          name: "Standard",
          cpu: 2,
          memory: 4096,
          storage: 80,
          bandwidth: 4000,
          price_monthly: 20.00,
          price_hourly: 0.030
        }
      ]
    }, null, 2),
    requiresAuth: false,
    tags: ["servers", "packages", "pricing"]
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

const adminEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/admin/users",
    description: "Get a list of all users (admin only)",
    responseExample: JSON.stringify([
      {
        id: 1,
        email: "user@example.com",
        username: "exampleuser",
        fullName: "Example User",
        role: "user",
        credits: 125.50,
        isVerified: true,
        isActive: true,
        createdAt: "2025-01-01T00:00:00Z"
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "users"]
  },
  {
    method: "GET",
    path: "/api/admin/users/:id",
    description: "Get details for a specific user (admin only)",
    parameters: [
      { name: "id", type: "string", required: true, description: "User ID", example: "1" }
    ],
    responseExample: JSON.stringify({
      id: 1,
      email: "user@example.com",
      username: "exampleuser",
      fullName: "Example User",
      role: "user",
      credits: 125.50,
      virtFusionId: 12345,
      isVerified: true,
      isActive: true,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-04-15T12:34:56Z"
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "users"]
  },
  {
    method: "PATCH",
    path: "/api/admin/users/:id",
    description: "Update a user (admin only)",
    parameters: [
      { name: "id", type: "string", required: true, description: "User ID", example: "1" },
      { name: "email", type: "string", required: false, description: "Email address", example: "newemail@example.com" },
      { name: "fullName", type: "string", required: false, description: "Full name", example: "New Name" },
      { name: "isActive", type: "string", required: false, description: "Account active status", example: "true" },
      { name: "credits", type: "string", required: false, description: "Account credits balance", example: "150.00" },
      { name: "role", type: "string", required: false, description: "User role (user or admin)", example: "user" }
    ],
    responseExample: JSON.stringify({
      success: true,
      user: {
        id: 1,
        email: "newemail@example.com",
        fullName: "New Name",
        isActive: true,
        credits: 150.00,
        role: "user"
      }
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "users"]
  },
  {
    method: "GET",
    path: "/api/admin/tickets",
    description: "Get all support tickets (admin only)",
    responseExample: JSON.stringify({
      data: [
        {
          id: 1,
          userId: 1,
          departmentId: 1,
          subject: "Server not starting",
          status: "open",
          priority: "high",
          createdAt: "2025-04-10T09:15:00Z",
          updatedAt: "2025-04-10T09:15:00Z",
          user: {
            id: 1,
            username: "exampleuser",
            fullName: "Example User",
            email: "user@example.com"
          },
          department: {
            id: 1,
            name: "Technical Support"
          }
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 20
      }
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "tickets"]
  },
  {
    method: "GET",
    path: "/api/admin/transactions",
    description: "Get all billing transactions (admin only)",
    responseExample: JSON.stringify([
      {
        id: 1,
        userId: 1,
        amount: 20.00,
        type: "credit",
        description: "Account credit purchase",
        status: "completed",
        createdAt: "2025-04-01T10:00:00Z",
        user: {
          id: 1,
          username: "exampleuser",
          fullName: "Example User",
          email: "user@example.com"
        }
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "billing"]
  },

  {
    method: "POST",
    path: "/api/admin/settings",
    description: "Update system settings (admin only)",
    parameters: [
      { name: "settings", type: "string", required: true, description: "Object containing setting key-value pairs", example: '{"maintenance_mode": true, "maintenance_message": "System maintenance in progress"}' }
    ],
    responseExample: JSON.stringify({
      success: true,
      settings: {
        maintenance_mode: true,
        maintenance_message: "System maintenance in progress",
        company_name: "SkyVPS360",
        support_email: "support@skyvps360.com"
      }
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "settings"]
  },
  {
    method: "GET",
    path: "/api/admin/settings",
    description: "Get all system settings (admin only)",
    responseExample: JSON.stringify([
      {
        id: 1,
        key: "maintenance_mode",
        value: "false",
        category: "system"
      },
      {
        id: 2,
        key: "company_name",
        value: "SkyVPS360",
        category: "branding"
      }
    ], null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "settings"]
  },
  {
    method: "GET",
    path: "/api/admin/maintenance/generate-token",
    description: "Generate a maintenance bypass token (admin only)",
    responseExample: JSON.stringify({
      success: true,
      token: "abcdef123456",
      expiresAt: "2025-04-16T10:00:00Z"
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "maintenance"]
  },
  {
    method: "POST",
    path: "/api/admin/maintenance/enable",
    description: "Enable maintenance mode (admin only)",
    parameters: [
      { name: "message", type: "string", required: false, description: "Custom maintenance message", example: "System is undergoing scheduled maintenance." }
    ],
    responseExample: JSON.stringify({
      success: true,
      maintenanceMode: true,
      message: "System is undergoing scheduled maintenance."
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "maintenance"]
  },
  {
    method: "POST",
    path: "/api/admin/maintenance/disable",
    description: "Disable maintenance mode (admin only)",
    responseExample: JSON.stringify({
      success: true,
      maintenanceMode: false
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "maintenance"]
  },
  {
    method: "GET",
    path: "/api/admin/platform-stats",
    description: "Get platform statistics for admin dashboard (admin only)",
    responseExample: JSON.stringify({
      users: {
        total: 500,
        active: 450,
        newLast30Days: 75
      },
      servers: {
        total: 1200,
        active: 980,
        suspended: 50,
        deleted: 170
      },
      revenue: {
        currentMonth: 15000.00,
        previousMonth: 14200.00,
        growth: 5.63
      },
      tickets: {
        open: 25,
        closed: 150,
        averageResolutionTimeHours: 6.3
      },
      systemStatus: {
        cpu: 45,
        memory: 60,
        disk: 55
      }
    }, null, 2),
    requiresAuth: true,
    requiresAdmin: true,
    tags: ["admin", "statistics"]
  },
  {
    method: "GET",
    path: "/api/admin/services/status",
    description: "Get detailed status of all system services (admin only)",
    responseExample: JSON.stringify({
      services: [
        {
          name: "Database",
          status: "operational",
          uptime: 99.998,
          lastIncident: "2025-02-15T03:25:00Z",
          details: {
            connections: 150,
            queries: 7500,
            averageResponseTimeMs: 5.2
          }
        },
        {
          name: "API",
          status: "operational",
          uptime: 100.0,
          lastIncident: null,
          details: {
            requestsPerMinute: 350,
            averageResponseTimeMs: 120,
            errorRate: 0.05
          }
        }
      ]
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
        name: "High Availability",
        description: "Automatic failover to backup hardware",
        includedInPlans: ["premium", "enterprise"],
        active: true
      },
      {
        id: 2,
        name: "DDoS Protection",
        description: "Advanced DDoS mitigation",
        includedInPlans: ["standard", "premium", "enterprise"],
        active: true
      }
    ], null, 2),
    requiresAuth: false,
    tags: ["pricing", "plans", "public"]
  },
  {
    method: "GET",
    path: "/api/public/blog",
    description: "Retrieve blog posts for the public blog",
    responseExample: JSON.stringify([
      {
        id: 1,
        title: "Introducing New Server Locations",
        slug: "introducing-new-server-locations",
        excerpt: "We're excited to announce the launch of our new data center locations in Tokyo and Sydney.",
        content: "<p>Full content here...</p>",
        author: "Admin",
        published: true,
        publishedAt: "2025-03-01T12:00:00Z",
        featuredImage: "/images/blog/tokyo-datacenter.jpg",
        category: "News"
      }
    ], null, 2),
    requiresAuth: false,
    tags: ["blog", "content", "public"]
  },
  {
    method: "GET",
    path: "/api/public/docs",
    description: "Retrieve documentation categories and articles",
    responseExample: JSON.stringify({
      categories: [
        {
          id: 1,
          name: "Getting Started",
          slug: "getting-started",
          articles: [
            {
              id: 1,
              title: "Creating your first server",
              slug: "creating-your-first-server",
              excerpt: "Learn how to create and configure your first virtual server."
            }
          ]
        }
      ]
    }, null, 2),
    requiresAuth: false,
    tags: ["documentation", "help", "public"]
  },
  {
    method: "GET",
    path: "/api/datacenter-locations",
    description: "Retrieve available datacenter locations",
    responseExample: JSON.stringify([
      {
        id: 1,
        name: "New York",
        code: "nyc1",
        country: "United States",
        continent: "North America",
        available: true,
        features: ["High Bandwidth", "Low Latency"]
      },
      {
        id: 2,
        name: "Amsterdam",
        code: "ams1",
        country: "Netherlands",
        continent: "Europe",
        available: true,
        features: ["Green Energy", "High Availability"]
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
  const { user } = useAuth();
  // Default to non-admin if user is not logged in or role is missing
  const isAdmin = user?.role === 'admin' || false;

  // If activeTab is 'admin' but user is not admin, switch to overview
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('overview');
    }
  }, [activeTab, isAdmin]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Query for settings
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings/public"],
  });

  // Check if we're on mobile view
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Available API scopes with descriptions
  const apiScopes = [
    { name: 'read:user', description: 'Read user profile information' },
    { name: 'read:servers', description: 'Read server information' },
    { name: 'write:servers', description: 'Create, update, or delete servers' },
    { name: 'read:billing', description: 'View billing information and transactions' },
    { name: 'read:tickets', description: 'View support tickets' },
    { name: 'write:tickets', description: 'Create and update support tickets' },
    { name: 'admin:users', description: 'Administrative access to user accounts (admin only)' },
    { name: 'admin:billing', description: 'Administrative access to billing functions (admin only)' },
    { name: 'admin:system', description: 'Administrative access to system settings (admin only)' }
  ];

  // Create context value for child components
  const apiDocsContextValue: ApiDocsContextType = {
    activeTab,
    setActiveTab,
    apiScopes
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

  // Filter endpoints based on search term and user permissions
  const getFilteredEndpoints = (endpoints: ApiEndpoint[]) => {
    // First filter by admin access
    let filtered = endpoints;
    if (!isAdmin) {
      filtered = endpoints.filter(endpoint => !endpoint.requiresAdmin);
    }

    // Then filter by search term
    if (!searchTerm) return filtered;

    return filtered.filter(endpoint =>
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

  return (
    <DashboardLayout>
      <DocumentTitle>API Documentation</DocumentTitle>
      <div className="container max-w-6xl py-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            Comprehensive documentation for integrating with the {getCompanyName()} API.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search endpoints by path, description, or tag..."
              className="pl-8"
            />
            <Button type="submit" className="sr-only">Search</Button>
          </form>
          <Button variant="outline" onClick={resetFilters} size="sm" className="shrink-0">
            Reset Filters
          </Button>
        </div>

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleTagSelect(tag)}
              >
                {tag}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        <ApiDocsContext.Provider value={apiDocsContextValue}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            {isMobile ? (
              <div className="mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="users">User</SelectItem>
                    <SelectItem value="servers">Servers</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="api-keys">API Keys</SelectItem>
                    {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <TabsList className="grid grid-cols-3 lg:grid-cols-7 h-auto">
                <TabsTrigger value="overview" className="py-2">Overview</TabsTrigger>
                <TabsTrigger value="users" className="py-2">User</TabsTrigger>
                <TabsTrigger value="servers" className="py-2">Servers</TabsTrigger>
                <TabsTrigger value="billing" className="py-2">Billing</TabsTrigger>
                <TabsTrigger value="api-keys" className="py-2">API Keys</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin" className="py-2">Admin</TabsTrigger>}
                <TabsTrigger value="public" className="py-2">Public</TabsTrigger>
              </TabsList>
            )}

            <div className="my-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm font-medium mr-2">Filter by tag:</span>
                    {getAllTags().map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagSelect(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <EndpointOverview />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <ApiCategory
                title="User Endpoints"
                description="Endpoints for user authentication and profile management."
                endpoints={getFilteredEndpoints(userEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="servers" className="space-y-6">
              <ApiCategory
                title="Server Endpoints"
                description="Endpoints for managing virtual servers and packages."
                endpoints={getFilteredEndpoints(serverEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <ApiCategory
                title="Billing Endpoints"
                description="Endpoints for managing billing, transactions, and invoices."
                endpoints={getFilteredEndpoints(billingEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-6">
              <ApiCategory
                title="API Key Endpoints"
                description="Endpoints for managing API keys."
                endpoints={getFilteredEndpoints(apiKeyEndpoints)}
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="space-y-6">
                <ApiCategory
                  title="Admin Endpoints"
                  description="Endpoints for administrative tasks (admin access required)."
                  endpoints={getFilteredEndpoints(adminEndpoints)}
                  onTagSelect={handleTagSelect}
                  selectedTags={selectedTags}
                />
              </TabsContent>
            )}

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