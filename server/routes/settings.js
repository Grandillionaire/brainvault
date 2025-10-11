import express from 'express';
import { getSetting, setSetting, getAllSettings } from '../services/database.js';

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get single setting
router.get('/:key', async (req, res) => {
  try {
    const value = getSetting(req.params.key);

    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    setSetting(key, value);

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'settings:updated',
        data: { key, value }
      });
    }

    res.json({ key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Bulk update settings
router.put('/', async (req, res) => {
  try {
    const updates = req.body;

    Object.entries(updates).forEach(([key, value]) => {
      setSetting(key, value);
    });

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'settings:updated',
        data: updates
      });
    }

    res.json(updates);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset settings to defaults
router.post('/reset', async (req, res) => {
  try {
    const defaults = {
      theme: 'auto',
      fontSize: '16',
      fontFamily: 'Inter',
      autoSave: 'true',
      autoSaveInterval: '30000'
    };

    Object.entries(defaults).forEach(([key, value]) => {
      setSetting(key, value);
    });

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'settings:reset',
        data: defaults
      });
    }

    res.json(defaults);
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

export default router;