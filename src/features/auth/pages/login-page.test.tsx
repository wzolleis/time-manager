// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {UserProvider} from "@/components/user-provider";
import {useCurrentUser} from "@/lib/user-context";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
};
const PASSWORD = "richtiges-passwort";

// Ohne Session liefert /me 401, der Login setzt die Session
function mockApi() {
    let loggedIn = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        if (pathname === "/api/auth/me") {
            return loggedIn ? Response.json(USER) : Response.json({error: "Anmeldung erforderlich"}, {status: 401});
        }
        if (pathname === "/api/auth/login") {
            const body = JSON.parse(String(init?.body)) as { email: string; password: string };
            if (body.email === USER.email && body.password === PASSWORD) {
                loggedIn = true;
                return Response.json(USER);
            }
            return Response.json({error: "E-Mail oder Passwort ist falsch"}, {status: 401});
        }
        return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function Greeting() {
    const {currentUser} = useCurrentUser();
    return <p>Angemeldet als {currentUser.name}</p>;
}

function renderApp() {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <Greeting/>
            </UserProvider>
        </QueryClientProvider>,
    );
}

async function submitLogin(email: string, password: string) {
    fireEvent.change(await screen.findByLabelText("E-Mail"), {target: {value: email}});
    fireEvent.change(screen.getByLabelText("Passwort"), {target: {value: password}});
    fireEvent.click(screen.getByRole("button", {name: "Anmelden"}));
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("Anmeldung", () => {
    it("zeigt ohne Session die Login-Seite statt der Anwendung", async () => {
        mockApi();
        renderApp();
        expect(await screen.findByRole("heading", {name: "Anmelden"})).toBeTruthy();
        expect(screen.queryByText(/Angemeldet als/)).toBeNull();
    });

    it("zeigt bei falschem Passwort die Meldung des Servers", async () => {
        mockApi();
        renderApp();
        await submitLogin(USER.email, "falsch");
        expect((await screen.findByRole("alert")).textContent).toBe("E-Mail oder Passwort ist falsch");
        expect(screen.queryByText(/Angemeldet als/)).toBeNull();
    });

    it("zeigt nach erfolgreichem Login die Anwendung mit dem angemeldeten User", async () => {
        mockApi();
        renderApp();
        await submitLogin(USER.email, PASSWORD);
        expect(await screen.findByText("Angemeldet als Test")).toBeTruthy();
    });

    it("zeigt mit gültiger Session direkt die Anwendung", async () => {
        const fetchMock = mockApi();
        renderApp();
        await submitLogin(USER.email, PASSWORD);
        await screen.findByText("Angemeldet als Test");
        cleanup();

        renderApp();
        expect(await screen.findByText("Angemeldet als Test")).toBeTruthy();
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/auth/login"))).toHaveLength(1);
    });
});
