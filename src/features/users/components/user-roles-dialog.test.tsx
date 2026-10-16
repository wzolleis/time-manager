// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {UserRolesDialog} from "./user-roles-dialog";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "@shared/role";

const ADMIN = {id: ADMIN_ROLE_ID, name: "Administrator"};
const USER_ROLE = {id: USER_ROLE_ID, name: "User"};
const USER = {id: "275f12fb-e116-4857-9f12-fbe116b857fb", name: "Bob", email: "bob@example.com", avatarUrl: null};

function mockApi(putResponse: () => Response) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        if (pathname === "/api/roles") return Response.json([ADMIN, USER_ROLE]);
        if (pathname === `/api/users/${USER.id}/roles`) {
            return init?.method === "PUT" ? putResponse() : Response.json([USER_ROLE]);
        }
        return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderDialog() {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserRolesDialog user={USER} />
        </QueryClientProvider>,
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("UserRolesDialog", () => {
    it("zeigt die Rollen des Users und speichert die Auswahl", async () => {
        const fetchMock = mockApi(() => Response.json([ADMIN, USER_ROLE]));
        renderDialog();
        fireEvent.click(screen.getByRole("button", {name: "Rollen"}));

        const admin = (await screen.findByLabelText("Administrator")) as HTMLInputElement;
        expect(admin.checked).toBe(false);
        expect((screen.getByLabelText("User") as HTMLInputElement).checked).toBe(true);

        fireEvent.click(admin);
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
        expect(JSON.parse(String(put?.[1]?.body))).toEqual({roleIds: [USER_ROLE_ID, ADMIN_ROLE_ID]});
    });

    it("zeigt die Meldung des Servers, wenn der letzte Administrator entfernt würde", async () => {
        mockApi(() => Response.json({error: "Es muss mindestens ein Administrator bleiben"}, {status: 409}));
        renderDialog();
        fireEvent.click(screen.getByRole("button", {name: "Rollen"}));
        fireEvent.click(await screen.findByLabelText("User"));
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));

        expect((await screen.findByRole("alert")).textContent).toBe("Es muss mindestens ein Administrator bleiben");
    });

    it("zeigt ohne Rechte die Meldung des Servers", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                Response.json({error: "Dir fehlen die notwendigen Rechte für diese Aktion"}, {status: 403}),
            ),
        );
        renderDialog();
        fireEvent.click(screen.getByRole("button", {name: "Rollen"}));

        expect((await screen.findByRole("alert")).textContent).toBe(
            "Dir fehlen die notwendigen Rechte für diese Aktion",
        );
    });
});
