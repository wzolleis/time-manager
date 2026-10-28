// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {NotFound} from "@/application/layout/not-found";
import type {User} from "@shared/user";
import {ADMIN_ROLE_ID} from "@shared/role";

const ADMIN: User = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Admin",
    email: "admin@example.com",
    avatarUrl: null,
};
const BERTA: User = {id: "u2", name: "Berta", email: "berta@example.com", avatarUrl: null};
const ANTON: User = {id: "u3", name: "Anton", email: "zeta@example.com", avatarUrl: "https://example.com/a.png"};

// Kleiner Server im Speicher: Löschen und Ändern wirken sich auf das nächste Laden der Liste aus
function mockApi({deleteError}: {deleteError?: string} = {}) {
    let users = [ADMIN, BERTA, ANTON];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        const method = init?.method ?? "GET";
        if (pathname === "/api/auth/me") return Response.json({...ADMIN, roleIds: [ADMIN_ROLE_ID]});
        if (pathname === "/api/users" && method === "GET") return Response.json(users);

        const id = pathname.match(/^\/api\/users\/([^/]+)$/)?.[1];
        if (id && method === "DELETE") {
            if (deleteError) return Response.json({error: deleteError}, {status: 409});
            users = users.filter((u) => u.id !== id);
            return new Response(null, {status: 204});
        }
        if (id && method === "PATCH") {
            const patch = JSON.parse(String(init?.body)) as Partial<User>;
            users = users.map((u) => (u.id === id ? {...u, ...patch} : u));
            return Response.json(users.find((u) => u.id === id));
        }
        return Response.json({error: `Nicht gemockt: ${method} ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderPage(path = "/admin/users") {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: [path]}),
    });
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <RouterProvider router={router} />
            </UserProvider>
        </QueryClientProvider>,
    );
}

// Die Namen stehen auch im Benutzermenü, die E-Mail nur in der Tabelle
const rowOf = (email: string) => screen.getByText(email).closest("tr")!;
const emails = () =>
    screen
        .getAllByRole("row")
        .slice(1) // Kopfzeile
        .map((row) => within(row).getAllByRole("cell")[1].textContent);
const calls = (fetchMock: ReturnType<typeof mockApi>, method: string) =>
    fetchMock.mock.calls
        .filter(([, init]) => init?.method === method)
        .map(([input, init]) => ({url: String(input), body: init?.body}));

beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}

            unobserve() {}

            disconnect() {}
        },
    );
    vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe("Benutzerverwaltung", () => {
    it("zeigt die User und sortiert nach Name oder E-Mail", async () => {
        mockApi();
        renderPage();

        await screen.findByText("zeta@example.com");
        expect(emails()).toEqual(["admin@example.com", "berta@example.com", "zeta@example.com"]);

        fireEvent.click(screen.getByRole("button", {name: "Name"}));
        expect(emails()).toEqual(["admin@example.com", "zeta@example.com", "berta@example.com"]); // Admin, Anton, Berta

        fireEvent.click(screen.getByRole("button", {name: "E-Mail"}));
        expect(emails()).toEqual(["admin@example.com", "berta@example.com", "zeta@example.com"]);
    });

    it("bietet je Zeile Bearbeiten, Rollen, Passwort und Löschen an", async () => {
        mockApi();
        renderPage();

        await screen.findByText("berta@example.com");
        const row = within(rowOf("berta@example.com"));
        for (const name of ["Bearbeiten", "Rollen", "Passwort", "Löschen"]) {
            expect(row.getByRole("button", {name: new RegExp(name)})).toBeTruthy();
        }
    });

    it("löscht einen User erst nach Bestätigung", async () => {
        const fetchMock = mockApi();
        renderPage();

        await screen.findByText("berta@example.com");
        fireEvent.click(within(rowOf("berta@example.com")).getByRole("button", {name: "Löschen"}));

        const dialog = await screen.findByRole("alertdialog");
        expect(within(dialog).getByText("Berta löschen?")).toBeTruthy();
        expect(calls(fetchMock, "DELETE")).toEqual([]);

        fireEvent.click(within(dialog).getByRole("button", {name: "Löschen"}));
        await waitFor(() => expect(screen.queryByText("berta@example.com")).toBeNull());
        expect(calls(fetchMock, "DELETE").map((c) => c.url)).toEqual(["/api/users/u2"]);
        expect(emails()).toEqual(["admin@example.com", "zeta@example.com"]);
    });

    it("zeigt einen Fehler beim Löschen in der Zeile des Users", async () => {
        mockApi({deleteError: "Der User hat noch Buchungen"});
        renderPage();

        await screen.findByText("berta@example.com");
        fireEvent.click(within(rowOf("berta@example.com")).getByRole("button", {name: "Löschen"}));
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", {name: "Löschen"}));

        const alert = await within(rowOf("berta@example.com")).findByRole("alert");
        expect(alert.textContent).toBe("Der User hat noch Buchungen");
        expect(within(rowOf("zeta@example.com")).queryByRole("alert")).toBeNull();
    });

    it("sendet beim Bearbeiten nur die geänderten Felder", async () => {
        const fetchMock = mockApi();
        renderPage();

        await screen.findByText("berta@example.com");
        fireEvent.click(within(rowOf("berta@example.com")).getByRole("button", {name: "Bearbeiten"}));

        const dialog = await screen.findByRole("dialog");
        expect((within(dialog).getByLabelText("Name") as HTMLInputElement).value).toBe("Berta");
        fireEvent.change(within(dialog).getByLabelText("E-Mail"), {target: {value: "berta@firma.de"}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Speichern"}));

        await screen.findByText("berta@firma.de");
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(calls(fetchMock, "PATCH")).toEqual([
            {url: "/api/users/u2", body: JSON.stringify({email: "berta@firma.de"})},
        ]);
    });

    it("entfernt den Avatar mit einem leeren Feld", async () => {
        const fetchMock = mockApi();
        renderPage();

        await screen.findByText("zeta@example.com");
        fireEvent.click(within(rowOf("zeta@example.com")).getByRole("button", {name: "Bearbeiten"}));

        const dialog = await screen.findByRole("dialog");
        fireEvent.change(within(dialog).getByLabelText("Avatar-URL (optional)"), {target: {value: ""}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Speichern"}));

        await waitFor(() => expect(calls(fetchMock, "PATCH")).toHaveLength(1));
        expect(calls(fetchMock, "PATCH")[0]).toEqual({url: "/api/users/u3", body: JSON.stringify({avatarUrl: null})});
    });
});
