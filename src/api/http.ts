export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

type ErrorBody = {
    error?: string;
    errors?: {path: (string | number)[]; message: string}[];
};

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {"Content-Type": "application/json", ...init?.headers},
    });

    if (!res.ok) {
        let message = `Fehler (HTTP ${res.status})`;
        try {
            const body = (await res.json()) as ErrorBody;
            if (body.error) message = body.error;
            else if (body.errors) {
                message = body.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
            }
        } catch {
            // Antwort war kein JSON, es bleibt bei der Standardmeldung
        }
        throw new ApiError(res.status, message);
    }

    return res.status === 204 ? (undefined as T) : res.json();
}
