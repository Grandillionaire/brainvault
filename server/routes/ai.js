import express from 'express';
import fetch from 'node-fetch';
import { searchNotes } from '../services/database.js';

const router = express.Router();

// Check Ollama status
router.get('/status', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const online = response.ok;

    res.json({
      ollama: online ? 'online' : 'offline',
      models: online ? await response.json() : []
    });
  } catch (error) {
    res.json({
      ollama: 'offline',
      models: []
    });
  }
});

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, noteIds = [], model = 'llama2' } = req.body;

    // Get relevant notes for context
    let context = '';

    if (noteIds.length > 0) {
      // Get specific notes
      const notes = noteIds
        .map(id => getNoteById(id))
        .filter(Boolean)
        .map(note => `Title: ${note.title}\n${note.content}`)
        .join('\n\n---\n\n');
      context = notes;
    } else {
      // Search for relevant notes
      const results = searchNotes(message, { limit: 3 });
      context = results
        .map(r => `Title: ${r.title}\n${r.content.substring(0, 500)}`)
        .join('\n\n---\n\n');
    }

    // Try Ollama first
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: `You are a helpful assistant analyzing a personal knowledge base.

Context from notes:
${context}

User question: ${message}

Provide a helpful response based on the context above.`,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          response: data.response,
          sources: results.map(r => ({
            id: r.id,
            title: r.title,
            snippet: r.content.substring(0, 150)
          }))
        });
      }
    } catch (error) {
      console.error('Ollama error:', error);
    }

    // Fallback response
    res.json({
      response: `I found ${results.length} relevant notes for "${message}". Please review them for more information.`,
      sources: results.map(r => ({
        id: r.id,
        title: r.title,
        snippet: r.content.substring(0, 150)
      }))
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Generate suggestions
router.post('/suggest', async (req, res) => {
  try {
    const { content, type = 'tags' } = req.body;

    // Simple tag extraction for now
    if (type === 'tags') {
      const words = content.toLowerCase().split(/\s+/);
      const commonTags = ['work', 'personal', 'idea', 'project', 'meeting', 'todo'];
      const suggestions = commonTags.filter(tag =>
        words.some(word => word.includes(tag) || tag.includes(word))
      );

      return res.json({ suggestions });
    }

    if (type === 'links') {
      // Find related notes
      const results = searchNotes(content.substring(0, 100), { limit: 5 });
      const suggestions = results.map(r => r.title);
      return res.json({ suggestions });
    }

    res.json({ suggestions: [] });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ error: 'Suggestion generation failed' });
  }
});

// Summarize content
router.post('/summarize', async (req, res) => {
  try {
    const { content } = req.body;

    // Simple extractive summarization
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 3).join(' ');

    res.json({ summary });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

export default router;