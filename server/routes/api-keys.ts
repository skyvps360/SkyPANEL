import { Router } from 'express';
import { ApiKeyService } from '../api-key-service';
import { z } from 'zod';

const router = Router();

// Get all API keys for the authenticated user
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const keys = await ApiKeyService.getUserApiKeys(userId);
    
    // Transform keys to match client-side expected format
    const transformedKeys = keys.map(key => ({
      ...key,
      active: key.isActive, // Add active property to match client expectations
    }));
    
    return res.json(transformedKeys);
  } catch (error: any) {
    console.error('Error getting API keys:', error);
    return res.status(500).json({ message: 'An error occurred while getting API keys' });
  }
});

// Generate a new API key
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      scopes: z.array(z.string()).optional(),
      expiresIn: z.number().nullable().optional(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }

    const { name, scopes = [], expiresIn = null } = validationResult.data;
    const result = await ApiKeyService.generateApiKey(userId, name, scopes, expiresIn);
    
    // Make sure we're using the consistent active property, not isActive
    // Since the result already has the 'active' property set to true from the service
    const transformedResult = {
      ...result
    };
    
    return res.status(201).json(transformedResult);
  } catch (error: any) {
    console.error('Error generating API key:', error);
    return res.status(500).json({ message: 'An error occurred while generating the API key' });
  }
});

// Revoke an API key
router.put('/:id/revoke', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const keyId = parseInt(req.params.id);
    if (isNaN(keyId)) {
      return res.status(400).json({ message: 'Invalid API key ID' });
    }

    await ApiKeyService.revokeApiKey(userId, keyId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error revoking API key:', error);
    return res.status(500).json({ message: 'An error occurred while revoking the API key' });
  }
});

// Delete an API key
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const keyId = parseInt(req.params.id);
    if (isNaN(keyId)) {
      return res.status(400).json({ message: 'Invalid API key ID' });
    }

    await ApiKeyService.deleteApiKey(userId, keyId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return res.status(500).json({ message: 'An error occurred while deleting the API key' });
  }
});

export default router;