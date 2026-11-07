import type {Config, Context} from "@netlify/functions";
import {errorResponse} from "./lib/http";
import {withTiming} from "./lib/timing";
import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {type Session, withSession} from "./lib/session";
import {
    backupFileOf,
    backupFtpConfig,
    backupOverview,
    BackupNotConfiguredError,
    BackupRunningError,
    markBackupCopied,
    runBackup,
} from "./lib/backup-store";
import {openBackupDownload} from "./lib/backup-ftp";

// Das Datenbank-Backup, nur für Administratoren (endpoint_roles, features/use-case/database-backup.md)

const gone = (message: string) => Response.json({error: message}, {status: 410});

async function download(id: string): Promise<Response> {
    const file = await backupFileOf(id);
    if (!file) return notFound();
    const body = await openBackupDownload(backupFtpConfig(), file.fileName);
    if (!body) return gone("Die Datei liegt nicht mehr auf dem Backup-Speicher");
    return new Response(body, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${file.fileName}"`,
            "Cache-Control": "no-store",
        },
    });
}

const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        if (!isRoutePath(req.url, config.path)) return notFound();

        const fileId = pathParams(req.url, "/api/backups/:id/file").id;
        if (fileId !== undefined) return req.method === "GET" ? await download(IdSchema.parse(fileId)) : notAllowed();

        const copiedId = pathParams(req.url, "/api/backups/:id/copied").id;
        if (copiedId !== undefined) {
            if (req.method !== "POST") return notAllowed();
            return (await markBackupCopied(IdSchema.parse(copiedId))) ? new Response(null, {status: 204}) : notFound();
        }

        if (req.method === "GET") return Response.json(await backupOverview());
        if (req.method === "POST") return Response.json(await runBackup("manual", session.user.id), {status: 201});
        return notAllowed();
    } catch (err) {
        if (err instanceof BackupRunningError) return Response.json({error: err.message}, {status: 409});
        if (err instanceof BackupNotConfiguredError) return Response.json({error: err.message}, {status: 503});
        return errorResponse(err);
    }
};

const notAllowed = () => new Response(null, {status: 405});

export default withTiming("backups", withSession(handler));

// Netlify liest config statisch, deshalb Literale statt Konstanten
export const config: Config = {path: ["/api/backups", "/api/backups/:id/file", "/api/backups/:id/copied"]};
