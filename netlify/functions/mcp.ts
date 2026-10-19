// netlify/functions/mcp.ts
// MCP-Server für Agents (features/boundaries/mcp-enable.md). Zustandslos: pro Request ein neuer Server
// mit dem User des Tokens, Antworten als JSON statt SSE, ohne Session-ID.
import type {Config, Context} from "@netlify/functions";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {type TokenSession, withToken} from "./lib/api-token";
import {withTiming} from "./lib/timing";
import {registerTools} from "./lib/mcp-tools";

const handler = async (req: Request, _context: Context, {user}: TokenSession) => {
    // Ohne Session gibt es keinen Stream für GET und nichts zu beenden für DELETE
    if (req.method !== "POST") return new Response(null, {status: 405, headers: {Allow: "POST"}});

    const server = new McpServer({name: "time-manager", version: "1.0.0"});
    registerTools(server, user);
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
    });
    try {
        await server.connect(transport);
        return await transport.handleRequest(req);
    } catch (err) {
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    } finally {
        await server.close();
    }
};

export default withTiming("mcp", withToken(handler));

export const config: Config = {path: "/api/mcp"};
