// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {UserContext} from "@/lib/user-context";
import {ApiTokensPage} from "@features/api-tokens/components/api-tokens-page";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [],
};

const LAPTOP = {
    id: "a1",
    userId: USER.id,
    name: "Laptop",
    createdAt: "2026-06-01T06:00:00.000Z",
    lastUsedAt: null,
    expiresAt: "2026-06-05T06:00:00.000Z", // vor dem 10.06.: abgelaufen
};
const SERVER = {...LAPTOP, id: "a2", name: "Server", expiresAt: null};
const TOKEN = "tm_geheim-nur-einmal-sichtbar";

function mockApi() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const {pathname} = new URL(String(input), "http://localhost");
        const method = init?.method ?? "GET";
        if (pathname === "/api/api-tokens" && method === "GET") return Response.json([LAPTOP, SERVER]);
        if (pathname === "/api/api-tokens" && method === "POST") {
            const body = JSON.parse(String(init?.body));
            return Response.json({...SERVER, id: "a3", name: body.name, token: TOKEN}, {status: 201});
        }
        if (pathname === "/api/api-tokens/a2" && method === "DELETE") return new Response(null, {status: 204});
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
                <ApiTokensPage />
            </UserContext.Provider>
        </QueryClientProvider>,
    );
}

const calls = (fetchMock: ReturnType<typeof mockApi>, method: string) =>
    fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === method);

beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("ApiTokensPage", () => {
    it("markiert abgelaufene Tokens und zeigt Tokens ohne Ablauf", async () => {
        mockApi();
        renderPage();

        const laptop = (await screen.findByText("Laptop")).closest("tr")!;
        expect(within(laptop).getByText(/abgelaufen/)).toBeTruthy();
        const server = screen.getByText("Server").closest("tr")!;
        expect(within(server).getByText("kein Ablauf")).toBeTruthy();
    });

    it("zeigt das Token nach dem Erzeugen einmal an, beim nächsten Öffnen nicht mehr", async () => {
        const fetchMock = mockApi();
        renderPage();
        await screen.findByText("Laptop");

        fireEvent.click(screen.getByRole("button", {name: "Token erzeugen"}));
        fireEvent.change(screen.getByLabelText("Name"), {target: {value: "  Claude Code  "}});
        fireEvent.click(screen.getByRole("button", {name: "Erzeugen"}));

        expect(await screen.findByDisplayValue(TOKEN)).toBeTruthy();
        const [, init] = calls(fetchMock, "POST")[0];
        expect(JSON.parse(String(init?.body))).toEqual({name: "Claude Code", expiresInDays: 90});

        fireEvent.click(screen.getByRole("button", {name: "Fertig"}));
        fireEvent.click(screen.getByRole("button", {name: "Token erzeugen"}));
        expect(screen.queryByDisplayValue(TOKEN)).toBeNull();
    });

    it("widerruft ein Token erst nach der Rückfrage", async () => {
        const fetchMock = mockApi();
        renderPage();

        const server = (await screen.findByText("Server")).closest("tr")!;
        fireEvent.click(within(server).getByRole("button", {name: "Widerrufen"}));
        expect(calls(fetchMock, "DELETE")).toHaveLength(0);

        const dialog = await screen.findByRole("alertdialog");
        fireEvent.click(within(dialog).getByRole("button", {name: "Widerrufen"}));
        await vi.waitFor(() => expect(calls(fetchMock, "DELETE")).toHaveLength(1));
        expect(String(calls(fetchMock, "DELETE")[0][0])).toBe("/api/api-tokens/a2");
    });
});
