/**
 * A Ticket is the unit of work. Persisted as one Markdown file with YAML
 * frontmatter at `<dataDir>/projects/<project>/tickets/<id>.md`; the file body
 * is the detailed Markdown description.
 */

export const STATUSES = ['backlog', 'scheduled', 'wip', 'paused', 'done', 'archive'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  scheduled: 'Scheduled',
  wip: 'WIP',
  paused: 'Paused',
  done: 'Done',
  archive: 'Archive',
};

export const PRIORITIES = ['lowest', 'low', 'medium', 'high', 'highest'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Higher number == higher priority. Used for sorting. */
export const PRIORITY_RANK: Record<Priority, number> = {
  lowest: 0,
  low: 1,
  medium: 2,
  high: 3,
  highest: 4,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  lowest: 'Lowest',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  highest: 'Highest',
};

export interface Ticket {
  /** `<PROJECTKEY>-<n>`, e.g. "PTAH-12". Unique across the store. */
  id: string;
  title: string;
  /** Project key this ticket belongs to. */
  project: string;
  status: Status;
  priority: Priority;
  /** ISO-8601 timestamp. */
  created: string;
  /** ISO-8601 date/timestamp, or null when no due date is set. */
  due: string | null;
  labels: string[];
  /** Reference links attached to the ticket, order-preserved as curated by the user. */
  urls: string[];
  /** Markdown body. */
  description: string;
  /**
   * File names (not paths) of attachments living in
   * `<project>/attachments/<id>/`. Populated by the storage layer on read.
   */
  attachments: string[];
  /** Set only while the ticket sits in the recycle bin. */
  deletedAt?: string | null;
}

/** Fields the UI supplies when creating a ticket. */
export interface NewTicketInput {
  title: string;
  project: string;
  status?: Status;
  priority?: Priority;
  due?: string | null;
  labels?: string[];
  urls?: string[];
  description?: string;
}

/** Mutable fields on an existing ticket. */
export type TicketPatch = Partial<
  Pick<Ticket, 'title' | 'status' | 'priority' | 'due' | 'labels' | 'urls' | 'description'>
>;

export function isStatus(v: unknown): v is Status {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'string' && (PRIORITIES as readonly string[]).includes(v);
}

/**
 * Build a Ticket from user input plus an already-allocated id.
 * Validation only; persistence is the storage layer's job.
 */
export function createTicket(id: string, input: NewTicketInput, now: Date = new Date()): Ticket {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Ticket title must not be empty.');
  }
  const status = input.status ?? 'backlog';
  const priority = input.priority ?? 'medium';
  if (!isStatus(status)) throw new Error(`Unknown status "${status}".`);
  if (!isPriority(priority)) throw new Error(`Unknown priority "${priority}".`);

  return {
    id,
    title,
    project: input.project,
    status,
    priority,
    created: now.toISOString(),
    due: input.due ?? null,
    labels: normalizeLabels(input.labels ?? []),
    urls: normalizeUrls(input.urls ?? []),
    description: input.description ?? '',
    attachments: [],
    deletedAt: null,
  };
}

/** Apply a patch, returning a new Ticket. Validates enum fields. */
export function applyPatch(ticket: Ticket, patch: TicketPatch): Ticket {
  const next: Ticket = { ...ticket };
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) throw new Error('Ticket title must not be empty.');
    next.title = t;
  }
  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) throw new Error(`Unknown status "${patch.status}".`);
    next.status = patch.status;
  }
  if (patch.priority !== undefined) {
    if (!isPriority(patch.priority)) throw new Error(`Unknown priority "${patch.priority}".`);
    next.priority = patch.priority;
  }
  if (patch.due !== undefined) next.due = patch.due;
  if (patch.labels !== undefined) next.labels = normalizeLabels(patch.labels);
  if (patch.urls !== undefined) next.urls = normalizeUrls(patch.urls);
  if (patch.description !== undefined) next.description = patch.description;
  return next;
}

export function normalizeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const l = raw.trim();
    if (l && !seen.has(l.toLowerCase())) {
      seen.add(l.toLowerCase());
      out.push(l);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * Trim, drop empty entries, and dedupe by exact (case-sensitive) match.
 * Unlike `normalizeLabels`, order is preserved: a URL list is an ordered set
 * of references the user is curating, not an unordered tag set.
 */
export function normalizeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw.trim();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
