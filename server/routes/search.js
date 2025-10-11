import express from 'express';
import { searchNotes, getAllTags } from '../services/database.js';

const router = express.Router();

// Search notes
router.get('/', async (req, res) => {
  try {
    const {
      q: query = '',
      tags = '',
      limit = 50,
      offset = 0,
      sortBy = 'relevance'
    } = req.query;

    const tagList = tags ? tags.split(',').filter(Boolean) : [];

    const results = searchNotes(query, {
      tags: tagList,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy
    });

    res.json({
      results,
      query,
      total: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get all tags with counts
router.get('/tags', async (req, res) => {
  try {
    const tags = getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get suggestions for autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query = '', type = 'all' } = req.query;

    const suggestions = [];

    if (type === 'all' || type === 'notes') {
      // Get note title suggestions
      const notes = searchNotes(query, { limit: 10 });
      notes.forEach(note => {
        suggestions.push({
          type: 'note',
          value: note.title,
          id: note.id
        });
      });
    }

    if (type === 'all' || type === 'tags') {
      // Get tag suggestions
      const tags = getAllTags();
      tags
        .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
        .forEach(tag => {
          suggestions.push({
            type: 'tag',
            value: tag.name,
            count: tag.count
          });
        });
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;