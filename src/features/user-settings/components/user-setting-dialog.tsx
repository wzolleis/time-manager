import {type ReactElement, useId, useState} from "react";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {addDays} from "@shared/day-range";
import {localDay} from "@shared/time-rules";
import type {UserSetting, UserSettingValue} from "@shared/user-setting";
import {isImmediate} from "@shared/user-setting-rules";
import {useAddUserSetting} from "@features/user-settings/use-cases/use-add-user-setting";
import {useChangeUserSetting} from "@features/user-settings/use-cases/use-change-user-setting";
import {valueText} from "@features/user-settings/use-cases/use-show-user-settings";
import {ErrorText} from "@/components/text/error-text";
import {FormDialog} from "@/components/form/form-dialog";
import {FormField} from "@/components/form/form-field";
import {FormRow} from "@/components/form/form-row";

type Props = {
    setting: UserSetting;
    current?: UserSettingValue; // mit Wert: geplanten Wert bearbeiten, ohne: neuen Wert eintragen
    initialValue: string | null; // Vorschlag für den Wert, z. B. der aktuelle; null: „Default“
    trigger: ReactElement; // der Button, der den Dialog öffnet, z. B. ein EditButton in der Zeile, ohne eigenes disabled
    disabled?: boolean;
};

// Urlaubstage gelten ab dem 1. Januar, dafür wählt der User nur das Jahr
const byYear = (setting: UserSetting) => setting.validFromUnit === "year";

const DEFAULT = "default"; // Auswahl „Default“: value null, ab „gültig ab“ gilt wieder der Default
const OWN = "own";

export function UserSettingDialog({setting, current, initialValue, trigger, disabled = false}: Props) {
    const uid = useId();
    const immediate = isImmediate(setting); // ohne „gültig ab“, der Wert gilt sofort
    const add = useAddUserSetting();
    const change = useChangeUserSetting();
    const save = current ? change : add;
    const {currentUser} = save;

    const [open, setOpen] = useState(false);
    const [value, setValue] = useState<string | null>("");
    const [lastOwn, setLastOwn] = useState(""); // die zuletzt eingegebene Zahl, für den Wechsel von „Default“ zurück
    const [validFrom, setValidFrom] = useState("");

    // Beim Öffnen mit dem gespeicherten Wert bzw. mit dem frühesten erlaubten Tag starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            const today = localDay(new Date());
            const nextYear = `${Number(today.slice(0, 4)) + 1}-01-01`;
            const start = current ? current.value : initialValue;
            setValue(start);
            setLastOwn(start ?? setting.defaultValue);
            setValidFrom(current?.validFrom ?? (byYear(setting) ? nextYear : addDays(today, 1)));
            save.reset();
        }
        setOpen(next);
    };

    const submit = () => {
        const close = {onSuccess: () => setOpen(false)};
        if (current) change.change({setting, current, value, validFrom}, close);
        else add.add({setting, value, validFrom: immediate ? undefined : validFrom}, close);
    };

    const problem = immediate
        ? add.problem({setting, value})
        : !validFrom
          ? "Bitte „gültig ab“ wählen"
          : current
            ? change.problem({setting, current, value, validFrom})
            : add.problem({setting, value, validFrom});

    return (
        <FormDialog
            title={
                <>
                    {setting.name} {current ? "bearbeiten" : "ändern"}
                </>
            }
            description={
                <>
                    {setting.description.replace(/\.$/, "")}.{" "}
                    {immediate ? (
                        "Der neue Wert gilt sofort."
                    ) : (
                        <>
                            Der neue Wert gilt ab dem gewählten {byYear(setting) ? "Jahr" : "Tag"}, der bisherige gilt
                            für die Zeit davor weiter. Mit „Default“ gilt ab dann wieder der Default (
                            {valueText(setting, setting.defaultValue)}).
                        </>
                    )}
                </>
            }
            open={open}
            onOpenChange={handleOpenChange}
            onSubmit={() => {
                if (!problem) submit();
            }}
            saving={save.isSaving}
            disabled={problem !== null}
            error={save.error}
            trigger={trigger}
            triggerDisabled={!currentUser || disabled}
        >
            {!immediate && (
                <FormField label="Art" htmlFor={`${uid}-kind`}>
                    <Select
                        value={value === null ? DEFAULT : OWN}
                        onValueChange={(kind) => setValue(kind === DEFAULT ? null : lastOwn)}
                    >
                        <SelectTrigger id={`${uid}-kind`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={OWN}>Eigener Wert</SelectItem>
                            <SelectItem value={DEFAULT}>Default</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>
            )}

            <FormRow>
                {value !== null && (
                    <FormField label="Wert" htmlFor={`${uid}-value`}>
                        {setting.type === "boolean" ? (
                            <Select value={value} onValueChange={setValue}>
                                <SelectTrigger id={`${uid}-value`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Ja</SelectItem>
                                    <SelectItem value="false">Nein</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id={`${uid}-value`}
                                type="number"
                                step={1}
                                inputMode="numeric"
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    setLastOwn(e.target.value);
                                }}
                                required
                            />
                        )}
                    </FormField>
                )}
                {!immediate && (
                    <FormField label="gültig ab" htmlFor={`${uid}-from`}>
                        {byYear(setting) ? (
                            <Input
                                id={`${uid}-from`}
                                type="number"
                                step={1}
                                inputMode="numeric"
                                value={validFrom.slice(0, 4)}
                                onChange={(e) => setValidFrom(e.target.value ? `${e.target.value}-01-01` : "")}
                                required
                            />
                        ) : (
                            <Input
                                id={`${uid}-from`}
                                type="date"
                                value={validFrom}
                                onChange={(e) => setValidFrom(e.target.value)}
                                required
                            />
                        )}
                    </FormField>
                )}
            </FormRow>

            {problem && <ErrorText alert={false}>{problem}</ErrorText>}
        </FormDialog>
    );
}
