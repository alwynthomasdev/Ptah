// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe, not something fixable
// from this repo's config — see tester agent notes). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { Project } from '@models/Project';

function makeProject(key: string, name: string): Project {
  return { key, name, counter: 0, created: new Date().toISOString() };
}

const ptahMock = {
  projects: {
    list: vi.fn(async () => ({ ok: true as const, value: [] as Project[] })),
  },
};
// `src/renderer/api.ts` reads `window.ptah` at module-load time, so it must be
// in place before any renderer module (store/component) is imported.
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useProjectsStore } = await import('@renderer/stores/projects');

beforeEach(() => {
  setActivePinia(createPinia());
  ptahMock.projects.list.mockClear();
});

describe('projects store — orderedItems', () => {
  it('pins the default (TODO) project first, preserving the relative order of the rest', () => {
    const store = useProjectsStore();
    store.items = [
      makeProject('ACME', 'Acme'),
      makeProject('WORK', 'Work'),
      makeProject('TODO', 'To Do'),
      makeProject('ZETA', 'Zeta'),
    ];

    expect(store.orderedItems.map((p) => p.key)).toEqual(['TODO', 'ACME', 'WORK', 'ZETA']);
  });

  it('returns items unchanged when the default project is missing', () => {
    const store = useProjectsStore();
    store.items = [makeProject('ACME', 'Acme'), makeProject('WORK', 'Work')];

    expect(store.orderedItems).toEqual(store.items);
  });

  it('returns items unchanged (equivalently ordered) when the default project is already first', () => {
    const store = useProjectsStore();
    store.items = [makeProject('TODO', 'To Do'), makeProject('ACME', 'Acme')];

    expect(store.orderedItems.map((p) => p.key)).toEqual(['TODO', 'ACME']);
  });
});
