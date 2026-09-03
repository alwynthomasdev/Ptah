import yaml from 'js-yaml';

/**
 * Minimal frontmatter reader/writer. A frontmatter file starts with a line that
 * is exactly `---`, followed by YAML, followed by a line that is exactly `---`,
 * then the Markdown body. Anything else is treated as a body with empty
 * frontmatter.
 */

export interface ParsedMarkdown {
  data: Record<string, unknown>;
  body: string;
}

const FM_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const BOM = String.fromCharCode(0xfeff);

export function parseMarkdown(raw: string): ParsedMarkdown {
  const text = raw.startsWith(BOM) ? raw.slice(1) : raw;
  const m = FM_PATTERN.exec(text);
  if (!m) {
    return { data: {}, body: text };
  }
  const parsed = yaml.load(m[1]);
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return { data, body: m[2] ?? '' };
}

export function stringifyMarkdown(data: Record<string, unknown>, body: string): string {
  const frontmatter = yaml.dump(data, { lineWidth: -1, noRefs: true, sortKeys: false }).trimEnd();
  const trimmedBody = body.replace(/^\r?\n+/, '').trimEnd();
  return `---\n${frontmatter}\n---\n\n${trimmedBody}\n`;
}
