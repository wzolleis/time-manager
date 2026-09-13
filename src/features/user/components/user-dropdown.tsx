// components/UserDropdown.tsx
import React from 'react';
import { DropdownMenu, Avatar } from '@radix-ui/themes';
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react';

// Interface für den Benutzer
interface UserProfile {
    name: string;
    email: string;
    avatarUrl?: string;
}

// Interface für die Component Props
interface UserDropdownProps {
    user: UserProfile;
    onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ user, onLogout }) => {
    const fallbackInitials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {/* Unset-Button, damit das Styling von Radix/nativem HTML nicht interferiert */}
                <button style={{ all: 'unset', cursor: 'pointer' }}>
                    <Avatar
                        src={user.avatarUrl}
                        fallback={fallbackInitials}
                        size="2"
                        radius="full"
                    />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content variant="soft">
                <DropdownMenu.Item>
                    <User size={14} style={{ marginRight: '6px' }} /> Mein Profil
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <SettingsIcon size={14} style={{ marginRight: '6px' }} /> Einstellungen
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onClick={onLogout}>
                    <LogOut size={14} style={{ marginRight: '6px' }} /> Log out
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};
