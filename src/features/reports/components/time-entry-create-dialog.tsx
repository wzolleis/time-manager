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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {formatTime} from "@shared/format";
import {useProjects} from "@/views/projects";
import {localDay} from "@shared/time-rules";
import {useAddTimeEntry} from "@features/reports/use-cases/use-add-time-entry";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";

type EntryType = "kommen" | "gehen";

type Props = {
    defaultDay: string; // "JJJJ-MM-TT"
    defaultType: EntryType;
    defaultTime?: string; // "HH:mm"; ohne Angabe: jetzt für heute, sonst leer
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

export function TimeEntryCreateDialog({
    defaultDay,
    defaultType,
    defaultTime,
    label,
    variant = "outline",
    size = "sm",
}: Props) {
    const uid = useId();
    const projects = useProjects();
    const create = useAddTimeEntry();
    const {currentUser} = create;

    const [open, setOpen] = useState(false);
    const [day, setDay] = useState(defaultDay);
    const [time, setTime] = useState("");
    const [type, setType] = useState<EntryType>(defaultType);
    const [projectChoice, setProjectChoice] = useState(NO_PROJECT);

    // Beim Öffnen immer mit den Vorgaben starten, keine alten Eingaben oder Fehler
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setDay(defaultDay);
            setType(defaultType);
            setTime(defaultTime ?? (defaultDay === localDay(new Date()) ? formatTime(new Date()) : ""));
            setProjectChoice(NO_PROJECT);
            create.reset();
        }
        setOpen(next);
    };

    const problem = create.problem({type, day, time});
    const sickNotice = create.sickNotice(day);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || problem) return;
        create.add(
            {type, day, time, projectId: projectChoice === NO_PROJECT ? null : projectChoice},
            {onSuccess: () => setOpen(false)},
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} disabled={!currentUser}>
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Buchung nachtragen</DialogTitle>
                        <DialogDescription>
                            Für {currentUser?.name}. Kommen und Gehen müssen am selben Tag liegen, die Abfolge wird beim
                            Speichern geprüft.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 text-left">
                        <Label htmlFor={`${uid}-type`}>Buchung</Label>
                        <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                            <SelectTrigger id={`${uid}-type`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="kommen">Kommen</SelectItem>
                                <SelectItem value="gehen">Gehen</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-day`}>Tag</Label>
                            <Input
                                id={`${uid}-day`}
                                type="date"
                                value={day}
                                max={localDay(new Date())}
                                onChange={(e) => e.target.value && setDay(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-time`}>Uhrzeit</Label>
                            <Input
                                id={`${uid}-time`}
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {type === "kommen" && (
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-project`}>Projekt</Label>
                            <Select value={projectChoice} onValueChange={setProjectChoice}>
                                <SelectTrigger id={`${uid}-project`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_PROJECT}>Kein Projekt</SelectItem>
                                    {projects.data?.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {sickNotice && <Muted>{sickNotice}</Muted>}
                    {problem && <ErrorText alert={false}>{problem}</ErrorText>}
                    {create.error && <ErrorText>{create.error.message}</ErrorText>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={create.isSaving || problem !== null}>
                            {create.isSaving ? "Speichere…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
