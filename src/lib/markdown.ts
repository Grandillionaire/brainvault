/**
 * Markdown <-> editor document conversion
 *
 * BrainVault stores notes as Markdown (that is the whole point of the file
 * format). TipTap/ProseMirror only understands HTML, so every note has to be
 * converted on the way into the editor and converted back on the way out.
 * Feeding raw Markdown straight to ProseMirror flattens the note into a single
 * paragraph of literal Markdown source, which is not recoverable.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

/** ProseMirror document node, as produced by `editor.getJSON()`. */
export interface EditorNode {
  type?: string;
  attrs?: Record<string, any>;
  content?: EditorNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeStringify);

/**
 * Convert a Markdown string to the HTML ProseMirror expects.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  return String(processor.processSync(markdown));
}

function serializeInline(nodes: EditorNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "\n";
      if (node.type !== "text" || node.text === undefined) {
        // Unknown inline node - fall back to its text content
        return serializeInline(node.content);
      }

      const marks = node.marks || [];
      // `code` wins over the other marks: markdown cannot nest inside it.
      if (marks.some((m) => m.type === "code")) {
        return `\`${node.text}\``;
      }

      // Deliberately not escaping: notes carry [[wiki links]], #tags and
      // snake_case identifiers that must survive a round trip verbatim.
      let text = node.text;
      for (const mark of marks) {
        switch (mark.type) {
          case "bold":
            text = `**${text}**`;
            break;
          case "italic":
            text = `*${text}*`;
            break;
          case "strike":
            text = `~~${text}~~`;
            break;
          case "link":
            text = `[${text}](${mark.attrs?.href ?? ""})`;
            break;
        }
      }
      return text;
    })
    .join("");
}

function serializeList(node: EditorNode, indent: string, ordered: boolean): string {
  const items = node.content || [];
  return items
    .map((item, index) => {
      const marker = ordered ? `${(node.attrs?.start ?? 1) + index}. ` : "- ";
      const checkbox =
        item.type === "taskItem" ? (item.attrs?.checked ? "[x] " : "[ ] ") : "";
      const body = serializeBlocks(item.content || [], indent + " ".repeat(marker.length));
      // The first line carries the marker, following lines stay indented.
      const lines = body.split("\n");
      const [first, ...rest] = lines;
      return [`${indent}${marker}${checkbox}${first.trimStart()}`, ...rest].join("\n");
    })
    .join("\n");
}

function serializeBlocks(nodes: EditorNode[], indent = ""): string {
  const blocks: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(6, Math.max(1, node.attrs?.level ?? 1));
        blocks.push(`${indent}${"#".repeat(level)} ${serializeInline(node.content)}`);
        break;
      }
      case "paragraph":
        blocks.push(`${indent}${serializeInline(node.content)}`);
        break;
      case "bulletList":
        blocks.push(serializeList(node, indent, false));
        break;
      case "orderedList":
        blocks.push(serializeList(node, indent, true));
        break;
      case "taskList":
        blocks.push(serializeList(node, indent, false));
        break;
      case "blockquote":
        blocks.push(
          serializeBlocks(node.content || [], indent)
            .split("\n")
            .map((line) => `${indent}> ${line.slice(indent.length)}`)
            .join("\n")
        );
        break;
      case "codeBlock": {
        const language = node.attrs?.language || "";
        const code = (node.content || []).map((c) => c.text ?? "").join("");
        blocks.push(`${indent}\`\`\`${language}\n${code}\n${indent}\`\`\``);
        break;
      }
      case "horizontalRule":
        blocks.push(`${indent}---`);
        break;
      default:
        if (node.content) {
          blocks.push(serializeBlocks(node.content, indent));
        } else if (node.text) {
          blocks.push(`${indent}${node.text}`);
        }
    }
  }

  return blocks.join("\n\n");
}

/**
 * Convert a ProseMirror document (`editor.getJSON()`) back to Markdown.
 */
export function editorDocToMarkdown(doc: EditorNode): string {
  if (!doc || !doc.content) return "";
  return serializeBlocks(doc.content).replace(/\n{3,}/g, "\n\n").trim();
}
