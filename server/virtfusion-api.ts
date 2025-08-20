import https from "https";
import axios from "axios";
import { storage } from "./storage";

// VirtFusion API class for centralizing API calls
export class VirtFusionApi {
  private apiUrl: string;
  private apiToken: string;
  private sslVerify: boolean;

  constructor() {
    // Default values - will be updated with getSettings()
    // Make sure the URL doesn't have a trailing slash and doesn't include /api/v1 twice
    const apiUrl = process.env.VIRTFUSION_API_URL || "https://skyvps360.xyz";
    this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

    // Ensure API URL ends with /api/v1
    if (!this.apiUrl.endsWith("/api/v1")) {
      this.apiUrl = `${this.apiUrl}/api/v1`;
    }

    this.apiToken = process.env.VIRTFUSION_API_TOKEN || "";
    this.sslVerify = true;
  }

  // Check if VirtFusion API is properly configured
  isConfigured(): boolean {
    return !!this.apiUrl && !!this.apiToken;
  }

  // Get the API URL (for diagnostics)
  getApiUrl(): string {
    return this.apiUrl;
  }

  // Update API settings from environment variables
  async updateSettings() {
    try {
      // VirtFusion API Settings - Current values logged

      // Try to get settings from database
      const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
      const apiTokenSetting = await storage.getSetting("virtfusion_api_token");
      const sslVerifySetting = await storage.getSetting("virtfusion_ssl_verify");

      // Update with database settings if available
      if (apiUrlSetting) {
        this.apiUrl = apiUrlSetting.value;
        // Ensure it ends with /api/v1
        if (!this.apiUrl.endsWith("/api/v1")) {
          this.apiUrl = `${this.apiUrl}/api/v1`;
        }
      }

      if (apiTokenSetting) {
        this.apiToken = apiTokenSetting.value;
      }

      if (sslVerifySetting) {
        this.sslVerify = sslVerifySetting.value === "true";
      }

      // Log updated settings
      // VirtFusion API Settings - Updated values logged

      return true;
    } catch (error) {
      console.error("Error updating VirtFusion API settings:", error);
      return false;
    }
  }

  // Test the API connection
  async testConnection() {
    try {
      await this.updateSettings();
      return this.request("GET", "/packages");
    } catch (error) {
      console.error("VirtFusion connection test failed:", error);
      throw error;
    }
  }

  // Generic request method
  async request(method: string, endpoint: string, data?: unknown, suppressErrorLogging = false) {
    try {
      // Validate required settings
      if (!this.apiUrl || !this.apiToken) {
        await this.updateSettings();

        if (!this.apiUrl || !this.apiToken) {
          throw new Error(
            "Missing API URL or API token. Please configure VirtFusion API settings first.",
          );
        }
      }

      // Format the URL correctly to avoid double paths
      let apiBase = this.apiUrl;
      if (apiBase.endsWith("/")) {
        apiBase = apiBase.slice(0, -1);
      }

      // Check if the API URL already contains /api/v1
      const hasApiV1 = apiBase.toLowerCase().endsWith("/api/v1");

      // If the endpoint starts with /api/v1 and our base already ends with it, remove from endpoint
      let normalizedEndpoint = endpoint;
      if (hasApiV1 && endpoint.startsWith("/api/v1")) {
        normalizedEndpoint = endpoint.substring(7); // Remove /api/v1 prefix
        // Removed duplicate /api/v1 from endpoint
      }

      const fullUrl = `${apiBase}${normalizedEndpoint.startsWith("/") ? normalizedEndpoint : "/" + normalizedEndpoint}`;

      // Log request details (mask token for security)
      const maskedToken =
        this.apiToken.length > 8
          ? `${this.apiToken.substring(0, 4)}...${this.apiToken.substring(this.apiToken.length - 4)}`
          : "********";
      // Making request to VirtFusion API
      // Using token for authentication
      // SSL verification status

      // Log if this is a dry run request
      if (fullUrl.includes('dryRun=true')) {
        // DRY RUN REQUEST DETECTED - This should NOT create a real server!
      }

      if (data) {
        // Request data logged
      }

      try {
        const response = await axios({
          method,
          url: fullUrl,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
            Accept: "application/json, */*",
          },
          data,
          // Apply SSL verification setting
          httpsAgent: new https.Agent({ rejectUnauthorized: this.sslVerify }),
          // Add a timeout to prevent hanging requests
          timeout: 30000,
        });

        // Log response status
        // VirtFusion API Response status logged

        // Check if response contains data
        if (!response.data) {
          console.warn("Empty response data from VirtFusion API");
          return null;
        }

        // Log a truncated version of the response for debugging
        const responseStr =
          typeof response.data === "object"
            ? JSON.stringify(response.data)
            : String(response.data);
        const truncatedResponse =
          responseStr.length > 500
            ? responseStr.substring(0, 500) + "..."
            : responseStr;
        // Response data (may be truncated) logged

        // Check and log the response content type
        const contentType = response.headers["content-type"];
        // Response content type logged

        // Ensure we got JSON data
        if (contentType && !contentType.includes("application/json")) {
          console.warn(`Unexpected content type in response: ${contentType}`);

          // Try to handle it anyway, but log the warning
          if (typeof response.data === "string") {
            try {
              // Try to parse if it's JSON string despite content type
              return JSON.parse(response.data);
            } catch (parseErr) {
              console.error("Failed to parse response as JSON:", parseErr);
              throw new Error(
                `Received non-JSON response: ${response.data.substring(0, 100)}...`,
              );
            }
          }
        }

        // Handle paginated responses properly
        if (
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data
        ) {
          // Found data property in response, returning the full response object
          return response.data;
        }

        return response.data;
      } catch (axiosError: any) {
        // Handle Axios specific errors
        if (axiosError.isAxiosError) {
          // Only log detailed errors if not suppressed
          if (!suppressErrorLogging) {
            console.error(`Axios Error: ${axiosError.message}`);

            if (axiosError.response) {
              // The request was made and the server responded with a status code outside of 2xx
              console.error(`Response status: ${axiosError.response.status}`);

              if (axiosError.response.headers) {
                console.error(
                  `Response headers:`,
                  JSON.stringify(axiosError.response.headers, null, 2),
                );
              }

              // Log response data safely
              try {
                console.error(
                  `Response data:`,
                  typeof axiosError.response.data === "object"
                    ? JSON.stringify(axiosError.response.data, null, 2)
                    : axiosError.response.data,
                );
              } catch (e: any) {
                console.error(`Could not stringify response data: ${e.message}`);
                console.error(`Raw response data:`, axiosError.response.data);
              }
            }
          }

          if (axiosError.response) {

            // Include error details from the API if available
            if (
              axiosError.response.data &&
              typeof axiosError.response.data === "object"
            ) {
              if (axiosError.response.data.message) {
                throw new Error(
                  `VirtFusion API Error ${axiosError.response.status}: ${axiosError.response.data.message}`,
                );
              } else if (axiosError.response.data.error) {
                throw new Error(
                  `VirtFusion API Error ${axiosError.response.status}: ${axiosError.response.data.error}`,
                );
              } else if (axiosError.response.data.errors) {
                // Capture detailed validation errors array/object
                const errs = JSON.stringify(axiosError.response.data.errors);
                throw new Error(
                  `VirtFusion API Error ${axiosError.response.status}: ${errs}`,
                );
              }
            }

            throw new Error(
              `VirtFusion API Error ${axiosError.response.status}: ${axiosError.message}`,
            );
          } else if (axiosError.request) {
            // The request was made but no response was received
            console.error(
              "No response received. Check if the API URL is correct and the server is reachable.",
            );
            console.error(
              "Request details:",
              axiosError.request._header || "Unable to stringify request details (likely contains circular references)"
            );
            throw new Error(
              `VirtFusion API Error: No response received - ${axiosError.message}`,
            );
          } else {
            // Something happened in setting up the request
            console.error("Request setup error:", axiosError.message);
            throw new Error(
              `VirtFusion API Request Error: ${axiosError.message}`,
            );
          }
        }

        // Re-throw any other errors
        throw axiosError;
      }
    } catch (error: any) {
      console.error(`VirtFusion API Error: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }

  async getUserByExtRelationId(extRelationId: number) {
    // Using format from VirtFusion API docs
    return this.request("GET", `/users/${extRelationId}/byExtRelation`);
  }

  /**
   * Generate authentication tokens for SSO login
   * @param extRelationId The external relation ID (our user ID)
   * @returns Authentication tokens and redirect URL
   */
  async generateAuthToken(extRelationId: number) {
    // Using the correct endpoint format from the VirtFusion API documentation
    // Generating auth token for extRelationId
    try {
      // Attempt to get user info first to verify the user exists in VirtFusion
      // Checking if user with extRelationId exists in VirtFusion
      await this.request("GET", `/users/${extRelationId}/byExtRelation`);

      // Now generate the auth token using the correct endpoint format from the VirtFusion API documentation
      // User exists in VirtFusion, generating auth token
      const result = await this.request(
        "POST",
        `/users/${extRelationId}/authenticationTokens`,
      );
      // Auth token generated

      // Process authentication token response based on VirtFusion API documentation structure
      if (
        result &&
        typeof result === "object" &&
        result.data &&
        result.data.authentication
      ) {
        // Format response to match what the frontend expects
        const authentication = result.data.authentication;

        // Get base URL for VirtFusion panel by removing the /api/v1 portion from the API URL
        // This ensures redirects go to the panel domain and not the API domain
        const apiUrlParts = this.apiUrl.split("/");
        const panelBaseUrl = apiUrlParts.slice(0, 3).join("/"); // Get https://domain.com part

        // Build the full redirect URL by combining the panel base URL with the endpoint path
        const redirectPath = authentication.endpoint_complete;
        let fullRedirectUrl = "";

        // Ensure we have a properly formed URL
        if (redirectPath.startsWith("http")) {
          // If the path already includes the domain (unlikely), use it as is
          fullRedirectUrl = redirectPath;
        } else {
          // Otherwise combine the panel base URL with the path
          fullRedirectUrl = `${panelBaseUrl}${redirectPath.startsWith("/") ? "" : "/"}${redirectPath}`;
        }

        const processedResult = {
          token: authentication.tokens["1"], // First token from the response
          redirectUrl: fullRedirectUrl, // Complete URL with tokens and domain
        };

        // Processed auth token for response compatibility logged
        return processedResult;
      }

      return result;
    } catch (error) {
      console.error(
        `Failed to generate auth token for extRelationId ${extRelationId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteUserByExtRelationId(extRelationId: number) {
    // Using format from VirtFusion API docs for DELETE /users/{extRelationId}/byExtRelation
    try {
      // Format the URL correctly according to API documentation - critical to use /byExtRelation
      let apiBase = this.apiUrl;
      if (apiBase.endsWith("/")) {
        apiBase = apiBase.slice(0, -1);
      }

      // The correct URL format per the VirtFusion API docs
      // DELETE /users/{extRelationId}/byExtRelation
      const fullUrl = `${apiBase}/users/${extRelationId}/byExtRelation`;

      // Making DELETE request to delete user by extRelationId
      const maskedToken = this.apiToken.length > 8
        ? `${this.apiToken.substring(0, 4)}...${this.apiToken.substring(this.apiToken.length - 4)}`
        : "********";
      // Using token for authentication

      // Make direct axios request to properly handle 204 No Content response
      // Using proper 'Accept' header as per API documentation
      const response = await axios({
        method: 'DELETE',
        url: fullUrl,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Accept': '*/*',  // API expects this Accept header
          'Content-Type': 'application/json'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: this.sslVerify }),
        timeout: 30000,
        validateStatus: (status) => {
          // Accept 204 No Content as a successful response (this is what the API returns)
          return (status >= 200 && status < 300) || status === 204;
        }
      });

      // VirtFusion API Response status for user deletion logged

      // For 204 No Content response, return success
      if (response.status === 204) {
        // Successfully deleted user with extRelationId (204 No Content response)
        return { success: true, message: "User deleted successfully" };
      }

      // For other successful responses
      return response.data || { success: true };
    } catch (error: any) {
      console.error(`Error deleting user with extRelationId ${extRelationId}:`, error.message);

      // Check for specific error conditions and rethrow with more information
      if (error.response) {
        if (error.response.status === 409) {
          throw new Error("409: Cannot delete user with active servers");
        } else if (error.response.status === 404) {
          throw new Error("404: User not found in VirtFusion");
        } else if (error.response.status === 401) {
          throw new Error("401: Unauthorized - API token may be invalid");
        }

        // Include the response error message if available
        if (error.response.data) {
          const errorMsg = error.response.data.message ||
                          (error.response.data.msg ? error.response.data.msg : JSON.stringify(error.response.data));
          const structuredError = new Error(`${error.response.status}: ${errorMsg}`);
          (structuredError as any).status = error.response.status;
          (structuredError as any).response = error.response;
          throw structuredError;
        }

        // For response errors without data
        const responseError = new Error(`${error.response.status}: ${error.response.statusText || 'Unknown error'}`);
        (responseError as any).status = error.response.status;
        (responseError as any).response = error.response;
        throw responseError;
      }

      // Rethrow the original error with status if available
      if (error.status) {
        throw error;
      }

      // Add status 0 for unknown errors
      (error as any).status = 0;
      throw error;
    }
  }

  async modifyUserByExtRelationId(extRelationId: number, userData: any) {
    // Using format from VirtFusion API docs
    return this.request(
      "PUT",
      `/users/${extRelationId}/byExtRelation`,
      userData,
    );
  }

  async resetUserPassword(extRelationId: number) {
    // Use the correct endpoint format for external relation ID with resetPassword
    // according to VirtFusion API docs
    // VirtFusion API will generate a password and return it in the response
    // Calling VirtFusion resetPassword API with extRelationId

    try {
      // Ensure API settings are up to date
      await this.updateSettings();

      // Make the API request - no body required according to documentation
      const response = await this.request(
        "POST",
        `/users/${extRelationId}/byExtRelation/resetPassword`
      );

      // Return the full response which includes the generated password
      return response;
    } catch (error) {
      console.error(`Error in resetUserPassword for extRelationId ${extRelationId}:`, error);
      throw error;
    }
  }

  // User creation
  async createUser(userData: any) {
    return this.request("POST", "/users", userData);
  }

  // Add the default resource pack to a user
  async addDefaultResourcePackToUser(extRelationId: number) {
    // Add a resource pack to a user by their extRelationId
    // Assigning default resource pack to new user with extRelationId
    return this.request(
      "POST",
      `/selfService/resourcePack/byUserExtRelationId/${extRelationId}`,
      {
        packId: 1,
        enabled: true,
      }
    );
  }

  /**
   * Add credit to a user by external relation ID
   * @param extRelationId The external relation ID (our user ID)
   * @param tokenData Object containing tokens and optional reference data
   * @returns API response containing credit ID
   */
  async addCreditToUser(extRelationId: number, tokenData: {
    tokens: number;
    reference_1?: number;
    reference_2?: string;
  }) {
    // Adding tokens to user with extRelationId
    return this.request(
      "POST",
      `/selfService/credit/byUserExtRelationId/${extRelationId}`,
      tokenData
    );
  }

  /**
   * Remove credit from a user by external relation ID using POST with negative tokens
   * VirtFusion v6.0.0+ supports negative credits via POST method
   * @param extRelationId The external relation ID (our user ID)
   * @param tokenData Object containing tokens and optional reference data
   * @returns API response
   */
  async removeCreditFromUserByExtRelationId(extRelationId: number, tokenData: {
    tokens: number;
    reference_1?: number;
    reference_2?: string;
  }) {
    // Removing tokens from user with extRelationId (using negative credit)

    // VirtFusion v6.0.0+ requires POST with negative tokens instead of DELETE
    const negativeTokenData = {
      ...tokenData,
      tokens: -Math.abs(tokenData.tokens) // Ensure tokens are negative
    };

    // Sending negative credit data

    return this.request(
      "POST",
      `/selfService/credit/byUserExtRelationId/${extRelationId}`,
      negativeTokenData
    );
  }

  /**
   * Cancel/remove credit from a user (legacy method using credit ID)
   * @param creditId The ID of the credit to cancel
   * @returns API response
   */
  async removeCreditFromUser(creditId: number) {
    // Removing credit with ID
    return this.request("DELETE", `/selfService/credit/${creditId}`);
  }

  // Server creation methods removed

  // Get all packages
  async getPackages() {
    return this.request("GET", "/packages");
  }

  // Get a single package by ID
  async getPackage(packageId: number) {
    return this.request("GET", `/packages/${packageId}`);
  }

  // Get all operating system templates
  async getOsTemplates() {
    try {
      // VirtFusion API doesn't have a general templates endpoint
      // We need to use a specific server ID or package ID
      // First, try to get a list of servers and use the first one for templates
      
      try {
        // Try to get a list of servers first
        const serversResponse = await this.request("GET", "/servers?results=1");
        if (serversResponse && serversResponse.data && Array.isArray(serversResponse.data) && serversResponse.data.length > 0) {
          const firstServerId = serversResponse.data[0].id;
          return await this.request("GET", `/servers/${firstServerId}/templates`);
        }
      } catch (serversError) {
        console.error("Error fetching servers list for templates:", serversError);
      }
      
      // If no servers available, try with a default server ID
      try {
        return await this.request("GET", "/servers/1/templates");
      } catch (serverError) {
        console.error("Error fetching OS templates from /servers/1/templates:", serverError);
        
        // If that fails, try with a package ID (package ID 1 as fallback)
        try {
          return await this.request("GET", "/media/templates/fromServerPackageSpec/1");
        } catch (packageError) {
          console.error("Error fetching OS templates from /media/templates/fromServerPackageSpec/1:", packageError);
          
          // If both fail, return empty array
          console.warn("No valid template endpoints available, returning empty templates array");
          return { data: [] };
        }
      }
    } catch (error) {
      console.error("Error in getOsTemplates:", error);
      return { data: [] };
    }
  }

  // Get OS templates available for a specific package
  async getOsTemplatesForPackage(packageId: number) {
    try {
      // Fetching OS templates for package ID
      return await this.request("GET", `/media/templates/fromServerPackageSpec/${packageId}`);
    } catch (error) {
      console.error(`Error fetching OS templates for package ${packageId}:`, error);

      try {
        // Fallback to generic OS templates
        // Falling back to generic OS templates for package
        return await this.getOsTemplates();
      } catch (secondError) {
        console.error("Error fetching generic OS templates as fallback:", secondError);
        // If templates can't be retrieved, return empty array
        return { data: [] };
      }
    }
  }

  // Get all servers from VirtFusion API with pagination support
  async getServersPaginated(page: number = 1, perPage: number = 10, params: any = {}) {
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    queryParams.append('page', page.toString());
    queryParams.append('perPage', perPage.toString());

    // Add any additional parameters
    if (params.results) queryParams.append('results', params.results.toString());
    if (params.type) queryParams.append('type', params.type);

    const endpoint = `/servers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request("GET", endpoint);
  }

  // Check if user has any active servers (for deletion prevention)
  async checkUserHasServers(virtFusionUserId: number): Promise<{ hasServers: boolean; serverCount: number }> {
    try {
      // Checking if user has servers. VirtFusion User ID

      // Use the SAME approach that works in the user servers page
      // This uses the proven selfService endpoint that we know works
      const response = await this.getUserServers(virtFusionUserId);

      // checkUserHasServers response logged

      let hasServers = false;
      let serverCount = 0;

      if (response && response.data) {
        if (Array.isArray(response.data)) {
          serverCount = response.data.length;
          hasServers = serverCount > 0;
        } else if (response.data.servers && Array.isArray(response.data.servers)) {
          serverCount = response.data.servers.length;
          hasServers = serverCount > 0;
        }
      }

      // User has servers count logged
      return { hasServers, serverCount };
    } catch (error) {
      console.error(`Error checking if user has servers for virtFusionUserId ${virtFusionUserId}:`, error);
      throw error;
    }
  }

  /**
   * Get servers for a specific user by their VirtFusion ID
   * Ensures that only servers owned by the requested user are returned, even if fallback endpoints are used.
   * @param virtFusionUserId The VirtFusion user ID (external relation ID)
   * @returns API response containing only the user's servers
   */
  async getUserServers(virtFusionUserId: number) {
    try {
      // Fetching servers for VirtFusion user ID
      let response;
      // Try the standard servers endpoint with user filter
      try {
        // Trying servers endpoint with user filter
        response = await this.request("GET", `/servers?user=${virtFusionUserId}`);
        if (response && Array.isArray(response.data)) {
          // Defensive: filter by owner just in case
          response.data = response.data.filter(
            (srv: any) => srv.owner === virtFusionUserId || (srv.owner && srv.owner.id === virtFusionUserId)
          );
        }
        // getUserServers response from /servers?user logged
        return response;
      } catch (firstError) {
        console.warn(`First attempt failed, trying alternative endpoint`, firstError);
        try {
          // Try the servers/user endpoint
          // Trying /servers/user endpoint
          response = await this.request("GET", `/servers/user/${virtFusionUserId}`);
          if (response && Array.isArray(response.data)) {
            response.data = response.data.filter(
              (srv: any) => srv.owner === virtFusionUserId || (srv.owner && srv.owner.id === virtFusionUserId)
            );
          }
          // getUserServers response from /servers/user logged
          return response;
        } catch (secondError) {
          console.warn(`Second attempt failed. No safe fallback will be used to avoid leaking other users' servers.`, secondError);
          // SECURITY: Do NOT use /selfService/servers as fallback, as it may leak all servers
          // Instead, return an empty result and log the incident
          console.error(`All attempts to fetch user servers failed for user ${virtFusionUserId}.`);
          return { data: [] };
        }
      }
    } catch (error) {
      console.error(`Error in getUserServers for user ${virtFusionUserId}:`, error);
      // Return empty result instead of throwing error to avoid leaking data
      return { data: [] };
    }
  }

  // Get a server by ID
  async getServerById(serverId: number) {
    try {
      return this.request("GET", `/servers/${serverId}`);
    } catch (error) {
      console.error(`Error in getServerById for server ${serverId}:`, error);
      throw error;
    }
  }

  // Get a server by ID with optional detailed information
  async getServer(serverId: number, detailed: boolean = false) {
    try {
      // Fetching server details (detailed parameter)

      // Use the same endpoint as getServerById but with optional detailed parameter
      const endpoint = detailed ? `/servers/${serverId}?detailed=true` : `/servers/${serverId}`;
      const response = await this.request("GET", endpoint);

      // getServer response for server logged
      return response;
    } catch (error) {
      console.error(`Error in getServer for server ${serverId}:`, error);
      throw error;
    }
  }

  // Get server traffic statistics
  async getServerTraffic(serverId: number) {
    try {
      // Call the traffic statistics endpoint
      const response = await this.request("GET", `/servers/${serverId}/traffic`);
      return response;
    } catch (error) {
      console.error(`Error in getServerTraffic for server ${serverId}:`, error);
      throw error;
    }
  }

  // No longer using this method - removed

  // Get all hypervisors from VirtFusion API
  async getHypervisors() {
    return this.request("GET", "/compute/hypervisors");
  }

  // Get all hypervisor groups from VirtFusion API
  async getHypervisorGroups() {
    return this.request("GET", "/compute/hypervisors/groups");
  }

  // Server creation and build functions

  /**
   * Create a new server
   * @param serverData Server creation parameters
   * @returns API response with created server data
   */
  async createServer(serverData: any) {
    // Creating server with data
    return this.request("POST", "/servers", serverData);
  }

  /**
   * Build a server with OS template
   * @param serverId The server ID to build
   * @param buildData Build configuration data
   * @returns API response
   */
  async buildServer(serverId: number, buildData: any) {
    // Building server ID with data
    return this.request("POST", `/servers/${serverId}/build`, buildData);
  }

  // Server power management functions

  /**
   * Boot a server
   * @param serverId The server ID
   * @returns API response
   */
  async bootServer(serverId: number) {
    // Booting server ID
    return this.request("POST", `/servers/${serverId}/power/boot`);
  }

  /**
   * Shutdown a server (graceful)
   * @param serverId The server ID
   * @returns API response
   */
  async shutdownServer(serverId: number) {
    // Shutting down server ID
    return this.request("POST", `/servers/${serverId}/power/shutdown`);
  }

  /**
   * Restart a server (graceful)
   * @param serverId The server ID
   * @returns API response
   */
  async restartServer(serverId: number) {
    // Restarting server ID
    return this.request("POST", `/servers/${serverId}/power/restart`);
  }

  /**
   * Force power off a server (hard shutdown)
   * @param serverId The server ID
   * @returns API response
   */
  async powerOffServer(serverId: number) {
    // Powering off server ID
    return this.request("POST", `/servers/${serverId}/power/poweroff`);
  }

  /**
   * Throttle a server's CPU
   * @param serverId The server ID
   * @param throttleData Object containing throttle percentage
   * @returns API response
   */
  async throttleServerCpu(serverId: number, throttleData: { percent: number }) {
    // Throttling server CPU
    return this.request("PUT", `/servers/${serverId}/modify/cpuThrottle`, throttleData);
  }

  /**
   * Get queue item status
   * @param queueId The queue ID
   * @returns Queue item data
   */
  async getQueueItem(queueId: number) {
    // Fetching queue item ID
    return this.request("GET", `/queue/${queueId}`);
  }

  /**
   * Suspend a server
   * @param serverId The server ID
   * @returns API response
   */
  async suspendServer(serverId: number) {
    // Suspending server ID
    return this.request("POST", `/servers/${serverId}/suspend`);
  }

  /**
   * Unsuspend a server
   * @param serverId The server ID
   * @returns API response
   */
  /**
   * Reset password for a server
   * @param serverId The VirtFusion server ID
   * @param user The user to reset password for (root or administrator)
   * @param sendMail Whether to email the password to the user (default: true)
   * @returns Response data containing queueId and expectedPassword
   */
  async resetServerPassword(serverId: number, user: string, sendMail: boolean = true) {
    // Normalize user value - VirtFusion API expects 'root' or 'administrator' (lowercase 'a')
    const normalizedUser = user === 'Administrator' ? 'administrator' : user;

    // Validate user value - the VirtFusion API only accepts "root" or "administrator"
    if (normalizedUser !== 'root' && normalizedUser !== 'administrator') {
      throw new Error('User must be either "root" or "administrator"');
    }

    // IMPORTANT: According to the API documentation, the body must be a proper JSON object
    // with user and sendMail properties exactly as shown in the docs
    const requestBody = {
      user: normalizedUser,
      sendMail: sendMail
    };

    // Resetting password for server, user, sendMail
    // Request body logged

    try {
      // Make the request through our standard request method which handles auth and API URLs
      const response = await this.request('POST', `/servers/${serverId}/resetPassword`, requestBody);

      // Password reset response logged

      // Make sure we handle the expected format
      if (response && response.data && response.data.expectedPassword) {
        // Generated password logged
      } else {
        // No expected password in response
      }

      return response;
    } catch (error: any) {
      console.error(`Error resetting password for server ${serverId}:`, error.message);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  async unsuspendServer(serverId: number) {
    // Unsuspending server ID
    return this.request("POST", `/servers/${serverId}/unsuspend`);
  }

  /**
   * Delete a server
   * @param serverId The server ID
   * @param scheduleAt Optional timestamp to schedule deletion (if supported by VirtFusion)
   * @returns API response
   */
  async deleteServer(serverId: number, scheduleAt?: string) {
    // Deleting server ID
    const endpoint = `/servers/${serverId}`;
    const data = scheduleAt ? { scheduleAt } : undefined;
    return this.request("DELETE", endpoint, data);
  }

  /**
   * Enable VNC for a server
   * @param serverId The server ID
   * @returns API response
   */
  async enableVncForServer(serverId: number) {
    // Enabling VNC for server ID
    return this.request("POST", `/servers/${serverId}/vnc/enable`);
  }

  /**
   * Disable VNC for a server
   * @param serverId The server ID
   * @returns API response
   */
  async disableVncForServer(serverId: number) {
    // Disabling VNC for server ID
    return this.request("POST", `/servers/${serverId}/vnc/disable`);
  }

  /**
   * Get VNC status for a server
   * @param serverId The server ID
   * @returns API response with VNC status
   */
  async getVncStatus(serverId: number) {
    // Getting VNC status for server ID
    return this.request("GET", `/servers/${serverId}/vnc`);
  }

  /**
   * Toggle VNC for a server (VirtFusion API uses POST to toggle VNC state)
   * @param serverId The server ID
   * @returns API response with VNC status
   */
  async toggleVnc(serverId: number) {
    // Toggling VNC for server ID
    return this.request("POST", `/servers/${serverId}/vnc`);
  }

  /**
   * Get user usage statistics by external relation ID (our user ID)
   * @param extRelationId The external relation ID (our user ID)
   * @param period Optional period for usage data in YYYY-MM-DD format
   * @param range Optional range for usage data (d=day, w=week, m=month)
   * @returns Usage data from VirtFusion
   */
  async getUserUsageByExtRelationId(extRelationId: number, period?: string, range: string = "m") {
    // Get current date in YYYY-MM-DD format if period is not provided
    if (!period) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      period = `${year}-${month}-${day}`;
    }

    const endpoint = `/selfService/usage/byUserExtRelationId/${extRelationId}?period[]=${period}&range=${range}`;
    return this.request("GET", endpoint);
  }

  /**
   * Get user hourly statistics by external relation ID (our user ID)
   * @param extRelationId The external relation ID (our user ID)
   * @param period Optional period for usage data in YYYY-MM-DD format
   * @param range Optional range for usage data (d=day, w=week, m=month)
   * @returns Hourly statistics data from VirtFusion
   */
  async getUserHourlyStats(extRelationId: number, period?: string, range: string = "m") {
    try {
      // Get current date in YYYY-MM-DD format if period is not provided
      if (!period) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        period = `${year}-${month}-${day}`;
      }

      // Fetching hourly stats for extRelationId, period, range

      // Try multiple possible endpoints for hourly stats
      let response;

      try {
        // First try the hourlyStats endpoint
        const endpoint = `/selfService/hourlyStats/byUserExtRelationId/${extRelationId}?period[]=${period}&range=${range}`;
        // Trying hourlyStats endpoint
        response = await this.request("GET", endpoint);
        // HourlyStats response logged
        return response;
      } catch (firstError) {
        // HourlyStats endpoint failed, trying usage endpoint

        try {
          // Fallback to usage endpoint
          const usageEndpoint = `/selfService/usage/byUserExtRelationId/${extRelationId}?period[]=${period}&range=${range}`;
          // Trying usage endpoint
          response = await this.request("GET", usageEndpoint);
          // Usage endpoint response logged
          return response;
        } catch (secondError) {
          console.error(`Both hourlyStats and usage endpoints failed`);
          console.error(`First error:`, firstError);
          console.error(`Second error:`, secondError);

          // Return empty data structure to prevent crashes
          return {
            data: {
              monthlyTotal: {
                value: "0.00",
                hours: 0,
                tokens: false
              }
            }
          };
        }
      }
    } catch (error) {
      console.error(`Error in getUserHourlyStats for extRelationId ${extRelationId}:`, error);
      // Return empty data structure to prevent crashes
      return {
        data: {
          monthlyTotal: {
            value: "0.00",
            hours: 0,
            tokens: false
          }
        }
      };
    }
  }

  /**
   * Get SSH keys for a user
   * @param userId The VirtFusion user ID
   * @returns SSH keys data from VirtFusion
   */
  async getUserSshKeys(userId: number) {
    try {
      return this.request("GET", `/ssh_keys/user/${userId}`);
    } catch (error) {
      console.error(`Error fetching SSH keys for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific SSH key by ID
   * @param keyId The SSH key ID
   * @returns SSH key data from VirtFusion
   */
  async getSshKey(keyId: number) {
    try {
      return this.request("GET", `/ssh_keys/${keyId}`);
    } catch (error) {
      console.error(`Error fetching SSH key ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new SSH key for a user
   * @param userId The VirtFusion user ID
   * @param name The SSH key name
   * @param publicKey The public key content
   * @returns Created SSH key data from VirtFusion
   */
  async createSshKey(userId: number, name: string, publicKey: string) {
    try {
      const data = {
        userId,
        name,
        publicKey
      };
      return this.request("POST", `/ssh_keys`, data);
    } catch (error) {
      console.error(`Error creating SSH key for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an SSH key
   * @param keyId The SSH key ID
   * @returns API response
   */
  async deleteSshKey(keyId: number) {
    try {
      return this.request("DELETE", `/ssh_keys/${keyId}`);
    } catch (error) {
      console.error(`Error deleting SSH key ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * Get all servers from VirtFusion
   * @param options Query options (type, results, hypervisorId)
   * @returns Array of servers from VirtFusion
   */
  async getServers(options: { type?: 'simple' | 'full', results?: number, hypervisorId?: number } = {}) {
    try {
      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.results) params.append('results', options.results.toString());
      if (options.hypervisorId) params.append('hypervisorId', options.hypervisorId.toString());
      
      const queryString = params.toString();
      const endpoint = queryString ? `/servers?${queryString}` : '/servers';
      
      return this.request("GET", endpoint);
    } catch (error) {
      console.error('Error fetching servers:', error);
      throw error;
    }
  }

  /**
   * Get servers owned by a specific user (by checking owner field from all servers)
   * @param userId The VirtFusion user ID
   * @returns Array of servers owned by the user
   */
  async getServersByOwner(userId: number) {
    try {
      // VirtFusion API doesn't have owner filtering, so we get all servers and filter
      const response = await this.getServers({ type: 'simple', results: 200 });
      
      if (response && response.data && Array.isArray(response.data)) {
        return {
          ...response,
          data: response.data.filter((server: any) => server.owner === userId)
        };
      }
      
      return { data: [] };
    } catch (error) {
      console.error(`Error fetching servers for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a server exists and is owned by a specific user
   * @param serverId The VirtFusion server ID
   * @param expectedOwnerId The expected owner user ID
   * @returns True if server exists and is owned by the user, false otherwise
   */
  async verifyServerOwnership(serverId: number, expectedOwnerId: number): Promise<boolean> {
    try {
      // Suppress error logging for 404s since they're expected when servers are deleted
      const response = await this.request("GET", `/servers/${serverId}`, undefined, true);
      
      if (response && response.data) {
        return response.data.ownerId === expectedOwnerId;
      }
      
      return false;
    } catch (error) {
      // If server doesn't exist, API will return 404 - this is expected, don't log it
      if ((error as any).response?.status === 404) {
        return false;
      }
      // Only log unexpected errors (not 404s)
      console.error(`Unexpected error verifying server ${serverId} ownership:`, error);
      return false;
    }
  }

  /**
   * Check if a server exists by UUID
   * @param serverUuid The VirtFusion server UUID
   * @returns Server data if exists, null if not found
   */
  async getServerByUuid(serverUuid: string): Promise<any | null> {
    try {
      // Get all servers and find by UUID since VirtFusion doesn't have UUID endpoint
      const response = await this.getServers({ type: 'simple', results: 200 });
      
      if (response && response.data && Array.isArray(response.data)) {
        const server = response.data.find((s: any) => s.uuid === serverUuid);
        return server || null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding server by UUID ${serverUuid}:`, error);
      return null;
    }
  }

  /**
   * Verify server ownership by UUID - checks if user still owns the server with specified UUID
   * This method is more accurate than ID-based checking as it uses the server's UUID
   * @param serverUuid The server UUID to verify
   * @param expectedOwnerId The expected owner's SkyPANEL user ID (extRelationId)
   * @returns true if user still owns the server, false otherwise
   */
  async verifyServerOwnershipByUuid(serverUuid: string, expectedOwnerId: number): Promise<boolean> {
    try {
      // Skip verification if UUID is not provided
      if (!serverUuid) {
        console.warn('⚠️ No server UUID provided for ownership verification');
        return false;
      }

      console.log(`🔍 Verifying server ownership by UUID: ${serverUuid} for SkyPANEL user: ${expectedOwnerId}`);
      
      // First, get the VirtFusion user data using the SkyPANEL user ID as extRelationId
      const userResponse = await this.getUserByExtRelationId(expectedOwnerId);
      
      if (!userResponse || !userResponse.data) {
        console.log(`📭 No VirtFusion user found for SkyPANEL user ${expectedOwnerId}`);
        return false;
      }

      const virtFusionUserId = userResponse.data.id;
      console.log(`🔄 Found VirtFusion user ID: ${virtFusionUserId} for SkyPANEL user: ${expectedOwnerId}`);
      
      // Get all servers for the VirtFusion user
      const userServersResponse = await this.getUserServers(virtFusionUserId);
      
      if (!userServersResponse || !userServersResponse.data || !Array.isArray(userServersResponse.data)) {
        console.log(`📭 No servers found for VirtFusion user ${virtFusionUserId}`);
        return false;
      }

      // Check if any of the user's servers has the matching UUID
      const ownedServer = userServersResponse.data.find((server: any) => server.uuid === serverUuid);
      
      if (ownedServer) {
        console.log(`✅ Server with UUID ${serverUuid} is still owned by VirtFusion user ${virtFusionUserId} (SkyPANEL user: ${expectedOwnerId})`);
        return true;
      } else {
        console.log(`❌ Server with UUID ${serverUuid} is NOT owned by VirtFusion user ${virtFusionUserId} (SkyPANEL user: ${expectedOwnerId})`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error verifying server ownership by UUID ${serverUuid}:`, error);
      return false;
    }
  }

  /**
   * Classify VirtFusion-controlled servers by identifying servers not created through the application
   * This method gets all servers from VirtFusion and cross-checks their UUIDs against the application's database
   * @returns Object containing classification results and logging data
   */
  async classifyVirtFusionControlledServers(): Promise<{
    totalServers: number;
    applicationServers: number;
    virtfusionControlledServers: number;
    virtfusionControlledUuids: string[];
    applicationUuids: string[];
  }> {
    try {
      console.log('🔍 Starting VirtFusion server classification process...');
      
      // Get all servers from VirtFusion
      const allServersResponse = await this.getServers({ type: 'simple', results: 500 });
      
      if (!allServersResponse || !allServersResponse.data || !Array.isArray(allServersResponse.data)) {
        console.log('📭 No servers found in VirtFusion');
        return {
          totalServers: 0,
          applicationServers: 0,
          virtfusionControlledServers: 0,
          virtfusionControlledUuids: [],
          applicationUuids: []
        };
      }

      const allServers = allServersResponse.data;
      console.log(`📊 Found ${allServers.length} total servers in VirtFusion`);

      // Get all server UUIDs from the application's billing database
      const { virtfusionHourlyBilling } = await import('../shared/schemas/virtfusion-billing-schema');
      const { storage } = await import('./storage');
      const { sql } = await import('drizzle-orm');
      
      const applicationServers = await storage.db
        .select({ serverUuid: virtfusionHourlyBilling.serverUuid })
        .from(virtfusionHourlyBilling)
        .where(sql`${virtfusionHourlyBilling.serverUuid} IS NOT NULL`);

      const applicationUuids = applicationServers.map(server => server.serverUuid).filter(Boolean);
      console.log(`💾 Found ${applicationUuids.length} servers in application database`);

      // Classify servers
      const virtfusionControlledUuids: string[] = [];
      const foundApplicationUuids: string[] = [];

      for (const server of allServers) {
        if (server.uuid) {
          if (applicationUuids.includes(server.uuid)) {
            foundApplicationUuids.push(server.uuid);
            console.log(`✅ Server ${server.uuid} (${server.name || 'unnamed'}) - Application controlled`);
          } else {
            virtfusionControlledUuids.push(server.uuid);
            console.log(`🔧 Server ${server.uuid} (${server.name || 'unnamed'}) - VirtFusion controlled (not in application database)`);
          }
        } else {
          console.warn(`⚠️ Server without UUID found: ${server.id} (${server.name || 'unnamed'})`);
        }
      }

      const results = {
        totalServers: allServers.length,
        applicationServers: foundApplicationUuids.length,
        virtfusionControlledServers: virtfusionControlledUuids.length,
        virtfusionControlledUuids,
        applicationUuids: foundApplicationUuids
      };

      console.log('📋 VirtFusion Server Classification Results:');
      console.log(`   📊 Total servers in VirtFusion: ${results.totalServers}`);
      console.log(`   💻 Application-controlled servers: ${results.applicationServers}`);
      console.log(`   🔧 VirtFusion-controlled servers: ${results.virtfusionControlledServers}`);
      
      if (results.virtfusionControlledServers > 0) {
        console.log(`   🔧 VirtFusion-controlled UUIDs: ${virtfusionControlledUuids.join(', ')}`);
      }

      return results;
    } catch (error) {
      console.error('❌ Error in classifyVirtFusionControlledServers:', error);
      throw error;
    }
  }

  // Helper function to determine server billing type based on UUID cross-checking
  async determineServerBillingType(serverUuid: string, serverId: number, userId: number): Promise<{
    billingType: 'hourly' | 'monthly' | 'virtfusion controlled';
    isVirtFusionControlled: boolean;
  }> {
    try {
      // Import required modules
      const { virtfusionHourlyBilling } = await import('../shared/schemas/virtfusion-billing-schema');
      const { storage } = await import('./storage');
      const { eq, and } = await import('drizzle-orm');

      // First check if server has an hourly billing record
      const billingRecord = await storage.db
        .select()
        .from(virtfusionHourlyBilling)
        .where(
          and(
            eq(virtfusionHourlyBilling.serverId, serverId),
            eq(virtfusionHourlyBilling.userId, userId)
          )
        )
        .limit(1);

      if (billingRecord.length > 0) {
        // Server has billing record, it's application-controlled and hourly
        return {
          billingType: 'hourly',
          isVirtFusionControlled: false
        };
      }

      // No billing record found - check if server UUID exists in our database
      // If serverUuid is provided, check if it exists in any billing record
      if (serverUuid) {
        const uuidCheck = await storage.db
          .select()
          .from(virtfusionHourlyBilling)
          .where(eq(virtfusionHourlyBilling.serverUuid, serverUuid))
          .limit(1);

        if (uuidCheck.length > 0) {
          // UUID exists in our database, this server was created via our application
          // but doesn't have a billing record for this user/server combo
          // This could be a monthly server or a data inconsistency
          return {
            billingType: 'monthly',
            isVirtFusionControlled: false
          };
        }
      }

      // Server UUID not found in our database - this means it was created directly in VirtFusion
      // and should be marked as VirtFusion-controlled
      return {
        billingType: 'virtfusion controlled',
        isVirtFusionControlled: true
      };

    } catch (error) {
      console.error('❌ Error determining server billing type:', error);
      // Default to VirtFusion controlled on error to prevent double billing
      return {
        billingType: 'virtfusion controlled',
        isVirtFusionControlled: true
      };
    }
  }
}

// Create a singleton instance of the VirtFusion API client
export const virtFusionApi = new VirtFusionApi();
