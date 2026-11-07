// netlify/functions/lib/backup-ftp.ts
// Der Backup-Speicher per FTPS: hochladen, aufräumen, herunterladen (features/use-case/database-backup.md).
// Immer TLS mit normaler Prüfung des Zertifikats, nie unverschlüsseltes FTP. Lokal vertraut npm run dev:backup dem
// Zertifikat des Containers über NODE_EXTRA_CA_CERTS, nicht über eine Ausnahme im Code.
import {PassThrough, Readable} from "node:stream";
import {Client} from "basic-ftp";
import {backupsToDelete} from "./backup-rotation";

export type FtpConfig = {host: string; port: number; user: string; password: string};

const TIMEOUT_MS = 15_000;

async function connect(config: FtpConfig): Promise<Client> {
    const client = new Client(TIMEOUT_MS);
    try {
        // TLS 1.2: mit TLS 1.3 brach lokal (pure-ftpd) jede vierte Datenverbindung beim Handshake ab, mit 1.2 keine
        await client.access({...config, secure: true, secureOptions: {maxVersion: "TLSv1.2"}});
        return client;
    } catch (err) {
        client.close();
        throw err;
    }
}

/** Öffnet eine Verbindung, führt fn aus und schließt sie wieder */
export async function withFtp<T>(config: FtpConfig, fn: (client: Client) => Promise<T>): Promise<T> {
    const client = await connect(config);
    try {
        return await fn(client);
    } finally {
        client.close();
    }
}

/** Lädt erst als .tmp hoch und benennt dann um: ein abgebrochener Upload sieht nie wie ein fertiges Backup aus */
export async function uploadBackup(client: Client, name: string, data: Uint8Array): Promise<void> {
    const tmp = `${name}.tmp`;
    await client.uploadFrom(Readable.from(Buffer.from(data)), tmp);
    await client.rename(tmp, name);
}

/** Löscht die alten Backups nach backupsToDelete und liefert ihre Namen */
export async function rotateBackups(client: Client): Promise<string[]> {
    const names = (await client.list()).filter((f) => f.isFile).map((f) => f.name);
    const obsolete = backupsToDelete(names);
    for (const name of obsolete) await client.remove(name);
    return obsolete;
}

/**
 * Die Datei als Stream, null wenn sie nicht mehr auf dem Speicher liegt. Bricht die Übertragung ab, endet der
 * Stream trotzdem (basic-ftp beendet das Ziel immer), der Aufrufer vergleicht deshalb die Größe.
 */
export async function openBackupDownload(config: FtpConfig, name: string): Promise<ReadableStream<Uint8Array> | null> {
    const client = await connect(config);
    try {
        const files = await client.list();
        if (!files.some((f) => f.isFile && f.name === name)) {
            client.close();
            return null;
        }
    } catch (err) {
        client.close();
        throw err;
    }

    const stream = new PassThrough();
    client
        .downloadTo(stream, name)
        .catch((err: unknown) => {
            console.error("Download des Backups abgebrochen", err);
            stream.destroy(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => client.close());
    return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}
