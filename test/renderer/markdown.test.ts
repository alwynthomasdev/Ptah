import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@renderer/lib/markdown';

describe('renderMarkdown', () => {
  it('renders headings with slug ids and lists', () => {
    const html = renderMarkdown('# Hello World\n\n- one\n- two');
    expect(html).toContain('id="hello-world"');
    expect(html).toMatch(/<h1[^>]*>Hello World<\/h1>/);
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  it('renders bold text and links', () => {
    const html = renderMarkdown('**bold** and [a link](https://example.com)');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://example.com"');
  });

  it('highlights fenced code blocks', () => {
    const html = renderMarkdown('```ts\nconst x: number = 1;\n```');
    expect(html).toContain('<pre class="hljs">');
    expect(html).toContain('hljs-keyword');
  });

  it('rewrites a relative image src to a ptah-media URL', () => {
    const html = renderMarkdown('![d](diagram.png)', { project: 'PTAH', ticketId: 'PTAH-1' });
    expect(html).toContain('src="ptah-media://media/PTAH/PTAH-1/diagram.png"');
  });

  it('rewrites nested relative image paths and strips a leading "./"', () => {
    expect(
      renderMarkdown('![d](assets/diagram.png)', { project: 'PTAH', ticketId: 'PTAH-1' }),
    ).toContain('src="ptah-media://media/PTAH/PTAH-1/assets/diagram.png"');
    expect(
      renderMarkdown('![d](./diagram.png)', { project: 'PTAH', ticketId: 'PTAH-1' }),
    ).toContain('src="ptah-media://media/PTAH/PTAH-1/diagram.png"');
  });

  it('leaves absolute and data URIs untouched', () => {
    const abs = renderMarkdown('![x](https://e.com/a.png)', { project: 'PTAH', ticketId: 'PTAH-1' });
    expect(abs).toContain('src="https://e.com/a.png"');
    const data = renderMarkdown('![x](data:image/png;base64,AAAA)', {
      project: 'PTAH',
      ticketId: 'PTAH-1',
    });
    expect(data).toContain('src="data:image/png;base64,AAAA"');
  });

  it('does not rewrite relative images without a ticket context', () => {
    const html = renderMarkdown('![d](diagram.png)');
    expect(html).toContain('src="diagram.png"');
  });

  it('escapes raw HTML in the source (html: false)', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nafter');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
