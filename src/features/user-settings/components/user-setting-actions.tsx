import {formatDay} from "@shared/format";
import {UserSettingDialog} from "@features/user-settings/components/user-setting-dialog";
import type {UserSettingRow} from "@features/user-settings/use-cases/use-show-user-settings";
import {useDeleteUserSetting} from "@features/user-settings/use-cases/use-delete-user-setting";
import {ErrorText} from "@/components/text/error-text";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

/**
 * Aktionen je Zeile (Regel 7): Zum aktuellen Wert trägt der User einen neuen Wert ein, einen geplanten Wert
 * ändert oder löscht er. Abgelaufene Werte gelten für die Vergangenheit weiter und haben keine Aktion.
 */
export function UserSettingActions({row}: {row: UserSettingRow}) {
    const remove = useDeleteUserSetting();
    const {setting, value, status} = row;

    if (status === "aktuell") {
        const ownValue = value?.value ?? null; // null: es gilt der Default
        return (
            <div className="flex flex-wrap justify-end gap-2">
                <UserSettingDialog setting={setting} initialValue={ownValue ?? setting.defaultValue} label="Ändern" />
                {/* Gilt schon der Default, gibt es nichts zurückzusetzen */}
                <UserSettingDialog
                    setting={setting}
                    initialValue={null}
                    label="Auf Default zurücksetzen"
                    disabled={ownValue === null}
                />
            </div>
        );
    }
    if (status !== "geplant" || !value) return null;

    return (
        <div className="space-y-1">
            <div className="flex flex-wrap justify-end gap-2">
                <UserSettingDialog setting={setting} current={value} initialValue={value.value} label="Bearbeiten" />

                <ConfirmDeleteButton
                    title="Geplanten Wert löschen?"
                    description={
                        <>
                            {setting.name} {row.text} ab dem {formatDay(value.validFrom)} wird entfernt. Danach gilt
                            weiter der bisherige Wert.
                        </>
                    }
                    onConfirm={() => remove.remove(value)}
                    onOpen={() => remove.reset()}
                    pending={remove.isDeleting}
                />
            </div>

            {remove.error && <ErrorText className="text-right">{remove.error.message}</ErrorText>}
        </div>
    );
}
