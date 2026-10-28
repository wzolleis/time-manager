import {useQuery} from "@tanstack/react-query";
import {fetchUsers} from "@/api/users";
import {UserCreateDialog} from "@features/users/components/user-create-dialog";
import {UserTable} from "@features/users/components/user-table";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function Users() {
    const {
        data: users,
        isPending,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    return (
        <Page>
            <PageHeader title="Benutzerverwaltung" actions={<UserCreateDialog />} />

            {isPending && <Loading />}

            {isError && <LoadError error={error} onRetry={() => refetch()} />}

            {users && <UserTable users={users} />}
        </Page>
    );
}
