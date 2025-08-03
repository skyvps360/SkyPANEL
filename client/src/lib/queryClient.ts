import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone the response before trying to read it
    // This ensures we don't try to read the body stream twice
    const clonedRes = res.clone();
    
    let errorData;
    try {
      // Try to parse as JSON for structured error responses
      errorData = await clonedRes.json();
      console.error("API Request failed with JSON response:", {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        response: errorData
      });
      
      // Special handling for verification errors
      if (res.status === 403 && errorData.needsVerification) {
        const error = new Error(errorData.error || 'Email verification required');
        // Add verification data to the error object
        (error as any).response = {
          status: res.status,
          data: errorData
        };
        throw error;
      }
      
      // Regular error with JSON data
      const errorMessage = errorData.message || errorData.error || `${res.status}: ${res.statusText}`;
      const error = new Error(errorMessage);
      // Preserve all error data for proper error handling
      (error as any).status = res.status;
      (error as any).details = errorData.details;
      (error as any).serverCount = errorData.serverCount;
      (error as any).response = { status: res.status, data: errorData };
      throw error;
    } catch (e) {
      if (e instanceof Error && (e as any).response) {
        throw e; // Rethrow our custom verification error
      }
      
      try {
        // Fallback to text if JSON parsing fails
        // Use a second clone to avoid "body stream already read" error
        const textRes = res.clone();
        const text = await textRes.text() || res.statusText;
        console.error("API Request failed with text response:", {
          url: res.url,
          status: res.status,
          statusText: res.statusText,
          responseText: text
        });
        const error = new Error(`${res.status}: ${text}`);
        (error as any).status = res.status;
        throw error;
      } catch (textError) {
        // As a last resort, if we can't read the response body at all
        console.error("Failed to read error response body:", {
          url: res.url,
          status: res.status,
          statusText: res.statusText,
          error: textError
        });
        const error = new Error(`${res.status}: ${res.statusText}`);
        (error as any).status = res.status;
        throw error;
      }
    }
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: any;
    data?: any; // Support both 'body' and 'data' for backward compatibility
    headers?: Record<string, string>;
    responseType?: string;
    isFormData?: boolean; // Flag to indicate FormData body
  }
): Promise<T> {
  const method = options?.method || 'GET';
  const payload = options?.data || options?.body; // Use data if provided, fallback to body
  const customHeaders = options?.headers || {};
  const responseType = options?.responseType;
  const isFormData = options?.isFormData || payload instanceof FormData;
  
  // Determine if we're expecting a binary response
  const isBinaryResponse = responseType === 'blob' || 
                          url.includes('/export') || 
                          url.includes('/download') || 
                          url.endsWith('.pdf');
  
  // Create headers with content type for JSON requests only when there's a payload
  const headers = {
    ...customHeaders
  };
  
  // Only add Content-Type header if we have a payload to send and it's not FormData
  // For FormData, let the browser set the Content-Type (including boundary)
  if (payload && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add /api prefix to the URL if it doesn't already have it
  const fullUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? '' : '/'}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: payload ? (isFormData ? payload : JSON.stringify(payload)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Handle response based on expected type
  if (isBinaryResponse) {
    return res.blob() as unknown as T;
  }
  
  // Check content type to determine how to handle the response
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  } else if (contentType && contentType.includes('text/html')) {
    // Handle HTML responses - convert to a more usable format
    const text = await res.text();
    console.warn('Received HTML response instead of JSON:', text.substring(0, 100) + '...');
    
    // This likely means we've hit the wrong route - possibly a conflict with API docs
    const htmlResponse = { 
      _isHtmlResponse: true, 
      content: text.substring(0, 500) + '...',
      fullContentAvailable: text.length > 500,
      url: res.url,
      status: res.status
    };
    
    // When getting HTML in an API response, it's usually an error
    // Throw a more helpful error message that points to the API docs page conflict
    if (url.includes('/api/sso') || url.includes('/api/tickets')) {
      throw new Error(
        `Received HTML instead of JSON. This could be caused by a route ` +
        `conflict with the API docs page. URL: ${url}`
      );
    }
    
    return htmlResponse as unknown as T;
  } else {
    // For text or other content types
    const text = await res.text();
    try {
      // Try to parse as JSON anyway (some APIs return JSON without proper content type)
      return JSON.parse(text);
    } catch (e) {
      // Return as text if not JSON
      return text as unknown as T;
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // Add /api prefix to the URL if it doesn't already have it
    const fullUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? '' : '/'}${url}`;
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // We use our updated throwIfResNotOk which now handles cloning the response properly
      await throwIfResNotOk(res);
      
      // Handle different response types based on content-type header
      const contentType = res.headers.get('content-type');
      
      // Determine if we're expecting a binary response
      const isBinaryResponse = url.includes('/export') || 
                              url.includes('/download') || 
                              url.endsWith('.pdf');
                              
      if (isBinaryResponse) {
        const blob = await res.blob();
        return blob as unknown as any;
      } else if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        return data as any;
      } else if (contentType && contentType.includes('text/html')) {
        // Handle HTML responses - convert to a more usable format
        const text = await res.text();
        console.warn('Received HTML response instead of JSON:', text.substring(0, 100) + '...');
        
        // This likely means we've hit the wrong route - possibly a conflict with API docs
        const htmlResponse = { 
          _isHtmlResponse: true, 
          content: text.substring(0, 500) + '...',
          fullContentAvailable: text.length > 500,
          url: url,
          status: res.status
        };
        
        // When getting HTML in an API response, it's usually an error
        // But we handle it specifically for certain endpoints
        if (url.includes('/api/sso') || url.includes('/api/tickets')) {
          console.error(`HTML response for API endpoint: ${url}`);
          throw new Error(
            `Received HTML instead of JSON. This could be caused by a route ` +
            `conflict with the API docs page. URL: ${url}`
          );
        }
        
        return htmlResponse as unknown as any;
      } else {
        // Try to parse as JSON first, if that fails return as text
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          return data as any;
        } catch (e) {
          return text as unknown as any;
        }
      }
    } catch (error) {
      console.error("Query request failed:", { url, error, queryKey });
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
