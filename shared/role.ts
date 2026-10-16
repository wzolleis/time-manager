// shared/role.ts
import {z} from "zod";

// Fest vorgegebene Rollen: stehen in der Tabelle roles (Migration 0007) und dürfen weder
// gelöscht noch umbenannt werden. Der Code verweist nur über die id auf sie.
export const ADMIN_ROLE_ID = "c8d47966-f04b-4e73-a752-b48266371049"; // "Administrator"
export const USER_ROLE_ID = "65c4543a-6a98-44c6-b953-6329d1688bd0"; // "User"

export type Role = {id: string; name: string};

// PUT /api/users/:id/roles: die vollständige Liste der Rollen eines Users
export const UserRolesSchema = z.object({roleIds: z.array(z.string().uuid())});

export type UserRoles = z.infer<typeof UserRolesSchema>;
