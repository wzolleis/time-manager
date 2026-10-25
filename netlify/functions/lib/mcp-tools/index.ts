// netlify/functions/lib/mcp-tools/index.ts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {SessionUser} from "../session";
import {registerOvertimeTools} from "./overtime";
import {registerReportTools} from "./reports";
import {registerTimeEntryTools} from "./time-entries";
import {registerUserSettingTools} from "./user-settings";

/** Meldet alle Tools am Server an. Jedes Tool arbeitet nur mit den Daten von user (Regel 3). */
export function registerTools(server: McpServer, user: SessionUser): void {
    registerTimeEntryTools(server, user);
    registerReportTools(server, user);
    registerOvertimeTools(server, user);
    registerUserSettingTools(server, user);
}
