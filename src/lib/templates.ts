/**
 * Note Templates for BrainVault
 */

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  content: string;
  tags: string[];
}

export const defaultTemplates: NoteTemplate[] = [
  {
    id: "meeting",
    name: "Meeting Notes",
    description: "Template for capturing meeting notes and action items",
    icon: "👥",
    content: `# Meeting: {{title}}

**Date:** {{date}}
**Attendees:** 

---

## Agenda

1. 

## Discussion Notes



## Action Items

- [ ] 
- [ ] 
- [ ] 

## Decisions Made



## Next Steps



---

*Related Notes:* 
`,
    tags: ["meeting", "notes"],
  },
  {
    id: "project",
    name: "Project",
    description: "Template for tracking project progress and goals",
    icon: "📋",
    content: `# Project: {{title}}

**Status:** 🟡 In Progress
**Start Date:** {{date}}
**Target Date:** 

---

## Overview

Brief description of the project...

## Goals

- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 1   |             | ⬜     |
| Phase 2   |             | ⬜     |
| Launch    |             | ⬜     |

## Resources

- 

## Progress Log

### {{date}}
- Initial project setup

---

*Tags:* #project
`,
    tags: ["project"],
  },
  {
    id: "journal",
    name: "Journal Entry",
    description: "Template for daily journaling and reflection",
    icon: "📔",
    content: `# Journal - {{date}}

## How am I feeling today?

**Mood:** 

**Energy Level:** ⭐⭐⭐☆☆

---

## Morning Intentions

What do I want to accomplish today?

1. 
2. 
3. 

## Gratitude

Three things I'm grateful for:

1. 
2. 
3. 

## Reflections



## Evening Review

**Wins Today:**
- 

**Challenges:**
- 

**What I Learned:**
- 

---

*Tags:* #journal #{{date}}
`,
    tags: ["journal", "daily"],
  },
];

/**
 * Apply template variables
 */
export function applyTemplate(template: NoteTemplate, customTitle?: string): { title: string; content: string; tags: string[] } {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  
  const title = customTitle || template.name;
  
  let content = template.content
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{date\}\}/g, `${dateStr} ${dayName}`)
    .replace(/\{\{time\}\}/g, now.toLocaleTimeString())
    .replace(/\{\{year\}\}/g, String(now.getFullYear()))
    .replace(/\{\{month\}\}/g, String(now.getMonth() + 1).padStart(2, "0"));

  return {
    title,
    content,
    tags: template.tags,
  };
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): NoteTemplate | undefined {
  return defaultTemplates.find(t => t.id === templateId);
}

/**
 * Create daily note title
 */
export function getDailyNoteTitle(date: Date = new Date()): string {
  const dateStr = date.toISOString().split("T")[0];
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  return `${dateStr} ${dayName}`;
}

/**
 * Create daily note content
 */
export function getDailyNoteContent(date: Date = new Date()): string {
  const title = getDailyNoteTitle(date);
  
  return `# ${title}

## Tasks

- [ ] 

## Notes



## Links

- 

---

*Created with Daily Notes*
`;
}
