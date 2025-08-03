import { betterStackService } from './betterstack-service';
import { geminiRateLimiter } from '../../gemini-rate-limiter';

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
    try {
      const betterStack = betterStackService;
      // Check if the service has the cache properties before accessing them
      if (betterStack && typeof betterStack === 'object') {
        // Reset the cache by setting monitorsCache to empty and lastFetch to 0
        (betterStack as any).monitorsCache = [];
        (betterStack as any).lastFetch = 0;
        console.log('BetterStack monitors cache cleared successfully');
      } else {
        console.warn('BetterStack service not available or not an object');
      }
    } catch (error) {
      console.error('Error clearing BetterStack cache:', error);
      throw new Error(`Failed to clear BetterStack cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear Gemini rate limiter cache
   */
  public async clearGeminiRateLimiterCache(): Promise<void> {
    try {
      if (geminiRateLimiter && typeof geminiRateLimiter.clearAllUsage === 'function') {
        geminiRateLimiter.clearAllUsage();
        console.log('Gemini rate limiter cache cleared successfully');
      } else {
        console.warn('Gemini rate limiter not available or clearAllUsage method not found');
      }
    } catch (error) {
      console.error('Error clearing Gemini rate limiter cache:', error);
      throw new Error(`Failed to clear Gemini rate limiter cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear selective Node.js module cache
   * Only clears non-core modules that are safe to reload
   */
  public async clearNodeModuleCache(): Promise<void> {
    try {
      // Only proceed if we're in a Node.js environment
      if (typeof require === 'undefined' || !require.cache) {
        console.warn('Module cache clearing skipped - not in Node.js environment or require.cache not available');
        return;
      }

      const modulesToClear = [
        // Clear our custom services that might have cached data
        './betterstack-service',
        '../../gemini-service',
        '../../email',
        '../../storage'
      ];

      let clearedCount = 0;
      const errors: string[] = [];

      for (const modulePath of modulesToClear) {
        try {
          const resolvedPath = require.resolve(modulePath);
          if (require.cache[resolvedPath]) {
            delete require.cache[resolvedPath];
            clearedCount++;
            console.log(`Cleared module: ${modulePath}`);
          } else {
            console.log(`Module ${modulePath} not found in cache`);
          }
        } catch (error) {
          // Module not found or resolution failed
          const errorMsg = `Module ${modulePath} not found or already cleared: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.log(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      console.log(`Successfully cleared ${clearedCount} Node.js modules from cache`);
      if (errors.length > 0) {
        console.log(`Encountered ${errors.length} non-critical errors during module cache clearing`);
      }
    } catch (error) {
      console.error('Error during module cache clearing:', error);
      throw new Error(`Failed to clear module cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      cachedModules: number | null;
    };
  }> {
    try {
      // BetterStack cache status
      let betterStackCache: any[] = [];
      let betterStackLastFetch = 0;
      
      try {
        const betterStack = betterStackService;
        if (betterStack && typeof betterStack === 'object') {
          betterStackCache = (betterStack as any).monitorsCache || [];
          betterStackLastFetch = (betterStack as any).lastFetch || 0;
        }
      } catch (error) {
        console.warn('Error accessing BetterStack service for cache status:', error);
      }

      // Gemini rate limiter status
      let geminiActiveUsers = 0;
      try {
        if (geminiRateLimiter && typeof geminiRateLimiter.getActiveUserCount === 'function') {
          geminiActiveUsers = geminiRateLimiter.getActiveUserCount();
        }
      } catch (error) {
        console.warn('Error accessing Gemini rate limiter for cache status:', error);
      }

      // Node.js module cache status
      let cachedModulesCount: number | null = null;
      try {
        // Only access require.cache in Node.js environment
        if (typeof require !== 'undefined' && require.cache) {
          cachedModulesCount = Object.keys(require.cache).length;
        }
      } catch (error) {
        console.log('Could not access require.cache - likely in a browser environment');
      }

      const currentTime = Date.now();
      const cacheAge = betterStackLastFetch > 0 ? currentTime - betterStackLastFetch : 0;

      return {
        betterstack: {
          cacheSize: Array.isArray(betterStackCache) ? betterStackCache.length : 0,
          lastFetch: betterStackLastFetch,
          cacheAge: cacheAge
        },
        gemini: {
          activeUsers: Math.max(0, geminiActiveUsers) // Ensure non-negative
        },
        modules: {
          cachedModules: cachedModulesCount
        }
      };
    } catch (error) {
      console.error('Error getting cache status:', error);
      // Return safe defaults in case of error
      return {
        betterstack: {
          cacheSize: 0,
          lastFetch: 0,
          cacheAge: 0
        },
        gemini: {
          activeUsers: 0
        },
        modules: {
          cachedModules: null
        }
      };
    }
  }
}

export const cacheService = CacheService.getInstance();