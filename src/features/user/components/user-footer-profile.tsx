import {Avatar, Box, Text, Flex} from "@radix-ui/themes";
import type {User} from "@user/types.ts";

export interface UserFooterProfileProps {
    user: User;
    fallbackInitials: string
}


export const UserFooterProfile = (props: UserFooterProfileProps) => {
    const {user, fallbackInitials} = props
    return (
        <Flex gap="3" align="center" style={{borderTop: '1px solid var(--gray-4)', paddingTop: '16px'}}>
            <Avatar
                src={user.avatarUrl}
                fallback={fallbackInitials}
                size="2"
                radius="full"
            />
            <Box>
                <Box display={"block"}>
                    <Text size="2" weight="bold">{user.name}</Text>
                </Box>

                <Text size="1" color="gray">{user.email}</Text>
            </Box>
        </Flex>

    )
}