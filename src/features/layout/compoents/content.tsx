import {Text} from '@radix-ui/themes';
import {UserManagement} from "@features/user-managment/components/user-management.tsx";

const Content = ({activeLabel}: { activeLabel: string }) => {
    return (
        <>
            <Text color="gray" mb="5" as="p">Inhalt des Tabs: <strong>{activeLabel}</strong></Text>
            <UserManagement/>
        </>
    )
}
export default Content