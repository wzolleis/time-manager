// components/user-management/UserFormModal.tsx
import React from 'react';
import { Dialog, Flex, Text, TextField, Box, Select, Button } from '@radix-ui/themes';
import type { ManagedUser, UserFormData } from '../types';

interface UserFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingUser: ManagedUser | null;
    formData: UserFormData;
    setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
    onSave: (e: React.FormEvent) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
                                                                isOpen,
                                                                onOpenChange,
                                                                editingUser,
                                                                formData,
                                                                setFormData,
                                                                onSave,
                                                            }) => {
    return (
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <Dialog.Content size="3" style={{ maxWidth: 450 }}>
                <Dialog.Title>
                    {editingUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer einladen'}
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {editingUser ? 'Ändere die Profildaten und Berechtigungen.' : 'Füge ein neues Teammitglied hinzu.'}
                </Dialog.Description>

                <form onSubmit={onSave}>
                    <Flex direction="column" gap="4">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">Vollständiger Name</Text>
                            <TextField.Root
                                placeholder="z.B. Max Mustermann"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </label>

                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">E-Mail-Adresse</Text>
                            <TextField.Root
                                type="email"
                                placeholder="max@company.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </label>

                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Systemrolle</Text>
                            <Select.Root
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value as ManagedUser['role'] })}
                            >
                                <Select.Trigger style={{ width: '100%' }} />
                                <Select.Content variant="soft">
                                    <Select.Group>
                                        <Select.Item value="Viewer">Viewer (Nur Lesezugriff)</Select.Item>
                                        <Select.Item value="Editor">Editor (Kann Inhalte bearbeiten)</Select.Item>
                                        <Select.Item value="Admin">Admin (Vollzugriff)</Select.Item>
                                    </Select.Group>
                                </Select.Content>
                            </Select.Root>
                        </Box>

                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Status</Text>
                            <Select.Root
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value as ManagedUser['status'] })}
                            >
                                <Select.Trigger style={{ width: '100%' }} />
                                <Select.Content variant="soft">
                                    <Select.Group>
                                        <Select.Item value="Aktiv">Aktiv</Select.Item>
                                        <Select.Item value="Inaktiv">Inaktiv</Select.Item>
                                    </Select.Group>
                                </Select.Content>
                            </Select.Root>
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="6" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Abbrechen</Button>
                        </Dialog.Close>
                        <Button type="submit">Speichern</Button>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
};
