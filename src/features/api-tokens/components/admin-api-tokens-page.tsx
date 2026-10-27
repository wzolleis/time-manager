import {ApiTokenList} from "@features/api-tokens/components/api-token-list";
import {useShowAllApiTokens} from "@features/api-tokens/use-cases/use-show-all-api-tokens";
import {Muted} from "@/components/text/muted";

export function AdminApiTokensPage() {
    const tokens = useShowAllApiTokens();

    return (
        <div className="space-y-4 p-4">
            <div>
                <h1 className="text-2xl font-semibold">Agent-Zugänge</h1>
                <Muted>Die Tokens aller User. Ein widerrufenes Token wird sofort abgelehnt.</Muted>
            </div>
            <ApiTokenList scope="all" tokens={tokens} />
        </div>
    );
}
