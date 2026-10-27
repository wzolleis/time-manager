// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {UserProvider} from "@/components/login/user-provider";
import {useCurrentUser} from "@/lib/user-context";

// jsdom kann kein WebAuthn: der Dialog des Browsers ist gemockt, fetch läuft wie sonst
const browser = vi.hoisted(() => ({startAuthentication: vi.fn()}));
vi.mock("@simplewebauthn/browser", () => ({
    browserSupportsWebAuthn: () => true,
    startAuthentication: browser.startAuthentication,
}));

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
};
const PASSWORD = "richtiges-passwort";
const OPTIONS = {challenge: "challenge-vom-server", rpId: "localhost"};
const ASSERTION = {id: "cred-1", rawId: "cred-1", type: "public-key", response: {clientDataJSON: "x"}};

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
            const body = JSON.parse(String(init?.body)) as {email: string; password: string};
            if (body.email === USER.email && body.password === PASSWORD) {
                loggedIn = true;
                return Response.json(USER);
            }
            return Response.json({error: "E-Mail oder Passwort ist falsch"}, {status: 401});
        }
        if (pathname === "/api/auth/passkey-login-options") return Response.json(OPTIONS);
        if (pathname === "/api/auth/passkey-login") {
            loggedIn = true;
            return Response.json(USER);
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
                <Greeting />
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
    browser.startAuthentication.mockReset();
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

    it("meldet mit Passkey an und schickt dem Server die Antwort des Browsers", async () => {
        const fetchMock = mockApi();
        browser.startAuthentication.mockResolvedValue(ASSERTION);
        renderApp();

        fireEvent.click(await screen.findByRole("button", {name: "Mit Passkey anmelden"}));

        expect(await screen.findByText("Angemeldet als Test")).toBeTruthy();
        expect(browser.startAuthentication).toHaveBeenCalledWith({optionsJSON: OPTIONS});
        const [, init] = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/api/auth/passkey-login"))!;
        expect(JSON.parse(String(init?.body))).toEqual({response: ASSERTION});
    });

    it("meldet einen abgebrochenen Dialog des Browsers", async () => {
        const fetchMock = mockApi();
        browser.startAuthentication.mockRejectedValue(Object.assign(new Error("denied"), {name: "NotAllowedError"}));
        renderApp();

        fireEvent.click(await screen.findByRole("button", {name: "Mit Passkey anmelden"}));

        expect((await screen.findByRole("alert")).textContent).toBe("Anmeldung mit Passkey abgebrochen");
        expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/auth/passkey-login"))).toBe(false);
    });
});
