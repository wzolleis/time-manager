// components/UserDropdown.tsx
import React from "react";
import {Avatar, DropdownMenu} from "@radix-ui/themes";
import {Info, KeyRound, LogOut, User as UserIcon, type LucideIcon} from "lucide-react";
import {findNavigationItem} from "@/application/navigation/nav-utils";
import type {NavItem} from "@/application/navigation/nav-items";
import type {User} from "@shared/user";

// Interface für die Component Props
interface UserDropdownProps {
    user: User | null;
    onLogout: () => void;
    onChangePassword: () => void;
    onShowVersion: () => void;
    onItemSelected: (item: NavItem) => void;
}

type MenuItemProps = {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    color?: "red";
};

const MenuItem = ({icon: Icon, label, onClick, color}: MenuItemProps) => (
    <DropdownMenu.Item color={color} onClick={onClick}>
        <Icon size={14} style={{marginRight: "6px"}} /> {label}
    </DropdownMenu.Item>
);

export const UserDropdown: React.FC<UserDropdownProps> = ({
    user,
    onItemSelected,
    onLogout,
    onChangePassword,
    onShowVersion,
}) => {
    let fallbackInitials = user?.name ?? "J".toUpperCase();

    fallbackInitials = fallbackInitials.substring(0, 1);

    const settingsNavItem = findNavigationItem("user-settings");

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {/* Ungestylter Button, damit das Styling von Radix/nativem HTML nicht interferiert; auf Touch 44×44 */}
                <button className="inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none pointer-coarse:size-11">
                    <Avatar src={user?.avatarUrl ?? ""} fallback={fallbackInitials} size="2" radius="full" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content variant="soft">
                <MenuItem icon={UserIcon} label="Mein Profil" />
                <MenuItem
                    icon={settingsNavItem.icon}
                    label={settingsNavItem.label}
                    onClick={() => onItemSelected(settingsNavItem)}
                />
                <MenuItem icon={KeyRound} label="Passwort ändern" onClick={onChangePassword} />
                <MenuItem icon={Info} label="Version" onClick={onShowVersion} />
                <DropdownMenu.Separator />
                <MenuItem icon={LogOut} label="Log out" color="red" onClick={onLogout} />
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};
