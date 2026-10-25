import {type ComponentProps, useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {addDays} from "@shared/day-range";
import {localDay} from "@shared/time-rules";
import type {UserSetting, UserSettingValue} from "@shared/user-setting";
import {useAddUserSetting} from "@features/user-settings/use-cases/use-add-user-setting";
import {useChangeUserSetting} from "@features/user-settings/use-cases/use-change-user-setting";

type Props = {
    setting: UserSetting;
    current?: UserSettingValue; // mit Wert: geplanten Wert bearbeiten, ohne: neuen Wert eintragen
    initialValue: string; // Vorschlag für den Wert, z. B. der aktuelle
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

// Urlaubstage gelten ab dem 1. Januar, dafür wählt der User nur das Jahr
const byYear = (setting: UserSetting) => setting.validFromUnit === "year";

export function UserSettingDialog({setting, current, initialValue, label, variant = "outline", size = "sm"}: Props) {
    const uid = useId();
    const add = useAddUserSetting();
    const change = useChangeUserSetting();
    const save = current ? change : add;
    const {currentUser} = save;

    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [validFrom, setValidFrom] = useState("");

    // Beim Öffnen mit dem gespeicherten Wert bzw. mit dem frühesten erlaubten Tag starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            const today = localDay(new Date());
            const nextYear = `${Number(today.slice(0, 4)) + 1}-01-01`;
            setValue(current?.value ?? initialValue);
            setValidFrom(current?.validFrom ?? (byYear(setting) ? nextYear : addDays(today, 1)));
            save.reset();
        }
        setOpen(next);
    };

    const submit = () => {
        const close = {onSuccess: () => setOpen(false)};
        if (current) change.change({setting, current, value, validFrom}, close);
        else add.add({setting, value, validFrom}, close);
    };

    const problem = !validFrom
        ? "Bitte „gültig ab“ wählen"
        : current
          ? change.problem({setting, current, value, validFrom})
          : add.problem({setting, value, validFrom});

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} disabled={!currentUser}>
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!problem) submit();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>
                            {setting.name} {current ? "bearbeiten" : "ändern"}
                        </DialogTitle>
                        <DialogDescription>
                            {setting.description.replace(/\.$/, "")}. Der neue Wert gilt ab dem gewählten{" "}
                            {byYear(setting) ? "Jahr" : "Tag"}, der bisherige gilt für die Zeit davor weiter.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-value`}>Wert</Label>
                            <Input
                                id={`${uid}-value`}
                                type="number"
                                step={1}
                                inputMode="numeric"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-from`}>gültig ab</Label>
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
                        </div>
                    </div>

                    {problem && <p className="text-sm text-destructive">{problem}</p>}

                    {save.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {save.error.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={save.isSaving || problem !== null}>
                            {save.isSaving ? "Speichere…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
