// components/UserDropdown.tsx
import React from 'react';
import {Avatar, DropdownMenu} from '@radix-ui/themes';
import {LogOut, User as UserIcon} from 'lucide-react';
import type {User} from "@features/users/types.ts";
import {findNavigationItem} from "@/application/navigation/nav-utils.ts";
import type {NavItem} from "@/application/navigation/nav-items.ts";


// Interface für die Component Props
interface UserDropdownProps {
    user: User
    onLogout: () => void;
    onItemSelected: (item: NavItem) => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ user, onItemSelected, onLogout }) => {
    const fallbackInitials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    const settingsNavItem = findNavigationItem('settings')!
    const {icon: SettingsIcon} = settingsNavItem

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
                    <UserIcon size={14} style={{ marginRight: '6px' }} /> Mein Profil
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => onItemSelected(settingsNavItem)}>
                    <SettingsIcon size={14} style={{marginRight: '6px'}}/> {settingsNavItem.label}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onClick={onLogout}>
                    <LogOut size={14} style={{ marginRight: '6px' }} /> Log out
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};
