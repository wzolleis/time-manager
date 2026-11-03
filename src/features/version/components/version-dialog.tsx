// src/features/version/components/version-dialog.tsx
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {ExternalLink} from "@/components/text/text-link";

const COMMIT_URL = `https://github.com/wzolleis/time-manager/commit/${__APP_COMMIT__}`;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

// Version und Commit, aus dem die Anwendung gebaut wurde
export function VersionDialog({open, onOpenChange}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Version</DialogTitle>
                </DialogHeader>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Version</dt>
                    <dd className="font-mono">{__APP_VERSION__}</dd>
                    <dt className="text-muted-foreground">Commit</dt>
                    <dd className="font-mono">
                        <ExternalLink href={COMMIT_URL}>{__APP_COMMIT__}</ExternalLink>
                    </dd>
                </dl>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Schließen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
