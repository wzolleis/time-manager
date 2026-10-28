// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {NotFound} from "@/application/layout/not-found";
import type {Project} from "@shared/project";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [],
};

const PROJECTS: Project[] = [
    {id: "p1", name: "Website"},
    {id: "p2", name: "Akquise"},
    {id: "p3", name: "Migration"},
];

// Kleiner Server im Speicher: Löschen und Ändern wirken sich auf das nächste Laden der Liste aus
function mockApi({deleteError}: {deleteError?: string} = {}) {
    let projects = [...PROJECTS];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        const method = init?.method ?? "GET";
        if (pathname === "/api/auth/me") return Response.json(USER);
        if (pathname === "/api/users") return Response.json([USER]);
        if (pathname === "/api/projects" && method === "GET") return Response.json(projects);

        const id = pathname.match(/^\/api\/projects\/(.+)$/)?.[1];
        if (id && method === "DELETE") {
            if (deleteError) return Response.json({error: deleteError}, {status: 409});
            projects = projects.filter((p) => p.id !== id);
            return new Response(null, {status: 204});
        }
        if (id && method === "PATCH") {
            const patch = JSON.parse(String(init?.body)) as Partial<Project>;
            projects = projects.map((p) => (p.id === id ? {...p, ...patch} : p));
            return Response.json(projects.find((p) => p.id === id));
        }
        return Response.json({error: `Nicht gemockt: ${method} ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderPage(path = "/user/projects") {
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

const rowOf = (text: string) => screen.getByText(text).closest("tr")!;
const names = () =>
    screen
        .getAllByRole("row")
        .slice(1) // Kopfzeile
        .map((row) => within(row).getAllByRole("cell")[0].textContent);
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

describe("Projekte", () => {
    it("zeigt die Projekte und sortiert sie nach Name", async () => {
        mockApi();
        renderPage();

        await screen.findByText("Website");
        expect(names()).toEqual(["Website", "Akquise", "Migration"]);

        fireEvent.click(screen.getByRole("button", {name: "Name"}));
        expect(names()).toEqual(["Akquise", "Migration", "Website"]);

        fireEvent.click(screen.getByRole("button", {name: /Name/}));
        expect(names()).toEqual(["Website", "Migration", "Akquise"]);
    });

    it("zeigt eine leere Liste in der Tabelle", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const {pathname} = new URL(String(input), "http://localhost");
                if (pathname === "/api/auth/me") return Response.json(USER);
                if (pathname === "/api/users") return Response.json([USER]);
                if (pathname === "/api/projects") return Response.json([]);
                return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
            }),
        );
        renderPage();

        const empty = await screen.findByText("Keine Projekte vorhanden.");
        expect(empty.closest("td")).toBeTruthy();
    });

    it("löscht ein Projekt erst nach Bestätigung", async () => {
        const fetchMock = mockApi();
        renderPage();

        await screen.findByText("Akquise");
        fireEvent.click(within(rowOf("Akquise")).getByRole("button", {name: "Löschen"}));

        const dialog = await screen.findByRole("alertdialog");
        expect(within(dialog).getByText("Akquise löschen?")).toBeTruthy();
        expect(calls(fetchMock, "DELETE")).toEqual([]);

        fireEvent.click(within(dialog).getByRole("button", {name: "Löschen"}));
        await waitFor(() => expect(screen.queryByText("Akquise")).toBeNull());
        expect(calls(fetchMock, "DELETE").map((c) => c.url)).toEqual(["/api/projects/p2"]);
        expect(names()).toEqual(["Website", "Migration"]);
    });

    it("zeigt einen Fehler beim Löschen in der Zeile des Projekts", async () => {
        mockApi({deleteError: "Das Projekt hat noch Buchungen"});
        renderPage();

        await screen.findByText("Akquise");
        fireEvent.click(within(rowOf("Akquise")).getByRole("button", {name: "Löschen"}));
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", {name: "Löschen"}));

        const alert = await within(rowOf("Akquise")).findByRole("alert");
        expect(alert.textContent).toBe("Das Projekt hat noch Buchungen");
        expect(within(rowOf("Website")).queryByRole("alert")).toBeNull();
    });

    it("benennt ein Projekt um", async () => {
        const fetchMock = mockApi();
        renderPage();

        await screen.findByText("Migration");
        fireEvent.click(within(rowOf("Migration")).getByRole("button", {name: "Bearbeiten"}));

        const dialog = await screen.findByRole("dialog");
        const name = within(dialog).getByLabelText("Name") as HTMLInputElement;
        expect(name.value).toBe("Migration");
        fireEvent.change(name, {target: {value: "Migration 2027"}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Speichern"}));

        await screen.findByText("Migration 2027");
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(calls(fetchMock, "PATCH")).toEqual([
            {url: "/api/projects/p3", body: JSON.stringify({name: "Migration 2027"})},
        ]);
    });

    it("schließt den Dialog ohne Anfrage, wenn sich nichts geändert hat", async () => {
        const fetchMock = mockApi();
        renderPage();

        await screen.findByText("Website");
        fireEvent.click(within(rowOf("Website")).getByRole("button", {name: "Bearbeiten"}));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", {name: "Speichern"}));

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(calls(fetchMock, "PATCH")).toEqual([]);
    });
});
