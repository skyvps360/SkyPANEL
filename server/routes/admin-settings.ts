import { Router } from 'express';
import { db } from '../db';
import { settings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { SettingsService } from '../settings-service';

const router = Router();

// Function to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Get all admin settings
router.get('/api/admin/settings', isAdmin, async (req, res) => {
  try {
    const allSettings = await SettingsService.getAllSettings();
    return res.json(allSettings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return res.status(500).json({ error: 'Failed to fetch admin settings' });
  }
});

// Get a specific setting
router.get('/api/admin/settings/:key', isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await SettingsService.getSetting(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    return res.json({ key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update a setting
router.post('/api/admin/settings', isAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    const success = await SettingsService.updateSetting(key, String(value));
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update setting' });
    }
    
    return res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get public settings (accessible without authentication)
router.get('/api/settings/public', async (req, res) => {
  try {
    // Add the keys for settings that should be publicly accessible
    const publicSettingKeys = [
      'loading_screen_enabled',
      'loading_screen_duration',
      'loading_screen_always_show',
      // Add other public setting keys as needed
    ];
    
    const publicSettings: Record<string, any> = {};
    
    for (const key of publicSettingKeys) {
      const value = await SettingsService.getSetting(key);
      if (value !== null) {
        publicSettings[key] = value;
      }
    }
    
    return res.json(publicSettings);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

export default router;