import {ActionCard} from "@/common/components/dashboard-action/action-card.tsx";
import {actions} from "@features/time-management/types.ts";


export function TimeManagementHome() {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <main className="mx-auto max-w-5xl p-6">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Was möchtest du als Nächstes tun?</p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {actions.map((action) => (
                    <ActionCard
                        key={action.id}
                        action={action}
                        onConfirm={handleConfirm}
                    />
                ))}
            </section>
        </main>
    );
}
