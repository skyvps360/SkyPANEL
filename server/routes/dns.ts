import { Router, Request, Response } from 'express';
import { db } from '../db';
import { dnsDomains, dnsRecords, insertDnsDomainSchema, insertDnsRecordSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { interServerApi, InterServerApi } from '../interserver-api';
import { dnsAuthorityMonitor } from '../dns-authority-monitor';
import {
  VALID_DNS_RECORD_TYPES,
  processRecordName,
  validateRecordName
} from '@shared/dns-record-types';
import { z } from 'zod';

const router = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to check if InterServer API is configured
const requireInterServerConfig = (req: Request, res: Response, next: Function) => {
  if (!interServerApi.isConfigured()) {
    return res.status(503).json({ 
      error: 'DNS service not configured',
      message: 'InterServer API key is not configured'
    });
  }
  next();
};

// Apply middleware to all routes
router.use(requireAuth);
router.use(requireInterServerConfig);

/**
 * @route GET /api/dns/domains
 * @desc Get all DNS domains for the authenticated user
 */
router.get('/domains', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get domains from local database
    const localDomains = await db
      .select()
      .from(dnsDomains)
      .where(eq(dnsDomains.userId, userId));

    // Sync with InterServer API
    try {
      const interServerDomains = await interServerApi.getDnsList();

      console.log('InterServer domains found:', interServerDomains.length);
      console.log('Local domains to match:', localDomains.map(d => ({ id: d.id, name: d.name, interserverId: d.interserverId })));

      // Return combined data with InterServer status
      const domainsWithStatus = localDomains.map(domain => {
        const interServerDomain = interServerDomains.find(
          isd => parseInt(isd.id) === domain.interserverId
        );

        console.log(`Matching domain ${domain.name}: local interserverId=${domain.interserverId}, found=${!!interServerDomain}`);
        if (interServerDomain) {
          console.log(`  -> Matched with InterServer domain ID ${interServerDomain.id}`);
        }

        return {
          ...domain,
          interServerStatus: interServerDomain ? 'active' : 'not_found',
          interServerData: interServerDomain || null
        };
      });

      res.json({ domains: domainsWithStatus });
    } catch (interServerError) {
      console.error('InterServer API error:', interServerError);
      // Return local data even if InterServer API fails
      res.json({
        domains: localDomains,
        warning: `Could not sync with InterServer API: ${interServerError.message}`
      });
    }
  } catch (error) {
    console.error('Error fetching DNS domains:', error);
    res.status(500).json({ error: 'Failed to fetch DNS domains' });
  }
});

/**
 * @route POST /api/dns/domains
 * @desc Add a new DNS domain
 */
router.post('/domains', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Validate input
    const domainSchema = z.object({
      name: z.string().min(1, 'Domain name is required'),
      ip: z.string().min(1, 'IP address is required')
    });

    const { name, ip } = domainSchema.parse(req.body);

    // Validate domain name and IP
    if (!InterServerApi.validateDomainName(name)) {
      return res.status(400).json({ error: 'Invalid domain name format' });
    }

    if (!InterServerApi.validateIpAddress(ip)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    // Check if domain already exists for this user
    const existingDomain = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.userId, userId),
        eq(dnsDomains.name, name)
      ))
      .limit(1);

    if (existingDomain.length > 0) {
      return res.status(409).json({ error: 'Domain already exists' });
    }

    // Add domain to InterServer
    const interServerResult = await interServerApi.addDnsDomain(name, ip);

    // Extract InterServer domain ID from the result
    const interserverId = interServerResult?.id || null;

    if (interserverId) {
      console.log(`Successfully created domain ${name} in InterServer with ID: ${interserverId}`);
    } else {
      console.warn(`Domain ${name} was created in InterServer but ID could not be retrieved`);
    }

    // Save to local database
    const [newDomain] = await db
      .insert(dnsDomains)
      .values({
        userId,
        name,
        status: 'active',
        interserverId: interserverId
      })
      .returning();

    res.status(201).json({
      domain: newDomain,
      message: 'Domain added successfully',
      interServerStatus: interserverId ? 'linked' : 'created_but_not_linked',
      interServerResult: interServerResult
    });
  } catch (error) {
    console.error('Error adding DNS domain:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({ error: 'Failed to add DNS domain' });
  }
});

/**
 * @route GET /api/dns/domains/:id/records
 * @desc Get DNS records for a specific domain from InterServer
 */
router.get('/domains/:id/records', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.id);

    if (isNaN(domainId)) {
      return res.status(400).json({ error: 'Invalid domain ID' });
    }

    // Verify domain ownership
    const [domain] = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.id, domainId),
        eq(dnsDomains.userId, userId)
      ))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Get records from InterServer API if we have the InterServer domain ID
    if (domain.interserverId) {
      try {
        const interServerRecords = await interServerApi.getDnsDomain(domain.interserverId);

        // Convert InterServer records to our format for consistency
        const convertedRecords = interServerRecords.map(record => ({
          id: parseInt(record.id) || 0,
          domainId: domainId,
          interserverId: record.id,
          name: record.name, // Show actual domain names as they exist in InterServer
          type: record.type,
          content: record.content,
          ttl: parseInt(record.ttl) || 86400,
          priority: parseInt(record.prio) || 0,
          disabled: record.disabled === '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        // Return InterServer records only
        res.json({
          domain,
          records: convertedRecords,
          source: 'interserver'
        });
      } catch (interServerError) {
        console.error('InterServer API error:', interServerError);
        res.status(500).json({
          error: 'Failed to fetch DNS records from InterServer',
          details: interServerError.message
        });
      }
    } else {
      res.status(400).json({
        error: 'Domain not linked to InterServer',
        message: 'This domain does not have an InterServer ID and cannot manage DNS records'
      });
    }
  } catch (error) {
    console.error('Error fetching DNS records:', error);
    res.status(500).json({ error: 'Failed to fetch DNS records' });
  }
});

/**
 * @route DELETE /api/dns/domains/:id
 * @desc Delete a DNS domain
 */
router.delete('/domains/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.id);

    if (isNaN(domainId)) {
      return res.status(400).json({ error: 'Invalid domain ID' });
    }

    // Verify domain ownership
    const [domain] = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.id, domainId),
        eq(dnsDomains.userId, userId)
      ))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Delete from InterServer if we have the InterServer domain ID
    if (domain.interserverId) {
      try {
        await interServerApi.deleteDnsDomain(domain.interserverId);
      } catch (interServerError) {
        console.error('InterServer API error:', interServerError);
        // Continue with local deletion even if InterServer deletion fails
      }
    }

    // Delete from local database (this will cascade delete records)
    await db
      .delete(dnsDomains)
      .where(eq(dnsDomains.id, domainId));

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Error deleting DNS domain:', error);
    res.status(500).json({ error: 'Failed to delete DNS domain' });
  }
});

/**
 * @route POST /api/dns/domains/:id/records
 * @desc Add a new DNS record to a domain via InterServer API
 */
router.post('/domains/:id/records', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.id);

    if (isNaN(domainId)) {
      return res.status(400).json({ error: 'Invalid domain ID' });
    }

    // Validate input
    const recordSchema = z.object({
      name: z.string().refine((name) => validateRecordName(name), {
        message: 'Invalid record name format'
      }),
      type: z.enum(VALID_DNS_RECORD_TYPES as [string, ...string[]]),
      content: z.string().min(1, 'Record content is required'),
      ttl: z.number().min(60).max(86400).default(86400),
      priority: z.number().min(0).max(65535).default(0)
    });

    const recordData = recordSchema.parse(req.body);

    // Verify domain ownership
    const [domain] = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.id, domainId),
        eq(dnsDomains.userId, userId)
      ))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!domain.interserverId) {
      return res.status(400).json({
        error: 'Domain not linked to InterServer',
        message: 'This domain does not have an InterServer ID and cannot manage DNS records'
      });
    }

    // Process record name (convert "@" or empty string to domain name)
    const processedRecordName = processRecordName(recordData.name, domain.name);

    // Add record to InterServer
    try {
      const interServerResult = await interServerApi.addDnsRecord(domain.interserverId, {
        name: processedRecordName,
        type: recordData.type,
        content: recordData.content,
        ttl: recordData.ttl.toString(),
        prio: recordData.priority.toString(),
        disabled: '0',
        ordername: '',
        auth: '1'
      });

      console.log('InterServer add record result:', interServerResult);

      res.status(201).json({
        message: 'DNS record added successfully to InterServer',
        interServerResult: interServerResult
      });
    } catch (interServerError) {
      console.error('InterServer API error:', interServerError);
      return res.status(500).json({
        error: 'Failed to add record to InterServer',
        details: interServerError.message
      });
    }
  } catch (error) {
    console.error('Error adding DNS record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({ error: 'Failed to add DNS record' });
  }
});

/**
 * @route PUT /api/dns/domains/:domainId/records/:recordId
 * @desc Update a DNS record via InterServer API
 */
router.put('/domains/:domainId/records/:recordId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.domainId);
    const recordId = parseInt(req.params.recordId); // This is the InterServer record ID

    if (isNaN(domainId) || isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid domain or record ID' });
    }

    // Validate input
    const recordSchema = z.object({
      name: z.string().refine((name) => validateRecordName(name), {
        message: 'Invalid record name format'
      }),
      type: z.enum(VALID_DNS_RECORD_TYPES as [string, ...string[]]),
      content: z.string().min(1, 'Record content is required'),
      ttl: z.number().min(60).max(86400),
      priority: z.number().min(0).max(65535),
      disabled: z.boolean().default(false)
    });

    const recordData = recordSchema.parse(req.body);

    // Verify domain ownership
    const [domain] = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.id, domainId),
        eq(dnsDomains.userId, userId)
      ))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!domain.interserverId) {
      return res.status(400).json({
        error: 'Domain not linked to InterServer',
        message: 'This domain does not have an InterServer ID and cannot manage DNS records'
      });
    }

    // Process record name (convert "@" or empty string to domain name)
    const processedRecordName = processRecordName(recordData.name, domain.name);

    // Update record in InterServer
    try {
      const updateResult = await interServerApi.updateDnsRecord(
        domain.interserverId,
        recordId, // Use the InterServer record ID directly
        {
          name: processedRecordName,
          type: recordData.type,
          content: recordData.content,
          ttl: recordData.ttl.toString(),
          prio: recordData.priority.toString(),
          disabled: recordData.disabled ? '1' : '0',
          ordername: '',
          auth: '1'
        }
      );

      console.log('InterServer update record result:', updateResult);

      res.json({
        message: 'DNS record updated successfully in InterServer',
        interServerResult: updateResult
      });
    } catch (interServerError) {
      console.error('InterServer API error:', interServerError);
      return res.status(500).json({
        error: 'Failed to update record in InterServer',
        details: interServerError.message
      });
    }
  } catch (error) {
    console.error('Error updating DNS record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({ error: 'Failed to update DNS record' });
  }
});

/**
 * @route DELETE /api/dns/domains/:domainId/records/:recordId
 * @desc Delete a DNS record via InterServer API
 */
router.delete('/domains/:domainId/records/:recordId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.domainId);
    const recordId = parseInt(req.params.recordId); // This is the InterServer record ID

    if (isNaN(domainId) || isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid domain or record ID' });
    }

    // Verify domain ownership
    const [domain] = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.id, domainId),
        eq(dnsDomains.userId, userId)
      ))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!domain.interserverId) {
      return res.status(400).json({
        error: 'Domain not linked to InterServer',
        message: 'This domain does not have an InterServer ID and cannot manage DNS records'
      });
    }

    // Delete record from InterServer
    try {
      await interServerApi.deleteDnsRecord(
        domain.interserverId,
        recordId // Use the InterServer record ID directly
      );

      console.log(`Successfully deleted DNS record ${recordId} from InterServer domain ${domain.interserverId}`);

      res.json({
        message: 'DNS record deleted successfully from InterServer',
        deletedRecordId: recordId,
        domainId: domain.interserverId
      });
    } catch (interServerError) {
      console.error('InterServer API error:', interServerError);
      return res.status(500).json({
        error: 'Failed to delete record from InterServer',
        details: interServerError.message
      });
    }
  } catch (error) {
    console.error('Error deleting DNS record:', error);
    res.status(500).json({ error: 'Failed to delete DNS record' });
  }
});

export default router;
