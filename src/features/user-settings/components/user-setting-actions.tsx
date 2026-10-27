import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button, buttonVariants} from "@/components/ui/button";
import {germanDay} from "@shared/vacation-rules";
import {UserSettingDialog} from "@features/user-settings/components/user-setting-dialog";
import type {UserSettingRow} from "@features/user-settings/use-cases/use-show-user-settings";
import {useDeleteUserSetting} from "@features/user-settings/use-cases/use-delete-user-setting";
import {ErrorText} from "@/components/text/error-text";

/**
 * Aktionen je Zeile (Regel 7): Zum aktuellen Wert trägt der User einen neuen Wert ein, einen geplanten Wert
 * ändert oder löscht er. Abgelaufene Werte gelten für die Vergangenheit weiter und haben keine Aktion.
 */
export function UserSettingActions({row}: {row: UserSettingRow}) {
    const remove = useDeleteUserSetting();
    const {setting, value, status} = row;

    if (status === "aktuell") {
        return (
            <div className="flex justify-end">
                <UserSettingDialog
                    setting={setting}
                    initialValue={value?.value ?? setting.defaultValue}
                    label="Ändern"
                />
            </div>
        );
    }
    if (status !== "geplant" || !value) return null;

    return (
        <div className="space-y-1">
            <div className="flex flex-wrap justify-end gap-2">
                <UserSettingDialog setting={setting} current={value} initialValue={value.value} label="Bearbeiten" />

                <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={remove.isDeleting}>
                            {remove.isDeleting ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Geplanten Wert löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {setting.name} {row.text} ab dem {germanDay(value.validFrom)} wird entfernt. Danach gilt
                                weiter der bisherige Wert.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => remove.remove(value)}
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {remove.error && <ErrorText className="text-right">{remove.error.message}</ErrorText>}
        </div>
    );
}
