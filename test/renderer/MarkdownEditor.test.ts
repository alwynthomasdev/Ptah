// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe, not something fixable
// from this repo's config — see tester agent notes). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownEditor from '@renderer/components/MarkdownEditor.vue';

describe('MarkdownEditor', () => {
  it('shows the textarea in Write mode with the current value', () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: '# hi' } });
    const textarea = wrapper.get('textarea');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('# hi');
    expect(wrapper.find('.prose').exists()).toBe(false);
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: '' } });
    await wrapper.get('textarea').setValue('hello **world**');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['hello **world**']);
  });

  it('renders the value through MarkdownView when Preview is selected', async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: '# Heading' } });
    const [, previewBtn] = wrapper.findAll('.md-tabs button');
    await previewBtn.trigger('click');
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.get('.prose').html()).toContain('<h1');
    expect(wrapper.get('.prose').text()).toContain('Heading');
  });

  it('shows a placeholder in Preview when empty', async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: '   ' } });
    const [, previewBtn] = wrapper.findAll('.md-tabs button');
    await previewBtn.trigger('click');
    expect(wrapper.get('.md-preview').text()).toContain('Nothing to preview');
  });
});
