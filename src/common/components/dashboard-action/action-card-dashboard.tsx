import {ActionCard} from "@/common/components/dashboard-action/action-card.tsx";
import type {DashboardAction} from "@/common/components/dashboard-action/types.ts";

export interface DashboardActionCardDashboardProps {
    onActionConfirm: (id: string) => void;
    actions: DashboardAction[]
}

export const ActionCardDashboard = (props: DashboardActionCardDashboardProps) => {
    const {onActionConfirm, actions} = props;
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
                        onConfirm={onActionConfirm}
                    />
                ))}
            </section>
        </main>
    );
}