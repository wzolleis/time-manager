// components/UserDropdown.tsx
import React from "react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    variant?: "destructive";
};

const MenuItem = ({icon: Icon, label, onClick, variant}: MenuItemProps) => (
    <DropdownMenuItem variant={variant} onClick={onClick}>
        <Icon /> {label}
    </DropdownMenuItem>
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {/* Ungestylter Button um den Avatar; auf Touch 44×44 */}
                <button
                    type="button"
                    aria-label="Benutzermenü"
                    className="inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:size-11"
                >
                    <Avatar>
                        <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
                        <AvatarFallback className="bg-indigo-50 text-indigo-700">{fallbackInitials}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-auto">
                <MenuItem icon={UserIcon} label="Mein Profil" />
                <MenuItem
                    icon={settingsNavItem.icon}
                    label={settingsNavItem.label}
                    onClick={() => onItemSelected(settingsNavItem)}
                />
                <MenuItem icon={KeyRound} label="Passwort ändern" onClick={onChangePassword} />
                <MenuItem icon={Info} label="Version" onClick={onShowVersion} />
                <DropdownMenuSeparator />
                <MenuItem icon={LogOut} label="Log out" variant="destructive" onClick={onLogout} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
