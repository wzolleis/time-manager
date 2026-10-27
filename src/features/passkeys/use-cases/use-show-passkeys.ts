import {useCurrentUser} from "@/lib/user-context";
import {usePasskeys} from "@/views/passkeys";

/** Der User sieht seine Passkeys */
export function useShowPasskeys() {
    const {currentUser} = useCurrentUser();
    const passkeys = usePasskeys(currentUser?.id);

    return {
        rows: passkeys.data,
        isPending: passkeys.isPending,
        error: passkeys.error,
        retry: () => passkeys.refetch(),
    };
}
