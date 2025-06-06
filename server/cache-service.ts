import { betterStackService } from './betterstack-service';
import { geminiRateLimiter } from './gemini-rate-limiter';

/**
 * Cache Service for managing various cache types in SkyPANEL
 */
export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Clear all caches
   */
  public async clearAllCaches(): Promise<{
    success: boolean;
    clearedCaches: string[];
    errors: string[];
  }> {
    const clearedCaches: string[] = [];
    const errors: string[] = [];

    try {
      // Clear BetterStack monitors cache
      await this.clearBetterStackCache();
      clearedCaches.push('BetterStack monitors cache');
    } catch (error) {
      errors.push(`BetterStack cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Clear Gemini rate limiter cache
      await this.clearGeminiRateLimiterCache();
      clearedCaches.push('Gemini rate limiter cache');
    } catch (error) {
      errors.push(`Gemini rate limiter cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Clear Node.js module cache (be careful with this)
      await this.clearNodeModuleCache();
      clearedCaches.push('Node.js module cache (selective)');
    } catch (error) {
      errors.push(`Node.js module cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      clearedCaches,
      errors
    };
  }

  /**
   * Clear BetterStack monitors cache
   */
  public async clearBetterStackCache(): Promise<void> {
    const betterStack = betterStackService;
    // Reset the cache by setting monitorsCache to empty and lastFetch to 0
    (betterStack as any).monitorsCache = [];
    (betterStack as any).lastFetch = 0;
    console.log('BetterStack monitors cache cleared');
  }

  /**
   * Clear Gemini rate limiter cache
   */
  public async clearGeminiRateLimiterCache(): Promise<void> {
    geminiRateLimiter.clearAllUsage();
    console.log('Gemini rate limiter cache cleared');
  }

  /**
   * Clear selective Node.js module cache
   * Only clears non-core modules that are safe to reload
   */
  public async clearNodeModuleCache(): Promise<void> {
    const modulesToClear = [
      // Clear our custom services that might have cached data
      './betterstack-service',
      './gemini-service',
      './email-service',
      './storage'
    ];

    let clearedCount = 0;
    for (const modulePath of modulesToClear) {
      try {
        const resolvedPath = require.resolve(modulePath);
        if (require.cache[resolvedPath]) {
          delete require.cache[resolvedPath];
          clearedCount++;
        }
      } catch (error) {
        // Module not found or already cleared, continue
        console.log(`Module ${modulePath} not found in cache or already cleared`);
      }
    }
    
    console.log(`Cleared ${clearedCount} Node.js modules from cache`);
  }

  /**
   * Clear specific cache type
   */
  public async clearSpecificCache(cacheType: 'betterstack' | 'gemini' | 'modules'): Promise<void> {
    switch (cacheType) {
      case 'betterstack':
        await this.clearBetterStackCache();
        break;
      case 'gemini':
        await this.clearGeminiRateLimiterCache();
        break;
      case 'modules':
        await this.clearNodeModuleCache();
        break;
      default:
        throw new Error(`Unknown cache type: ${cacheType}`);
    }
  }

  /**
   * Get cache status information
   */
  public async getCacheStatus(): Promise<{
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
  }> {
    const betterStack = betterStackService;
    const betterStackCache = (betterStack as any).monitorsCache || [];
    const betterStackLastFetch = (betterStack as any).lastFetch || 0;

    return {
      betterstack: {
        cacheSize: betterStackCache.length,
        lastFetch: betterStackLastFetch,
        cacheAge: Date.now() - betterStackLastFetch
      },
      gemini: {
        activeUsers: geminiRateLimiter.getActiveUserCount()
      },
      modules: {
        cachedModules: Object.keys(require.cache).length
      }
    };
  }
}

export const cacheService = CacheService.getInstance();
