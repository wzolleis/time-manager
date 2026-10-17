export type EntryRow = {
    id: string;
    type: "kommen" | "gehen";
    bookedAt: Date;
    projectId: string | null;
    projectName: string | null;
};
