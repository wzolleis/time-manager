// netlify/functions/lib/db-errors.ts
export function hasDbCode(err: unknown, code: string): boolean {
    let e: unknown = err;
    while (typeof e === "object" && e !== null) {
        const {code: c, cause} = e as { code?: unknown; cause?: unknown };
        if (c === code) return true;
        e = cause;
    }
    return false;
}