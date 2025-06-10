import { db } from '../../db';
import { apiKeys, users, InsertApiKey } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';

/**
 * Service for managing API keys
 */
export class ApiKeyService {
  /**
   * Generate a new API key for a user
   * @param userId The user ID
   * @param name A user-friendly name for the key
   * @param scopes Array of allowed scopes
   * @param expiresIn Number of days until the key expires (null for never)
   * @returns Object containing the API key and its information
   */
  static async generateApiKey(
    userId: number,
    name: string,
    scopes: string[] = [],
    expiresIn: number | null = null
  ): Promise<{ 
    apiKey: string;
    prefix: string;
    expiresAt: Date | null;
  }> {
    // Check if the user exists
    const userExists = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Generate the key with required format: skyvps360_live_clientID_randomgeneratedID
    const randomSuffix = randomBytes(16).toString('hex');
    const prefix = "skyvps360_live";
    const clientPart = `${userId}`; // Use the userId as the clientID part
    const keyWithoutPrefix = `${clientPart}_${randomSuffix}`;
    
    // Hash the key for storage - when validating we'll use prefix + key format
    const hashedKey = createHash('sha256').update(prefix + keyWithoutPrefix).digest('hex');
    
    // Calculate expiration date if provided
    let expiresAt: Date | null = null;
    if (expiresIn !== null && expiresIn > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }
    
    // Insert the API key into the database
    const newApiKey: InsertApiKey = {
      userId,
      name,
      key: hashedKey,
      prefix,
      scopes,
      expiresAt,
      isActive: true,
    };
    
    await db.insert(apiKeys).values(newApiKey);
    
    // Return the API key in the format expected by the client
    // The API key is only returned once upon creation with the full key
    const apiKeyForClient = {
      id: 0, // This will be assigned by the database
      userId,
      name,
      key: `${prefix}.${keyWithoutPrefix}`,
      prefix,
      scopes,
      active: true, // Make sure this is set to true for new keys
      apiKey: `${prefix}.${keyWithoutPrefix}`, // For backwards compatibility
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
    
    return apiKeyForClient;
  }
  
  /**
   * Get all API keys for a user
   * @param userId The user ID
   * @returns Array of API keys
   */
  static async getUserApiKeys(userId: number): Promise<{
    id: number;
    name: string;
    prefix: string;
    scopes: string[];
    lastUsed: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    isActive: boolean;
  }[]> {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        lastUsed: apiKeys.lastUsed,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        isActive: apiKeys.isActive,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(apiKeys.createdAt);
    
    return keys;
  }
  
  /**
   * Revoke (deactivate) an API key
   * @param userId The user ID
   * @param keyId The API key ID
   * @returns Success status
   */
  static async revokeApiKey(userId: number, keyId: number): Promise<boolean> {
    const result = await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, userId)
        )
      );
    
    return true;
  }
  
  /**
   * Delete an API key
   * @param userId The user ID
   * @param keyId The API key ID
   * @returns Success status
   */
  static async deleteApiKey(userId: number, keyId: number): Promise<boolean> {
    await db
      .delete(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, userId)
        )
      );
    
    return true;
  }
  
  /**
   * Validate an API key
   * @param apiKey The API key to validate
   * @returns The user ID if valid, null otherwise
   */
  static async validateApiKey(apiKey: string): Promise<{
    userId: number;
    scopes: string[];
  } | null> {
    // Split the API key into prefix and key
    const parts = apiKey.split('.');
    if (parts.length !== 2) {
      console.error("API key validation failed: Invalid format (missing separator)");
      return null;
    }
    
    const [prefix, key] = parts;
    
    // Validate prefix format - must be "skyvps360_live"
    if (prefix !== "skyvps360_live") {
      console.error(`API key validation failed: Invalid prefix "${prefix}"`);
      return null;
    }
    
    // Validate key format - must be "clientID_randomString"
    const keyParts = key.split('_');
    if (keyParts.length !== 2) {
      console.error("API key validation failed: Invalid key format (missing underscore separator)");
      return null;
    }
    
    // Ensure the clientID part is a valid number
    const clientId = parseInt(keyParts[0], 10);
    if (isNaN(clientId)) {
      console.error(`API key validation failed: Invalid client ID "${keyParts[0]}"`);
      return null;
    }
    
    // Check if the random part has the correct length (32 characters for 16 bytes hex)
    if (keyParts[1].length !== 32) {
      console.error(`API key validation failed: Invalid random part length ${keyParts[1].length}`);
      return null;
    }
    
    // Hash the full key for comparison - using the same logic as key generation
    const hashedKey = createHash('sha256').update(prefix + key).digest('hex');
    
    // Find the API key in the database
    const foundKeys = await db
      .select({
        userId: apiKeys.userId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        isActive: apiKeys.isActive,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.key, hashedKey),
          eq(apiKeys.prefix, prefix),
          eq(apiKeys.isActive, true)
        )
      )
      .limit(1);
    
    if (foundKeys.length === 0) {
      console.error("API key validation failed: Key not found in database");
      return null;
    }
    
    const foundKey = foundKeys[0];
    
    // Check if the key has expired
    if (foundKey.expiresAt && foundKey.expiresAt < new Date()) {
      // Deactivate the key
      await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(
          and(
            eq(apiKeys.key, hashedKey),
            eq(apiKeys.prefix, prefix)
          )
        );
      
      return null;
    }
    
    // Update the last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(
        and(
          eq(apiKeys.key, hashedKey),
          eq(apiKeys.prefix, prefix)
        )
      );
    
    return {
      userId: foundKey.userId,
      scopes: foundKey.scopes,
    };
  }
}