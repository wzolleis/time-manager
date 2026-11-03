import {formatDay} from "@shared/format";
import {isImmediate} from "@shared/user-setting-rules";
import {Button} from "@/components/ui/button";
import {UserSettingDialog} from "@features/user-settings/components/user-setting-dialog";
import type {UserSettingRow} from "@features/user-settings/use-cases/use-show-user-settings";
import {useDeleteUserSetting} from "@features/user-settings/use-cases/use-delete-user-setting";
import {useAddUserSetting} from "@features/user-settings/use-cases/use-add-user-setting";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";

/**
 * Aktionen je Zeile (Regel 7): Zum aktuellen Wert trägt der User einen neuen Wert ein, einen geplanten Wert
 * ändert oder löscht er. Abgelaufene Werte gelten für die Vergangenheit weiter und haben keine Aktion.
 */
export function UserSettingActions({row}: {row: UserSettingRow}) {
    const remove = useDeleteUserSetting();
    const {setting, value, status} = row;

    if (isImmediate(setting)) return <ImmediateSettingActions row={row} />;

    if (status === "aktuell") {
        const ownValue = value?.value ?? null; // null: es gilt der Default
        return (
            <RowActions>
                <UserSettingDialog setting={setting} initialValue={ownValue ?? setting.defaultValue} label="Ändern" />
                {/* Gilt schon der Default, gibt es nichts zurückzusetzen */}
                <UserSettingDialog
                    setting={setting}
                    initialValue={null}
                    label="Auf Default zurücksetzen"
                    disabled={ownValue === null}
                />
            </RowActions>
        );
    }
    if (status !== "geplant" || !value) return null;

    return (
        <RowActions error={remove.error}>
            <UserSettingDialog setting={setting} current={value} initialValue={value.value} label="Bearbeiten" />

            <ConfirmDeleteButton
                title="Geplanten Wert löschen?"
                description={
                    <>
                        {setting.name} {row.text} ab dem {formatDay(value.validFrom)} wird entfernt. Danach gilt weiter
                        der bisherige Wert.
                    </>
                }
                onConfirm={() => remove.remove(value)}
                onOpen={() => remove.reset()}
                pending={remove.isDeleting}
            />
        </RowActions>
    );
}

/** Einstellung ohne Historie: Ändern und Zurücksetzen gelten sofort, ohne „gültig ab“ */
function ImmediateSettingActions({row}: {row: UserSettingRow}) {
    const add = useAddUserSetting();
    const {setting} = row;
    const ownValue = row.value?.value ?? null; // null: es gilt der Default

    return (
        <RowActions error={add.error}>
            <UserSettingDialog setting={setting} initialValue={ownValue ?? setting.defaultValue} label="Ändern" />
            {/* Gilt schon der Default, gibt es nichts zurückzusetzen */}
            <Button
                variant="outline"
                size="sm"
                disabled={!add.currentUser || ownValue === null || add.isSaving}
                onClick={() => add.add({setting, value: null})}
            >
                Auf Default zurücksetzen
            </Button>
        </RowActions>
    );
}
