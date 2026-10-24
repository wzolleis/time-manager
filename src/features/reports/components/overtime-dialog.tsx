import {useId, useState} from "react";
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
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {fromOffset, MAX_OFFSET_HOURS, type OffsetParts, type OffsetSign} from "@shared/overtime-rules";
import {useChangeOvertime} from "@features/reports/use-cases/use-change-overtime";

const range = (n: number) => Array.from({length: n}, (_, i) => String(i));
const HOURS = range(MAX_OFFSET_HOURS + 1);
const MINUTES = range(60);

/** offset: der gespeicherte Korrekturwert in Minuten, null: noch keine Korrektur */
export function OvertimeDialog({offset}: {offset: number | null}) {
    const uid = useId();
    const change = useChangeOvertime();
    const [open, setOpen] = useState(false);
    const [parts, setParts] = useState<OffsetParts>(fromOffset(offset));

    // Beim Öffnen immer mit dem gespeicherten Wert starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setParts(fromOffset(offset));
            change.reset();
        }
        setOpen(next);
    };

    const problem = change.problem(parts);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!change.currentUser}>
                    Bearbeiten
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!problem) change.change(parts, {onSuccess: () => setOpen(false)});
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>Überstunden korrigieren</DialogTitle>
                        <DialogDescription>
                            Der Korrekturwert ist der Saldo bis gestern. Ab heute wird mit den Buchungen
                            weitergerechnet.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-sign`}>Vorzeichen</Label>
                            <Select
                                value={parts.sign}
                                onValueChange={(sign) => setParts({...parts, sign: sign as OffsetSign})}
                            >
                                <SelectTrigger id={`${uid}-sign`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="+">+</SelectItem>
                                    <SelectItem value="-">−</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-hours`}>Stunden</Label>
                            <Select
                                value={String(parts.hours)}
                                onValueChange={(h) => setParts({...parts, hours: Number(h)})}
                            >
                                <SelectTrigger id={`${uid}-hours`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {HOURS.map((h) => (
                                        <SelectItem key={h} value={h}>
                                            {h}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-minutes`}>Minuten</Label>
                            <Select
                                value={String(parts.minutes)}
                                onValueChange={(m) => setParts({...parts, minutes: Number(m)})}
                            >
                                <SelectTrigger id={`${uid}-minutes`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MINUTES.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m.padStart(2, "0")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {problem && <p className="text-sm text-destructive">{problem}</p>}
                    {change.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {change.error.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={change.isSaving || problem !== null}>
                            {change.isSaving ? "Speichere…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
