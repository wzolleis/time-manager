// components/user-management/UserTable.tsx
import React from 'react';
import { Table, Box, Badge, Flex, IconButton } from '@radix-ui/themes';
import { Edit2, Trash2 } from 'lucide-react';
import type { ManagedUser } from '../types';

interface UserTableProps {
    users: ManagedUser[];
    onEdit: (user: ManagedUser) => void;
    onDelete: (id: string) => void;
}

export const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onDelete }) => {
    const getRoleColor = (role: ManagedUser['role']) => {
        if (role === 'Admin') return 'red';
        if (role === 'Editor') return 'blue';
        return 'gray';
    };

    return (
        <Box style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-4)', border: '1px solid var(--gray-4)', overflow: 'hidden' }}>
    <Table.Root variant="surface">
        <Table.Header>
            <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>E-Mail</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Rolle</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell justify="end">Aktionen</Table.ColumnHeaderCell>
        </Table.Row>
        </Table.Header>

        <Table.Body>
        {users.map((user) => (
                <Table.Row key={user.id} align="center">
            <Table.RowHeaderCell>{user.name}</Table.RowHeaderCell>
            <Table.Cell>{user.email}</Table.Cell>
            <Table.Cell>
            <Badge color={getRoleColor(user.role)} variant="soft">
    {user.role}
    </Badge>
    </Table.Cell>
    <Table.Cell>
    <Badge color={user.status === 'Aktiv' ? 'green' : 'amber'} variant="surface" radius="full">
        {user.status}
        </Badge>
        </Table.Cell>
        <Table.Cell justify="end">
    <Flex gap="2" justify="end">
    <IconButton variant="ghost" color="gray" onClick={() => onEdit(user)}>
    <Edit2 size={16} />
    </IconButton>
    <IconButton variant="ghost" color="red" onClick={() => onDelete(user.id)}>
    <Trash2 size={16} />
    </IconButton>
    </Flex>
    </Table.Cell>
    </Table.Row>
))}
    </Table.Body>
    </Table.Root>
    </Box>
);
};
