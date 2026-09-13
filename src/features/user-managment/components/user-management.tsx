// components/user-management/UserManagement.tsx
import React, { useState } from 'react';
import { Box, Flex, Heading, Text, Button } from '@radix-ui/themes';
import { Plus } from 'lucide-react';

import type { ManagedUser, UserFormData } from '../types';
import { UserTable } from './user-table';
import { UserFormModal } from './user-form-modal';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([
        { id: '1', name: 'Maximilian Mustermann', email: 'max@example.com', role: 'Admin', status: 'Aktiv' },
        { id: '2', name: 'Laura Schmidt', email: 'laura@example.com', role: 'Editor', status: 'Aktiv' },
        { id: '3', name: 'Jan Müller', email: 'jan@example.com', role: 'Viewer', status: 'Inaktiv' },
    ]);

    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        role: 'Viewer',
        status: 'Aktiv',
    });

    const handleOpenCreate = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', role: 'Viewer', status: 'Aktiv' });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (user: ManagedUser) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, role: user.role, status: user.status });
        setIsDialogOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        if (editingUser) {
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
        } else {
            const newUser: ManagedUser = {
                id: crypto.randomUUID(),
                ...formData,
            };
            setUsers([...users, newUser]);
        }
        setIsDialogOpen(false);
    };

    const handleDelete = (id: string) => {
        setUsers(users.filter(u => u.id !== id));
    };

    return (
        <Box p="2">
            <Flex justify="between" align="center" mb="4">
                <Box>
                    <Heading size="5" mb="1">Benutzerverwaltung</Heading>
                    <Text size="2" color="gray">Verwalte hier die Zugriffsrechte und Accounts deines Teams.</Text>
                </Box>
                <Button onClick={handleOpenCreate}>
                    <Plus size={16} /> Benutzer einladen
                </Button>
            </Flex>

            {/* Die ausgelagerte Tabelle */}
            <UserTable
                users={users}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
            />

            {/* Das ausgelagerte Formular-Modal */}
            <UserFormModal
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingUser={editingUser}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
            />
        </Box>
    );
};
