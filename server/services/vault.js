import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let vaultPath;

export function initVault() {
  vaultPath = process.env.VAULT_PATH || path.join(__dirname, '../vault');

  // Create vault directory structure
  const directories = [
    vaultPath,
    path.join(vaultPath, 'notes'),
    path.join(vaultPath, 'daily'),
    path.join(vaultPath, 'attachments'),
    path.join(vaultPath, 'templates'),
    path.join(vaultPath, '.trash')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create default templates
  createDefaultTemplates();

  return vaultPath;
}

function createDefaultTemplates() {
  const templatesDir = path.join(vaultPath, 'templates');

  const dailyTemplate = `---
id: {{id}}
title: {{title}}
date: {{date}}
tags: ["daily"]
---

# {{date}}

## 📝 Tasks
- [ ]

## 💭 Notes


## 🎯 Goals for Today


## 📚 Reading List


## 💡 Ideas


## 🙏 Gratitude
`;

  const meetingTemplate = `---
id: {{id}}
title: {{title}}
date: {{date}}
type: meeting
attendees: []
tags: ["meeting"]
---

# {{title}}

**Date:** {{date}}
**Attendees:**
**Location:**

## 📋 Agenda


## 🗒️ Notes


## 📌 Action Items
- [ ]

## ❓ Questions


## 📎 Resources
`;

  const projectTemplate = `---
id: {{id}}
title: {{title}}
created: {{date}}
status: planning
tags: ["project"]
---

# {{title}}

## 🎯 Overview


## 📊 Goals
1.
2.
3.

## 📅 Timeline


## 👥 Team


## ✅ Tasks
- [ ]

## 📚 Resources


## 📝 Notes
`;

  const templates = [
    { name: 'daily.md', content: dailyTemplate },
    { name: 'meeting.md', content: meetingTemplate },
    { name: 'project.md', content: projectTemplate }
  ];

  templates.forEach(template => {
    const templatePath = path.join(templatesDir, template.name);
    if (!fs.existsSync(templatePath)) {
      fs.writeFileSync(templatePath, template.content);
    }
  });
}

export function getVaultPath() {
  return vaultPath;
}

// File operations
export function saveNoteToFile(note) {
  const filename = slugify(note.title) + '.md';
  const filepath = path.join(vaultPath, 'notes', filename);

  const frontmatter = {
    id: note.id,
    title: note.title,
    created: note.createdAt,
    updated: note.updatedAt,
    tags: note.tags || [],
    links: note.links || []
  };

  // Filter out undefined values
  Object.keys(frontmatter).forEach(key => {
    if (frontmatter[key] === undefined) {
      delete frontmatter[key];
    }
  });

  const content = matter.stringify(note.content || '', frontmatter);
  fs.writeFileSync(filepath, content);

  return filepath;
}

export function loadNoteFromFile(filepath) {
  if (!fs.existsSync(filepath)) {
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const { data, content: body } = matter(content);

  return {
    id: data.id || uuidv4(),
    title: data.title || path.basename(filepath, '.md'),
    content: body,
    plainContent: stripMarkdown(body),
    createdAt: data.created || fs.statSync(filepath).birthtime,
    updatedAt: data.updated || fs.statSync(filepath).mtime,
    tags: data.tags || [],
    links: extractWikiLinks(body),
    backlinks: data.backlinks || [],
    attachments: data.attachments || [],
    metadata: data,
    path: filepath
  };
}

export function deleteNoteFile(note) {
  if (!note.path) return false;

  const trashDir = path.join(vaultPath, '.trash');
  const timestamp = Date.now();
  const trashPath = path.join(trashDir, `${timestamp}_${path.basename(note.path)}`);

  try {
    // Move to trash instead of permanent delete
    fs.renameSync(note.path, trashPath);
    return true;
  } catch (error) {
    console.error('Error moving note to trash:', error);
    return false;
  }
}

export function getAllNotesFromVault() {
  const notesDir = path.join(vaultPath, 'notes');
  const dailyDir = path.join(vaultPath, 'daily');
  const notes = [];

  // Load regular notes
  if (fs.existsSync(notesDir)) {
    const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const filepath = path.join(notesDir, file);
      const note = loadNoteFromFile(filepath);
      if (note) notes.push(note);
    });
  }

  // Load daily notes
  if (fs.existsSync(dailyDir)) {
    const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const filepath = path.join(dailyDir, file);
      const note = loadNoteFromFile(filepath);
      if (note) {
        note.type = 'daily';
        notes.push(note);
      }
    });
  }

  return notes;
}

// Daily notes
export function createDailyNote(date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];
  const title = `Daily Note - ${dateStr}`;
  const filename = `${dateStr}.md`;
  const filepath = path.join(vaultPath, 'daily', filename);

  if (fs.existsSync(filepath)) {
    return loadNoteFromFile(filepath);
  }

  const templatePath = path.join(vaultPath, 'templates', 'daily.md');
  let template = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf-8')
    : getDefaultDailyTemplate();

  // Replace variables
  template = template
    .replace(/{{id}}/g, uuidv4())
    .replace(/{{title}}/g, title)
    .replace(/{{date}}/g, dateStr);

  fs.writeFileSync(filepath, template);
  return loadNoteFromFile(filepath);
}

function getDefaultDailyTemplate() {
  return `---
id: {{id}}
title: {{title}}
date: {{date}}
tags: ["daily"]
---

# {{date}}

## 📝 Tasks
- [ ]

## 💭 Notes

## 🎯 Goals for Today

## 📚 Reading List

## 💡 Ideas

## 🙏 Gratitude
`;
}

// Attachment handling
export function saveAttachment(file, noteId) {
  const attachmentsDir = path.join(vaultPath, 'attachments', noteId);

  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  const filename = `${Date.now()}_${file.originalname}`;
  const filepath = path.join(attachmentsDir, filename);

  fs.writeFileSync(filepath, file.buffer);

  return {
    id: uuidv4(),
    noteId,
    filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: filepath
  };
}

export function deleteAttachmentFile(attachmentPath) {
  try {
    if (fs.existsSync(attachmentPath)) {
      fs.unlinkSync(attachmentPath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting attachment:', error);
  }
  return false;
}

// Template operations
export function getTemplates() {
  const templatesDir = path.join(vaultPath, 'templates');
  const templates = [];

  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const filepath = path.join(templatesDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      const { data, content: body } = matter(content);

      templates.push({
        id: file,
        name: file.replace('.md', ''),
        content: body,
        metadata: data
      });
    });
  }

  return templates;
}

export function saveTemplate(name, content) {
  const templatesDir = path.join(vaultPath, 'templates');
  const filepath = path.join(templatesDir, `${name}.md`);
  fs.writeFileSync(filepath, content);
  return filepath;
}

// Utility functions
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function stripMarkdown(content) {
  return content
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^\s*[-*+]\s/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s/gm, '') // Remove numbered lists
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Remove wiki links
    .replace(/#(\w+)/g, '$1') // Remove tags
    .trim();
}

function extractWikiLinks(content) {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return [...new Set(links)]; // Remove duplicates
}

export function extractTags(content) {
  const regex = /#(\w+)/g;
  const tags = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return [...new Set(tags)]; // Remove duplicates
}

// Export all functions
export default {
  initVault,
  getVaultPath,
  saveNoteToFile,
  loadNoteFromFile,
  deleteNoteFile,
  getAllNotesFromVault,
  createDailyNote,
  saveAttachment,
  deleteAttachmentFile,
  getTemplates,
  saveTemplate,
  extractTags,
  extractWikiLinks: extractWikiLinks
};