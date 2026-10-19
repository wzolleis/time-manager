// netlify/functions/lib/mcp-tools/index.ts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {SessionUser} from "../session";

/** Meldet alle Tools am Server an. Jedes Tool arbeitet nur mit den Daten von user (Regel 3). */
export function registerTools(_server: McpServer, _user: SessionUser): void {}
