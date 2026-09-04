import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppContext } from '@core/AppContext';
import type { Project } from '@models/Project';
import { PRIORITIES, STATUSES, type NewTicketInput, type Ticket, type TicketPatch } from '@models/Ticket';
import { getContext } from './context';

/**
 * Trimmed ticket shape for `ptah_list_tickets` — a full `Ticket[]` (bodies,
 * urls, attachments) risks blowing context on a large project; callers that
 * need the rest use `ptah_get_ticket`.
 */
export interface TicketSummary {
  id: string;
  title: string;
  project: string;
  status: Ticket['status'];
  priority: Ticket['priority'];
  due: string | null;
  labels: string[];
}

function toSummary(t: Ticket): TicketSummary {
  return {
    id: t.id,
    title: t.title,
    project: t.project,
    status: t.status,
    priority: t.priority,
    due: t.due,
    labels: t.labels,
  };
}

export async function listTickets(
  ctx: AppContext,
  args: { projectKey?: string },
): Promise<TicketSummary[]> {
  const tickets = await ctx.tickets.list(args.projectKey);
  return tickets.map(toSummary);
}

export async function getTicket(ctx: AppContext, args: { id: string }): Promise<Ticket> {
  return ctx.tickets.get(args.id);
}

export async function createTicket(ctx: AppContext, args: NewTicketInput): Promise<Ticket> {
  return ctx.tickets.create(args);
}

export async function updateTicket(
  ctx: AppContext,
  args: { id: string } & TicketPatch,
): Promise<Ticket> {
  const { id, ...patch } = args;
  return ctx.tickets.update(id, patch);
}

export async function deleteTicket(ctx: AppContext, args: { id: string }): Promise<{ id: string }> {
  await ctx.tickets.delete(args.id);
  return { id: args.id };
}

export async function listProjects(ctx: AppContext): Promise<Project[]> {
  return ctx.projects.list();
}

/**
 * One error boundary shared by every registered tool — the MCP-transport
 * equivalent of `tryResult`/`Result<T>` at the IPC boundary. A thrown error
 * (from `TicketService`/`ProjectService`/`createTicket`/`applyPatch`
 * validation) surfaces as `isError: true` text rather than crashing the
 * server or the client's tool call.
 */
function toolHandler<Args>(fn: (args: Args) => Promise<unknown>) {
  return async (args: Args) => {
    try {
      const result = await fn(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { content: [{ type: 'text' as const, text: message }], isError: true };
    }
  };
}

const statusSchema = z.enum(STATUSES);
const prioritySchema = z.enum(PRIORITIES);
/** Three-state on update: absent = don't change, `null` = clear, string = set. */
const dueSchema = z.union([z.string(), z.null()]);

export function registerTools(server: McpServer, configPath: string): void {
  const withContext = <Args, T>(fn: (ctx: AppContext, args: Args) => Promise<T>) =>
    toolHandler<Args>(async (args) => fn(await getContext(configPath), args));

  server.registerTool(
    'ptah_list_tickets',
    {
      title: 'List tickets',
      description:
        'List tickets, optionally scoped to one project. Returns a trimmed summary of each ticket.',
      inputSchema: {
        projectKey: z.string().optional().describe('Project key to scope the list to, e.g. "PTAH".'),
      },
    },
    withContext(listTickets),
  );

  server.registerTool(
    'ptah_get_ticket',
    {
      title: 'Get ticket',
      description: 'Get the full record for one ticket by id, e.g. "PTAH-12".',
      inputSchema: {
        id: z.string(),
      },
    },
    withContext(getTicket),
  );

  server.registerTool(
    'ptah_create_ticket',
    {
      title: 'Create ticket',
      description: 'Create a new ticket in an existing project.',
      inputSchema: {
        title: z.string(),
        project: z.string().describe('Project key the ticket belongs to, e.g. "PTAH".'),
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        due: z.string().optional().describe('ISO-8601 date/timestamp.'),
        labels: z.array(z.string()).optional(),
        urls: z.array(z.string()).optional(),
        description: z.string().optional().describe('Markdown body.'),
      },
    },
    withContext(createTicket),
  );

  server.registerTool(
    'ptah_update_ticket',
    {
      title: 'Update ticket',
      description:
        'Patch fields on an existing ticket. Omit a field to leave it unchanged; pass "due": null to clear the due date.',
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        due: dueSchema.optional(),
        labels: z.array(z.string()).optional(),
        urls: z.array(z.string()).optional(),
        description: z.string().optional(),
      },
    },
    withContext(updateTicket),
  );

  server.registerTool(
    'ptah_delete_ticket',
    {
      title: 'Delete ticket',
      description: 'Soft-delete a ticket (moves it to the recycle bin).',
      inputSchema: {
        id: z.string(),
      },
    },
    withContext(deleteTicket),
  );

  server.registerTool(
    'ptah_list_projects',
    {
      title: 'List projects',
      description: 'List every project, so a valid project key can be chosen when creating a ticket.',
      inputSchema: {},
    },
    withContext((ctx: AppContext) => listProjects(ctx)),
  );
}
