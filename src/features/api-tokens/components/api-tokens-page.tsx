import {ApiTokenCreateDialog} from "@features/api-tokens/components/api-token-create-dialog";
import {ApiTokenList} from "@features/api-tokens/components/api-token-list";
import {useShowApiTokens} from "@features/api-tokens/use-cases/use-show-api-tokens";

export function ApiTokensPage() {
    const tokens = useShowApiTokens();

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Agent-Zugang</h1>
                    <p className="text-sm text-muted-foreground">
                        Mit einem Token bedient ein Agent wie Claude Code die Zeiterfassung in deinem Namen.
                    </p>
                </div>
                <ApiTokenCreateDialog />
            </div>
            <ApiTokenList scope="own" tokens={tokens} />
        </div>
    );
}
