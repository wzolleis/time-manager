import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createBackup} from "@/api/backups";

/** Der Administrator erstellt von Hand ein Backup, z. B. vor einer Migration */
export function useCreateBackup() {
    const qc = useQueryClient();

    const create = useMutation({
        mutationFn: createBackup,
        // auch nach einem Fehler: ein abgelehnter Start (z. B. läuft schon) ändert nichts, ein Lauf steht in der Liste
        onSettled: () => qc.invalidateQueries({queryKey: ["backups"]}),
    });

    return {
        create: () => create.mutate(),
        isCreating: create.isPending,
        result: create.data,
        error: create.error,
    };
}
