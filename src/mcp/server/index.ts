import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools';

function parseConfigPath(argv: string[]): string {
  const flagIndex = argv.indexOf('--config');
  const configPath = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;
  if (!configPath) {
    console.error('ptah-mcp: missing required --config <path> argument.');
    process.exit(1);
  }
  return configPath;
}

async function main(): Promise<void> {
  const configPath = parseConfigPath(process.argv.slice(2));
  const server = new McpServer({ name: 'ptah', version: '0.1.0' });
  registerTools(server, configPath);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
