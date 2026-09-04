/**
 * Renderer-side Markdown → HTML. A single configured `markdown-it` instance:
 * raw HTML is disabled (so `v-html` of the output is safe without a sanitizer),
 * fenced code is highlighted with highlight.js, headings get ids, and relative
 * image paths are rewritten to `ptah-media://` URLs resolved against the
 * ticket's attachments folder by the main process.
 */
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
// `lib/common` registers ~35 mainstream languages instead of all ~190, which
// keeps the renderer bundle far smaller.
import hljs from 'highlight.js/lib/common';

export interface MarkdownContext {
  /** Project key of the ticket the description belongs to. */
  project?: string;
  /** Ticket id, e.g. `PTAH-12`. */
  ticketId?: string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  highlight(str, lang): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const out = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        return `<pre class="hljs"><code>${out}</code></pre>`;
      } catch {
        /* fall through to plain escaping */
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
  },
});

md.use(anchor, { permalink: false });

/** True when `src` already carries a URI scheme or is protocol-/root-relative. */
function isAbsoluteRef(src: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//') || src.startsWith('/');
}

function toMediaUrl(src: string, ctx: MarkdownContext): string {
  if (!ctx.project || !ctx.ticketId || isAbsoluteRef(src)) return src;
  // markdown-it has already percent-encoded `src`; just drop any leading `./`
  // and mount it under the ticket's attachments folder.
  const rel = src.replace(/^\.?\//, '');
  return `ptah-media://media/${encodeURIComponent(ctx.project)}/${encodeURIComponent(ctx.ticketId)}/${rel}`;
}

const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const i = token.attrIndex('src');
  if (i >= 0 && token.attrs) {
    token.attrs[i][1] = toMediaUrl(token.attrs[i][1], (env ?? {}) as MarkdownContext);
  }
  return defaultImage
    ? defaultImage(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

export function renderMarkdown(source: string, ctx: MarkdownContext = {}): string {
  return md.render(source ?? '', { ...ctx });
}
