import {UserCreateSchema, UserUpdateSchema} from "../shared/user";

const noAvatar = UserCreateSchema.safeParse({name: "Bob", email: "bob@example.com"});
console.log("ohne avatar:", noAvatar.success);

const nullAvatar = UserUpdateSchema.safeParse({avatarUrl: null});
console.log("avatar null (Update):", nullAvatar.success);

const badAvatar = UserUpdateSchema.safeParse({avatarUrl: "abc"});
console.log("avatar ungültig:", badAvatar.success); // erwartet: false