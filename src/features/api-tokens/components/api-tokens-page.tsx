import {ApiTokenCreateDialog} from "@features/api-tokens/components/api-token-create-dialog";
import {ApiTokenList} from "@features/api-tokens/components/api-token-list";
import {useShowApiTokens} from "@features/api-tokens/use-cases/use-show-api-tokens";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function ApiTokensPage() {
    const tokens = useShowApiTokens();

    return (
        <Page>
            <PageHeader
                title="Agent-Zugang"
                description="Mit einem Token bedient ein Agent wie Claude Code die Zeiterfassung in deinem Namen."
                actions={<ApiTokenCreateDialog />}
            />
            <ApiTokenList scope="own" tokens={tokens} />
        </Page>
    );
}
