import {ApiTokenList} from "@features/api-tokens/components/api-token-list";
import {useShowAllApiTokens} from "@features/api-tokens/use-cases/use-show-all-api-tokens";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function AdminApiTokensPage() {
    const tokens = useShowAllApiTokens();

    return (
        <Page>
            <PageHeader
                title="Agent-Zugänge"
                description="Die Tokens aller User. Ein widerrufenes Token wird sofort abgelehnt."
            />
            <ApiTokenList scope="all" tokens={tokens} />
        </Page>
    );
}
