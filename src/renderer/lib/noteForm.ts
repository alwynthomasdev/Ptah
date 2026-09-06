import { DEFAULT_NOTEBOOK_KEY } from '@models/Notebook';

/**
 * Shape of the reactive form object bound by `NoteForm.vue`. Shared between the
 * create dialog and the note page's edit mode. `labels` is a raw comma-separated
 * string — parsing into an array happens where the form is submitted.
 */
export interface NoteFormModel {
  title: string;
  notebook: string;
  labels: string;
  body: string;
}

/**
 * Seed value for a "which notebook" dropdown: an explicit preference, else the
 * active notebook, else the default `NOTEBOOK` if it exists, else the first
 * notebook, else ''.
 */
export function defaultNotebookKey(
  preferred: string | null | undefined,
  activeKey: string | null,
  items: { key: string }[],
): string {
  return (
    preferred ??
    activeKey ??
    (items.some((n) => n.key === DEFAULT_NOTEBOOK_KEY)
      ? DEFAULT_NOTEBOOK_KEY
      : (items[0]?.key ?? ''))
  );
}
