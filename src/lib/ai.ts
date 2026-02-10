/**
 * AI Utilities for BrainVault
 * Provides semantic search, summarization, and related note generation
 */

import Fuse from "fuse.js";
import { Note } from "../types";

export interface SemanticSearchResult {
  note: Note;
  score: number;
  relevanceReason: string;
}

export interface RelatedNote {
  note: Note;
  connectionStrength: number;
  connectionReasons: string[];
}

/**
 * Calculate semantic similarity between two texts using TF-IDF-like approach
 * This is a lightweight alternative to embeddings that works offline
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = extractKeywords(text1);
  const words2 = extractKeywords(text2);
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Extract meaningful keywords from text (removes stop words)
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
    "used", "it", "its", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "what", "which", "who", "whom", "when", "where",
    "why", "how", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "just", "also"
  ]);
  
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  );
}

/**
 * Semantic search across notes
 * Combines fuzzy search with keyword similarity for better results
 */
export function semanticSearch(
  query: string,
  notes: Note[],
  limit: number = 10
): SemanticSearchResult[] {
  // First pass: Fuse.js for fuzzy matching
  const fuse = new Fuse(notes, {
    keys: [
      { name: "title", weight: 2 },
      { name: "content", weight: 1 },
      { name: "tags", weight: 1.5 },
    ],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
  });
  
  const fuseResults = fuse.search(query);
  
  // Second pass: enhance with semantic similarity
  const results: SemanticSearchResult[] = fuseResults.map(result => {
    const note = result.item;
    const fuseScore = 1 - (result.score || 0);
    
    // Calculate semantic similarity
    const contentSimilarity = calculateSimilarity(
      query,
      `${note.title} ${note.content}`
    );
    
    // Check for tag matches
    const queryKeywords = extractKeywords(query);
    const matchingTags = note.tags.filter(tag => 
      queryKeywords.has(tag.toLowerCase()) ||
      [...queryKeywords].some(kw => tag.toLowerCase().includes(kw))
    );
    
    // Combined score
    const combinedScore = (fuseScore * 0.6) + (contentSimilarity * 0.3) + (matchingTags.length * 0.1);
    
    // Generate relevance reason
    let relevanceReason = "";
    if (note.title.toLowerCase().includes(query.toLowerCase())) {
      relevanceReason = "Title match";
    } else if (matchingTags.length > 0) {
      relevanceReason = `Tagged: ${matchingTags.map(t => `#${t}`).join(", ")}`;
    } else if (contentSimilarity > 0.3) {
      relevanceReason = "Content similarity";
    } else {
      relevanceReason = "Keyword match";
    }
    
    return {
      note,
      score: combinedScore,
      relevanceReason,
    };
  });
  
  // Add notes that might have been missed by fuzzy search but have high semantic similarity
  const fuzzyNoteIds = new Set(fuseResults.map(r => r.item.id));
  
  notes.forEach(note => {
    if (fuzzyNoteIds.has(note.id)) return;
    
    const similarity = calculateSimilarity(query, `${note.title} ${note.content}`);
    
    if (similarity > 0.2) {
      results.push({
        note,
        score: similarity,
        relevanceReason: "Semantic similarity",
      });
    }
  });
  
  // Sort by score and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find related notes based on content similarity, tags, and links
 */
export function findRelatedNotes(
  note: Note,
  allNotes: Note[],
  limit: number = 5
): RelatedNote[] {
  const results: RelatedNote[] = [];
  
  allNotes.forEach(otherNote => {
    if (otherNote.id === note.id) return;
    
    const reasons: string[] = [];
    let strength = 0;
    
    // Check for direct links
    if (note.links.includes(otherNote.title)) {
      strength += 0.4;
      reasons.push("Linked from this note");
    }
    
    if (otherNote.links.includes(note.title)) {
      strength += 0.4;
      reasons.push("Links to this note");
    }
    
    // Check for shared tags
    const sharedTags = note.tags.filter(tag => otherNote.tags.includes(tag));
    if (sharedTags.length > 0) {
      strength += 0.2 * sharedTags.length;
      reasons.push(`Shared tags: ${sharedTags.map(t => `#${t}`).join(", ")}`);
    }
    
    // Calculate content similarity
    const contentSimilarity = calculateSimilarity(note.content, otherNote.content);
    if (contentSimilarity > 0.15) {
      strength += contentSimilarity * 0.3;
      reasons.push(`Similar content (${Math.round(contentSimilarity * 100)}%)`);
    }
    
    // Check for title similarity
    const titleSimilarity = calculateSimilarity(note.title, otherNote.title);
    if (titleSimilarity > 0.3) {
      strength += titleSimilarity * 0.2;
      reasons.push("Similar title");
    }
    
    if (strength > 0.1 && reasons.length > 0) {
      results.push({
        note: otherNote,
        connectionStrength: Math.min(strength, 1),
        connectionReasons: reasons,
      });
    }
  });
  
  return results
    .sort((a, b) => b.connectionStrength - a.connectionStrength)
    .slice(0, limit);
}

/**
 * Generate a summary of a note using extractive summarization
 * Works offline without needing an LLM
 */
export function summarizeNote(note: Note): string {
  const content = note.content;
  
  // Split into sentences
  const sentences = content
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 20);
  
  if (sentences.length === 0) {
    return note.content.slice(0, 200);
  }
  
  if (sentences.length <= 3) {
    return sentences.join(" ");
  }
  
  // Score sentences based on:
  // 1. Position (first and last sentences are often important)
  // 2. Length (medium-length sentences are usually better)
  // 3. Keyword presence (sentences with important keywords)
  
  const keywords = extractKeywords(content);
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    
    // Position score
    if (index === 0) score += 0.3;
    if (index === sentences.length - 1) score += 0.2;
    
    // Length score (prefer sentences between 50-150 chars)
    const length = sentence.length;
    if (length >= 50 && length <= 150) {
      score += 0.2;
    } else if (length < 50) {
      score += 0.1;
    }
    
    // Keyword density score
    const sentenceWords = extractKeywords(sentence);
    const overlap = [...sentenceWords].filter(w => keywords.has(w)).length;
    const density = overlap / sentenceWords.size;
    score += density * 0.3;
    
    return { sentence, score };
  });
  
  // Select top sentences (up to 3)
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
  
  return topSentences.map(s => s.sentence).join(" ");
}

/**
 * Generate AI response using Ollama (if available) or fallback
 */
export async function generateAIResponse(
  prompt: string,
  context: string,
  options: {
    model?: string;
    endpoint?: string;
  } = {}
): Promise<string> {
  const { model = "llama2", endpoint = "http://localhost:11434" } = options;
  
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `You are a helpful assistant for a note-taking app called BrainVault.

Context from the user's notes:
${context}

User: ${prompt}

Provide a helpful, concise response. If the context doesn't contain relevant information, say so.`,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error("Ollama request failed");
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    // Return a helpful fallback message
    return `I couldn't connect to the AI model. Make sure Ollama is running:

1. Install Ollama: \`brew install ollama\`
2. Start it: \`ollama serve\`
3. Pull a model: \`ollama pull llama2\`

In the meantime, I can still help you with:
• Searching your notes
• Finding related notes
• Generating summaries (offline)`;
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaStatus(): Promise<{
  available: boolean;
  models: string[];
}> {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        models: data.models?.map((m: { name: string }) => m.name) || [],
      };
    }
  } catch {
    // Ollama not available
  }
  
  return { available: false, models: [] };
}
