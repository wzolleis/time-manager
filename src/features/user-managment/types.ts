// components/user-management/types.ts
export interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Editor' | 'Viewer';
    status: 'Aktiv' | 'Inaktiv';
}

// Typ für das Formular (enthält alles außer der generierten ID)
export type UserFormData = Omit<ManagedUser, 'id'>;
