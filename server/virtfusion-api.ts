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
      console.log("VirtFusion API Settings - Current values:", {
        apiUrl: this.apiUrl,
        apiToken: this.apiToken ? "***" : "not set",
        sslVerify: this.sslVerify,
      });

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
      console.log("VirtFusion API Settings - Updated values:", {
        apiUrl: this.apiUrl,
        apiToken: this.apiToken ? "***" : "not set",
        sslVerify: this.sslVerify,
      });

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
  async request(method: string, endpoint: string, data?: any) {
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
        console.log(
          `Removed duplicate /api/v1 from endpoint. Original: ${endpoint}, New: ${normalizedEndpoint}`,
        );
      }

      const fullUrl = `${apiBase}${normalizedEndpoint.startsWith("/") ? normalizedEndpoint : "/" + normalizedEndpoint}`;

      // Log request details (mask token for security)
      const maskedToken =
        this.apiToken.length > 8
          ? `${this.apiToken.substring(0, 4)}...${this.apiToken.substring(this.apiToken.length - 4)}`
          : "********";
      console.log(`Making ${method} request to ${fullUrl}`);
      console.log(`Using token: ${maskedToken}`);
      console.log(`SSL verification: ${this.sslVerify}`);

      // Log if this is a dry run request
      if (fullUrl.includes('dryRun=true')) {
        console.log("🔥 DRY RUN REQUEST DETECTED - This should NOT create a real server!");
      }

      if (data) {
        console.log(`Request data: ${JSON.stringify(data, null, 2)}`);
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
        console.log(`VirtFusion API Response status: ${response.status}`);

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
        console.log(`Response data (may be truncated): ${truncatedResponse}`);

        // Check and log the response content type
        const contentType = response.headers["content-type"];
        console.log(`Response content type: ${contentType || "not specified"}`);

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
          console.log(
            "Found data property in response, returning the full response object",
          );
          return response.data;
        }

        return response.data;
      } catch (axiosError: any) {
        // Handle Axios specific errors
        if (axiosError.isAxiosError) {
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
    console.log(`Generating auth token for extRelationId ${extRelationId}`);
    try {
      // Attempt to get user info first to verify the user exists in VirtFusion
      console.log(
        `Checking if user with extRelationId ${extRelationId} exists in VirtFusion`,
      );
      await this.request("GET", `/users/${extRelationId}/byExtRelation`);

      // Now generate the auth token using the correct endpoint format from the VirtFusion API documentation
      console.log(`User exists in VirtFusion, generating auth token`);
      const result = await this.request(
        "POST",
        `/users/${extRelationId}/authenticationTokens`,
      );
      console.log(`Auth token generated:`, result);

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

        console.log(`Processed auth token for response compatibility:`, {
          ...processedResult,
          token: processedResult.token
            ? `${processedResult.token.substring(0, 10)}...`
            : undefined,
          redirectUrl: processedResult.redirectUrl,
        });

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

      console.log(`Making DELETE request to ${fullUrl} to delete user by extRelationId`);
      const maskedToken = this.apiToken.length > 8
        ? `${this.apiToken.substring(0, 4)}...${this.apiToken.substring(this.apiToken.length - 4)}`
        : "********";
      console.log(`Using token: ${maskedToken}`);

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

      console.log(`VirtFusion API Response status for user deletion: ${response.status}`);

      // For 204 No Content, return a successful response (this is expected per API docs)
      if (response.status === 204) {
        console.log(`Successfully deleted user with extRelationId ${extRelationId} (204 No Content response)`);
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
    console.log(`Calling VirtFusion resetPassword API with extRelationId: ${extRelationId}`);

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
    console.log(`Assigning default resource pack (ID=1) to new user with extRelationId=${extRelationId}`);
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
    console.log(`Adding ${tokenData.tokens} tokens to user with extRelationId ${extRelationId}`);
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
    console.log(`Removing ${tokenData.tokens} tokens from user with extRelationId ${extRelationId} (using negative credit)`);

    // VirtFusion v6.0.0+ requires POST with negative tokens instead of DELETE
    const negativeTokenData = {
      ...tokenData,
      tokens: -Math.abs(tokenData.tokens) // Ensure tokens are negative
    };

    console.log(`Sending negative credit data:`, negativeTokenData);

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
    console.log(`Removing credit with ID ${creditId}`);
    return this.request("DELETE", `/selfService/credit/${creditId}`);
  }

  // Server creation methods removed

  // Get all packages
  async getPackages() {
    return this.request("GET", "/packages");
  }

  // Get all operating system templates
  async getOsTemplates() {
    try {
      // First try getting OS templates from the dedicated endpoint
      return await this.request("GET", "/templates/os");
    } catch (error) {
      console.error("Error fetching OS templates from /templates/os:", error);

      try {
        // Fallback to alternate endpoint
        return await this.request("GET", "/compute/templates");
      } catch (secondError) {
        console.error(
          "Error fetching OS templates from fallback endpoint:",
          secondError,
        );

        // If no templates can be retrieved, return empty array
        return { data: [] };
      }
    }
  }

  // Get OS templates available for a specific package
  async getOsTemplatesForPackage(packageId: number) {
    try {
      console.log(`Fetching OS templates for package ID: ${packageId}`);
      return await this.request("GET", `/media/templates/fromServerPackageSpec/${packageId}`);
    } catch (error) {
      console.error(`Error fetching OS templates for package ${packageId}:`, error);

      try {
        // Fallback to generic OS templates
        console.log(`Falling back to generic OS templates for package ${packageId}`);
        return await this.getOsTemplates();
      } catch (secondError) {
        console.error("Error fetching generic OS templates as fallback:", secondError);
        // If templates can't be retrieved, return empty array
        return { data: [] };
      }
    }
  }

  // Get all servers from VirtFusion API with pagination support
  async getServers(page: number = 1, perPage: number = 10, params: any = {}) {
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
      console.log(`Checking if user has servers. VirtFusion User ID: ${virtFusionUserId}`);

      // Use the SAME approach that works in the user servers page
      // This uses the proven selfService endpoint that we know works
      const response = await this.getUserServers(virtFusionUserId);

      console.log(`checkUserHasServers response:`, JSON.stringify(response, null, 2));

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

      console.log(`User ${virtFusionUserId} has ${serverCount} servers (hasServers: ${hasServers})`);
      return { hasServers, serverCount };
    } catch (error) {
      console.error(`Error checking if user has servers for virtFusionUserId ${virtFusionUserId}:`, error);
      throw error;
    }
  }

  // Get servers for a specific user by their VirtFusion ID
  async getUserServers(virtFusionUserId: number) {
    try {
      console.log(`Fetching servers for VirtFusion user ID: ${virtFusionUserId}`);

      // Try multiple endpoints to find the correct one for getting user servers
      let response;

      try {
        // First try the standard servers endpoint with user filter
        console.log(`Trying servers endpoint with user filter`);
        response = await this.request("GET", `/servers?user=${virtFusionUserId}`);
        console.log(`getUserServers response from /servers?user=${virtFusionUserId}:`, JSON.stringify(response, null, 2));
        return response;
      } catch (firstError) {
        console.log(`First attempt failed, trying alternative endpoint`);

        try {
          // Try the servers/user endpoint
          console.log(`Trying /servers/user/${virtFusionUserId} endpoint`);
          response = await this.request("GET", `/servers/user/${virtFusionUserId}`);
          console.log(`getUserServers response from /servers/user/${virtFusionUserId}:`, JSON.stringify(response, null, 2));
          return response;
        } catch (secondError) {
          console.log(`Second attempt failed, trying selfService endpoint without byUserExtRelationId`);

          try {
            // Try the selfService/servers endpoint
            console.log(`Trying /selfService/servers endpoint`);
            response = await this.request("GET", `/selfService/servers`);
            console.log(`getUserServers response from /selfService/servers:`, JSON.stringify(response, null, 2));
            return response;
          } catch (thirdError) {
            console.error(`All attempts failed. First error:`, firstError);
            console.error(`Second error:`, secondError);
            console.error(`Third error:`, thirdError);

            // Return empty result instead of throwing error
            console.log(`Returning empty servers list for user ${virtFusionUserId}`);
            return { data: [] };
          }
        }
      }
    } catch (error) {
      console.error(`Error in getUserServers for user ${virtFusionUserId}:`, error);
      // Return empty result instead of throwing error
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
      console.log(`Fetching server ${serverId} details (detailed: ${detailed})`);

      // Use the same endpoint as getServerById but with optional detailed parameter
      const endpoint = detailed ? `/servers/${serverId}?detailed=true` : `/servers/${serverId}`;
      const response = await this.request("GET", endpoint);

      console.log(`getServer response for server ${serverId}:`, JSON.stringify(response, null, 2));
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

  // Server creation and build functions

  /**
   * Create a new server
   * @param serverData Server creation parameters
   * @returns API response with created server data
   */
  async createServer(serverData: any) {
    console.log(`Creating server with data:`, JSON.stringify(serverData, null, 2));
    return this.request("POST", "/servers", serverData);
  }

  /**
   * Build a server with OS template
   * @param serverId The server ID to build
   * @param buildData Build configuration data
   * @returns API response
   */
  async buildServer(serverId: number, buildData: any) {
    console.log(`Building server ID: ${serverId} with data:`, JSON.stringify(buildData, null, 2));
    return this.request("POST", `/servers/${serverId}/build`, buildData);
  }

  // Server power management functions

  /**
   * Boot a server
   * @param serverId The server ID
   * @returns API response
   */
  async bootServer(serverId: number) {
    console.log(`Booting server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/power/boot`);
  }

  /**
   * Shutdown a server (graceful)
   * @param serverId The server ID
   * @returns API response
   */
  async shutdownServer(serverId: number) {
    console.log(`Shutting down server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/power/shutdown`);
  }

  /**
   * Restart a server (graceful)
   * @param serverId The server ID
   * @returns API response
   */
  async restartServer(serverId: number) {
    console.log(`Restarting server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/power/restart`);
  }

  /**
   * Force power off a server (hard shutdown)
   * @param serverId The server ID
   * @returns API response
   */
  async powerOffServer(serverId: number) {
    console.log(`Powering off server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/power/poweroff`);
  }

  /**
   * Get queue item status
   * @param queueId The queue ID
   * @returns Queue item data
   */
  async getQueueItem(queueId: number) {
    console.log(`Fetching queue item ID: ${queueId}`);
    return this.request("GET", `/queue/${queueId}`);
  }

  /**
   * Suspend a server
   * @param serverId The server ID
   * @returns API response
   */
  async suspendServer(serverId: number) {
    console.log(`Suspending server ID: ${serverId}`);
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

    console.log(`Resetting password for server ${serverId}, user ${normalizedUser}, sendMail: ${sendMail}`);
    console.log(`Request body:`, JSON.stringify(requestBody, null, 2));

    try {
      // Make the request through our standard request method which handles auth and API URLs
      const response = await this.request('POST', `/servers/${serverId}/resetPassword`, requestBody);

      console.log(`Password reset response:`, JSON.stringify(response, null, 2));

      // Make sure we handle the expected format
      if (response && response.data && response.data.expectedPassword) {
        console.log(`Generated password: ${response.data.expectedPassword}`);
      } else {
        console.log('No expected password in response');
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
    console.log(`Unsuspending server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/unsuspend`);
  }

  /**
   * Delete a server
   * @param serverId The server ID
   * @param scheduleAt Optional timestamp to schedule deletion (if supported by VirtFusion)
   * @returns API response
   */
  async deleteServer(serverId: number, scheduleAt?: string) {
    console.log(`Deleting server ID: ${serverId}${scheduleAt ? ` scheduled at ${scheduleAt}` : ''}`);
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
    console.log(`Enabling VNC for server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/vnc/enable`);
  }

  /**
   * Disable VNC for a server
   * @param serverId The server ID
   * @returns API response
   */
  async disableVncForServer(serverId: number) {
    console.log(`Disabling VNC for server ID: ${serverId}`);
    return this.request("POST", `/servers/${serverId}/vnc/disable`);
  }

  /**
   * Get VNC status for a server
   * @param serverId The server ID
   * @returns API response with VNC status
   */
  async getVncStatus(serverId: number) {
    console.log(`Getting VNC status for server ID: ${serverId}`);
    return this.request("GET", `/servers/${serverId}/vnc`);
  }

  /**
   * Toggle VNC for a server (VirtFusion API uses POST to toggle VNC state)
   * @param serverId The server ID
   * @returns API response with VNC status
   */
  async toggleVnc(serverId: number) {
    console.log(`Toggling VNC for server ID: ${serverId}`);
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

      console.log(`Fetching hourly stats for extRelationId ${extRelationId}, period: ${period}, range: ${range}`);

      // Try multiple possible endpoints for hourly stats
      let response;

      try {
        // First try the hourlyStats endpoint
        const endpoint = `/selfService/hourlyStats/byUserExtRelationId/${extRelationId}?period[]=${period}&range=${range}`;
        console.log(`Trying hourlyStats endpoint: ${endpoint}`);
        response = await this.request("GET", endpoint);
        console.log(`HourlyStats response:`, response);
        return response;
      } catch (firstError) {
        console.log(`HourlyStats endpoint failed, trying usage endpoint`);

        try {
          // Fallback to usage endpoint
          const usageEndpoint = `/selfService/usage/byUserExtRelationId/${extRelationId}?period[]=${period}&range=${range}`;
          console.log(`Trying usage endpoint: ${usageEndpoint}`);
          response = await this.request("GET", usageEndpoint);
          console.log(`Usage endpoint response:`, response);
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
}

// Create a singleton instance of the VirtFusion API client
export const virtFusionApi = new VirtFusionApi();