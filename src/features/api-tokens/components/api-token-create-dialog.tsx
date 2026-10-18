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
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useCreateApiToken} from "@features/api-tokens/use-cases/use-create-api-token";
import {API_TOKEN_VALIDITIES, type ApiTokenValidity, DEFAULT_API_TOKEN_VALIDITY} from "@shared/api-token";
import {validityLabel} from "@shared/api-token-rules";

const NO_EXPIRY = "none"; // Radix Select braucht Texte als Werte

const toValue = (v: ApiTokenValidity) => (v === null ? NO_EXPIRY : String(v));
const fromValue = (s: string) => (s === NO_EXPIRY ? null : (Number(s) as Exclude<ApiTokenValidity, null>));

/** Befehl, mit dem der User Claude Code mit dem MCP-Server dieser Anwendung verbindet */
const claudeCommand = (token: string) =>
    `claude mcp add --transport http time-manager ${window.location.origin}/api/mcp \\\n  --header "Authorization: Bearer ${token}"`;

export function ApiTokenCreateDialog() {
    const uid = useId();
    const create = useCreateApiToken();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [validity, setValidity] = useState(toValue(DEFAULT_API_TOKEN_VALIDITY));
    const [copied, setCopied] = useState(false);

    // Beim Öffnen immer leer starten, ein früher erzeugtes Token wird nicht noch einmal gezeigt
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setName("");
            setValidity(toValue(DEFAULT_API_TOKEN_VALIDITY));
            setCopied(false);
            create.reset();
        }
        setOpen(next);
    };

    const problem = create.problem(name);
    const token = create.created?.token;

    const copy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>Token erzeugen</Button>
            </DialogTrigger>
            <DialogContent>
                {token ? (
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Token erzeugt</DialogTitle>
                            <DialogDescription>
                                Kopiere das Token jetzt. Es wird nicht noch einmal angezeigt.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-token`}>Token</Label>
                            <div className="flex gap-2">
                                <Input id={`${uid}-token`} value={token} readOnly className="font-mono" />
                                <Button type="button" variant="outline" onClick={() => copy(token)}>
                                    {copied ? "Kopiert" : "Kopieren"}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 text-left">
                            <p className="text-sm font-medium">Einrichten in Claude Code</p>
                            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                                {claudeCommand(token)}
                            </pre>
                        </div>

                        <DialogFooter>
                            <Button type="button" onClick={() => setOpen(false)}>
                                Fertig
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (problem) return;
                            create.create({name: name.trim(), expiresInDays: fromValue(validity)});
                        }}
                        className="space-y-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Token erzeugen</DialogTitle>
                            <DialogDescription>
                                Mit dem Token arbeitet ein Agent in deinem Namen: Er stempelt, trägt Buchungen nach und
                                liest deine Berichte.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 text-left">
                                <Label htmlFor={`${uid}-name`}>Name</Label>
                                <Input
                                    id={`${uid}-name`}
                                    value={name}
                                    maxLength={100}
                                    placeholder="z. B. Claude Code Laptop"
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2 text-left">
                                <Label htmlFor={`${uid}-validity`}>Gültigkeit</Label>
                                <Select value={validity} onValueChange={setValidity}>
                                    <SelectTrigger id={`${uid}-validity`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {API_TOKEN_VALIDITIES.map((v) => (
                                            <SelectItem key={toValue(v)} value={toValue(v)}>
                                                {validityLabel(v)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {create.error && (
                            <p role="alert" className="text-sm text-destructive">
                                {create.error.message}
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={create.isSaving || problem !== null}>
                                {create.isSaving ? "Erzeuge…" : "Erzeugen"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
