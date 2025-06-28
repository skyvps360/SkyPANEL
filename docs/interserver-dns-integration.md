# InterServer DNS Integration

## Overview

This document describes the comprehensive integration with InterServer's DNS API for domain management, including domain creation, deletion, bulk operations, and the critical domain cleanup system for DNS plan downgrades.

## InterServer API Configuration

### API Endpoints
```javascript
const INTERSERVER_API = {
  base: 'https://my.interserver.net/apiv2',
  endpoints: {
    list: '/dns',
    create: '/dns',
    get: '/dns/{id}',
    update: '/dns/{id}',
    delete: '/dns/{id}'
  },
  headers: {
    'X-API-KEY': process.env.INTERSERVER_API_KEY,
    'Content-Type': 'application/json'
  }
};
```

### Authentication
- **API Key**: Stored in environment variables
- **Header**: `X-API-KEY` authentication
- **Security**: API key rotation and monitoring

## Domain Operations

### List Domains
```javascript
const getDnsList = async () => {
  try {
    const response = await fetch(`${INTERSERVER_API.base}/dns`, {
      method: 'GET',
      headers: INTERSERVER_API.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch DNS list from InterServer:', error);
    throw error;
  }
};
```

### Create Domain
```javascript
const createDnsDomain = async (domainData) => {
  try {
    const response = await fetch(`${INTERSERVER_API.base}/dns`, {
      method: 'POST',
      headers: INTERSERVER_API.headers,
      body: JSON.stringify({
        name: domainData.name,
        type: domainData.type || 'master',
        records: domainData.records || []
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create DNS domain:', error);
    throw error;
  }
};
```

### Delete Domain
```javascript
const deleteDnsDomain = async (domainId) => {
  try {
    const response = await fetch(`${INTERSERVER_API.base}/dns/${domainId}`, {
      method: 'DELETE',
      headers: INTERSERVER_API.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to delete DNS domain ${domainId}:`, error);
    throw error;
  }
};
```

### Get Domain Details
```javascript
const getDnsDomain = async (domainId) => {
  try {
    const response = await fetch(`${INTERSERVER_API.base}/dns/${domainId}`, {
      method: 'GET',
      headers: INTERSERVER_API.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch DNS domain ${domainId}:`, error);
    throw error;
  }
};
```

## Critical Domain Cleanup System

### DNS Plan Downgrade Domain Removal
When users downgrade DNS plans, excess domains must be removed from both InterServer and the local database:

```javascript
const handlePlanDowngrade = async (userId, newPlan, selectedDomainIds) => {
  const domainDeletionResults = {
    successful: [],
    failed: [],
    skippedNoInterServerId: []
  };
  
  // Get current user domains
  const userDomains = await db.select()
    .from(dnsDomainsTable)
    .where(eq(dnsDomainsTable.userId, userId));
  
  // Validate domain selection
  if (userDomains.length > newPlan.maxDomains) {
    if (!selectedDomainIds || selectedDomainIds.length !== newPlan.maxDomains) {
      throw new Error(`Domain selection required. Please select exactly ${newPlan.maxDomains} domain(s) to keep.`);
    }
  }
  
  // Get domains to remove (not in selectedDomainIds)
  const domainsToRemove = userDomains.filter(domain => 
    !selectedDomainIds.includes(domain.id)
  );
  
  // CRITICAL FIX: Fetch ALL domains from InterServer
  let interServerDomains = [];
  try {
    interServerDomains = await interServerApi.getDnsList();
    console.log(`Found ${interServerDomains.length} domains in InterServer`);
  } catch (error) {
    console.error('Failed to fetch domains from InterServer:', error);
  }
  
  // Create comprehensive deletion plan
  const selectedDomainNames = userDomains
    .filter(d => selectedDomainIds.includes(d.id))
    .map(d => d.name);
  
  // Find InterServer domains that should be deleted
  const interServerDomainsToDelete = interServerDomains.filter(
    interServerDomain => !selectedDomainNames.includes(interServerDomain.name)
  );
  
  // STEP 1: Delete ALL InterServer domains not in selected list
  for (const interServerDomain of interServerDomainsToDelete) {
    try {
      await interServerApi.deleteDnsDomain(interServerDomain.id);
      console.log(`✅ Successfully removed domain ${interServerDomain.name} from InterServer`);
      domainDeletionResults.successful.push(interServerDomain.name);
    } catch (error) {
      console.error(`❌ Failed to remove domain ${interServerDomain.name} from InterServer:`, error);
      domainDeletionResults.failed.push({
        name: interServerDomain.name,
        error: `InterServer deletion failed: ${error.message}`
      });
    }
  }
  
  // STEP 2: Clean up local database entries
  for (const domain of domainsToRemove) {
    try {
      await db.delete(dnsDomainsTable)
        .where(eq(dnsDomainsTable.id, domain.id));
      
      console.log(`✅ Successfully removed domain ${domain.name} from local database`);
    } catch (error) {
      console.error(`❌ Failed to remove domain ${domain.name} from local database:`, error);
      
      const wasAlreadyFailed = domainDeletionResults.failed.some(f => f.name === domain.name);
      if (!wasAlreadyFailed) {
        domainDeletionResults.failed.push({
          name: domain.name,
          error: `Local database deletion failed: ${error.message}`
        });
      }
    }
  }
  
  return domainDeletionResults;
};
```

### Why This Fix Was Critical
The original implementation had a significant bug where domains could exist in InterServer but not in the local database. During plan downgrades, only local domains were being deleted, leaving orphaned domains in InterServer. The fix ensures:

1. **Comprehensive Cleanup**: All InterServer domains are fetched and compared
2. **Complete Deletion**: Domains are removed from both InterServer and local database
3. **Orphan Prevention**: Prevents domains from being left in InterServer
4. **Error Handling**: Robust error handling for both systems
5. **Audit Trail**: Complete logging of deletion operations

## Domain Synchronization

### Sync Local Database with InterServer
```javascript
const syncDomainsWithInterServer = async (userId) => {
  try {
    // Get domains from InterServer
    const interServerDomains = await interServerApi.getDnsList();
    
    // Get local domains for user
    const localDomains = await db.select()
      .from(dnsDomainsTable)
      .where(eq(dnsDomainsTable.userId, userId));
    
    const syncResults = {
      added: [],
      removed: [],
      updated: [],
      errors: []
    };
    
    // Find domains in InterServer but not in local database
    for (const interServerDomain of interServerDomains) {
      const localDomain = localDomains.find(d => d.name === interServerDomain.name);
      
      if (!localDomain) {
        try {
          await db.insert(dnsDomainsTable).values({
            userId: userId,
            name: interServerDomain.name,
            interserverId: interServerDomain.id,
            status: 'active',
            createdAt: new Date()
          });
          
          syncResults.added.push(interServerDomain.name);
        } catch (error) {
          syncResults.errors.push({
            domain: interServerDomain.name,
            error: error.message
          });
        }
      }
    }
    
    // Find domains in local database but not in InterServer
    for (const localDomain of localDomains) {
      const interServerDomain = interServerDomains.find(d => d.name === localDomain.name);
      
      if (!interServerDomain) {
        try {
          await db.delete(dnsDomainsTable)
            .where(eq(dnsDomainsTable.id, localDomain.id));
          
          syncResults.removed.push(localDomain.name);
        } catch (error) {
          syncResults.errors.push({
            domain: localDomain.name,
            error: error.message
          });
        }
      }
    }
    
    return syncResults;
  } catch (error) {
    console.error('Domain synchronization failed:', error);
    throw error;
  }
};
```

## Error Handling and Resilience

### Retry Logic
```javascript
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Usage
const createDomainWithRetry = async (domainData) => {
  return await retryOperation(() => createDnsDomain(domainData));
};
```

### Error Classification
```javascript
const classifyInterServerError = (error) => {
  if (error.message.includes('404')) {
    return { type: 'NOT_FOUND', retryable: false };
  }
  
  if (error.message.includes('429')) {
    return { type: 'RATE_LIMITED', retryable: true };
  }
  
  if (error.message.includes('500')) {
    return { type: 'SERVER_ERROR', retryable: true };
  }
  
  if (error.message.includes('timeout')) {
    return { type: 'TIMEOUT', retryable: true };
  }
  
  return { type: 'UNKNOWN', retryable: false };
};
```

### Graceful Degradation
```javascript
const handleInterServerFailure = async (operation, fallbackAction) => {
  try {
    return await operation();
  } catch (error) {
    const errorClass = classifyInterServerError(error);
    
    if (errorClass.retryable) {
      // Log for retry later
      await logFailedOperation(operation, error);
    }
    
    // Execute fallback action
    if (fallbackAction) {
      return await fallbackAction();
    }
    
    throw error;
  }
};
```

## Monitoring and Logging

### Operation Logging
```javascript
const logDnsOperation = (operation, domain, result, error = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    domain,
    result,
    error: error?.message,
    source: 'interserver-dns-integration'
  };
  
  if (error) {
    logger.error('DNS Operation Failed', logEntry);
  } else {
    logger.info('DNS Operation Success', logEntry);
  }
};
```

### Health Monitoring
```javascript
const checkInterServerHealth = async () => {
  try {
    const startTime = Date.now();
    await fetch(`${INTERSERVER_API.base}/dns`, {
      method: 'HEAD',
      headers: INTERSERVER_API.headers
    });
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};
```

## Performance Optimizations

### Batch Operations
```javascript
const batchDeleteDomains = async (domainIds, batchSize = 5) => {
  const results = [];
  
  for (let i = 0; i < domainIds.length; i += batchSize) {
    const batch = domainIds.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (domainId) => {
      try {
        await deleteDnsDomain(domainId);
        return { domainId, status: 'success' };
      } catch (error) {
        return { domainId, status: 'failed', error: error.message };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults.map(r => r.value));
    
    // Rate limiting delay between batches
    if (i + batchSize < domainIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};
```

### Caching Strategy
```javascript
const domainCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedDomainList = async () => {
  const cacheKey = 'interserver_domains';
  const cached = domainCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const domains = await getDnsList();
  domainCache.set(cacheKey, {
    data: domains,
    timestamp: Date.now()
  });
  
  return domains;
};
```

## Security Considerations

### API Key Management
- **Environment Variables**: Store API keys securely
- **Rotation**: Regular API key rotation
- **Access Control**: Limit API key permissions
- **Monitoring**: Track API key usage

### Input Validation
```javascript
const validateDomainName = (domain) => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  
  if (!domainRegex.test(domain)) {
    throw new Error('Invalid domain name format');
  }
  
  if (domain.length > 253) {
    throw new Error('Domain name too long');
  }
  
  return true;
};
```

### Rate Limiting
```javascript
const rateLimiter = {
  requests: new Map(),
  limit: 100, // requests per minute
  window: 60 * 1000, // 1 minute
  
  checkLimit: function(key) {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.window);
    
    if (validRequests.length >= this.limit) {
      throw new Error('Rate limit exceeded');
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
};
```

## Future Enhancements

### Planned Improvements
1. **WebSocket Integration**: Real-time domain status updates
2. **Advanced DNS Records**: Support for complex DNS record types
3. **Multi-Provider Support**: Support for additional DNS providers
4. **Automated Backups**: Regular DNS configuration backups
5. **Analytics Integration**: DNS usage analytics and reporting

### Scalability Considerations
1. **Connection Pooling**: Efficient HTTP connection management
2. **Load Balancing**: Distribute API calls across multiple endpoints
3. **Caching Layers**: Multi-level caching for improved performance
4. **Queue System**: Background processing for bulk operations
5. **Monitoring Dashboard**: Real-time monitoring and alerting
