// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {UserContext} from "@/lib/user-context";
import {PasskeysPage} from "@features/passkeys/components/passkeys-page";

// jsdom kann kein WebAuthn: der Dialog des Browsers ist gemockt, fetch läuft wie sonst
const browser = vi.hoisted(() => ({startRegistration: vi.fn()}));
vi.mock("@simplewebauthn/browser", () => ({startRegistration: browser.startRegistration}));

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [],
};

const MACBOOK = {
    id: "p1",
    userId: USER.id,
    name: "MacBook",
    backedUp: true,
    createdAt: "2026-06-01T06:00:00.000Z",
    lastUsedAt: null,
};
const OPTIONS = {challenge: "challenge-vom-server", rp: {name: "Time Manager", id: "localhost"}};
const ATTESTATION = {id: "cred-2", rawId: "cred-2", type: "public-key", response: {clientDataJSON: "x"}};

function mockApi() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const {pathname} = new URL(String(input), "http://localhost");
        const method = init?.method ?? "GET";
        if (pathname === "/api/passkeys" && method === "GET") return Response.json([MACBOOK]);
        if (pathname === "/api/auth/passkey-register-options" && method === "POST") return Response.json(OPTIONS);
        if (pathname === "/api/auth/passkey-register" && method === "POST") {
            const body = JSON.parse(String(init?.body));
            return Response.json({...MACBOOK, id: "p2", name: body.name}, {status: 201});
        }
        if (pathname === "/api/passkeys/p1" && method === "DELETE") return new Response(null, {status: 204});
        return Response.json({error: `Nicht gemockt: ${method} ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderPage() {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserContext.Provider value={{currentUser: USER}}>
                <PasskeysPage />
            </UserContext.Provider>
        </QueryClientProvider>,
    );
}

const calls = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
    fetchMock.mock.calls.filter(([url, init]) => (init?.method ?? "GET") === method && String(url).endsWith(path));

async function addPasskey(name: string) {
    fireEvent.click(screen.getByRole("button", {name: "Passkey hinzufügen"}));
    fireEvent.change(await screen.findByLabelText("Name"), {target: {value: name}});
    fireEvent.click(screen.getByRole("button", {name: "Weiter"}));
}

beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}

            unobserve() {}

            disconnect() {}
        },
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    browser.startRegistration.mockReset();
});

describe("PasskeysPage", () => {
    it("zeigt die Passkeys mit Synchronisierung und letzter Nutzung", async () => {
        mockApi();
        renderPage();

        const row = (await screen.findByText("MacBook")).closest("tr")!;
        expect(within(row).getByText("ja")).toBeTruthy();
        expect(within(row).getByText("nie")).toBeTruthy();
    });

    it("trägt einen Passkey mit Namen und der Antwort des Browsers ein", async () => {
        const fetchMock = mockApi();
        browser.startRegistration.mockResolvedValue(ATTESTATION);
        renderPage();
        await screen.findByText("MacBook");

        await addPasskey("  iPhone ");

        await vi.waitFor(() => expect(calls(fetchMock, "POST", "/api/auth/passkey-register")).toHaveLength(1));
        expect(browser.startRegistration).toHaveBeenCalledWith({optionsJSON: OPTIONS});
        const [, init] = calls(fetchMock, "POST", "/api/auth/passkey-register")[0];
        expect(JSON.parse(String(init?.body))).toEqual({name: "iPhone", response: ATTESTATION});
    });

    it("meldet, wenn das Gerät schon einen Passkey hat, und speichert nichts", async () => {
        const fetchMock = mockApi();
        browser.startRegistration.mockRejectedValue(
            Object.assign(new Error("previously registered"), {
                name: "InvalidStateError",
                code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
            }),
        );
        renderPage();
        await screen.findByText("MacBook");

        await addPasskey("iPhone");

        expect((await screen.findByRole("alert")).textContent).toBe(
            "Auf diesem Gerät ist schon ein Passkey für dich eingetragen",
        );
        expect(calls(fetchMock, "POST", "/api/auth/passkey-register")).toHaveLength(0);
    });

    it("löscht einen Passkey erst nach der Rückfrage", async () => {
        const fetchMock = mockApi();
        renderPage();

        const row = (await screen.findByText("MacBook")).closest("tr")!;
        fireEvent.click(within(row).getByRole("button", {name: "Löschen"}));
        expect(calls(fetchMock, "DELETE", "/api/passkeys/p1")).toHaveLength(0);

        const dialog = await screen.findByRole("alertdialog");
        fireEvent.click(within(dialog).getByRole("button", {name: "Löschen"}));

        await vi.waitFor(() => expect(calls(fetchMock, "DELETE", "/api/passkeys/p1")).toHaveLength(1));
    });
});
