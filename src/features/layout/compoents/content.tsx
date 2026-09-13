import {Text} from '@radix-ui/themes';

const Content = ({activeLabel}: {activeLabel: string}) => {
    return (
     <Text color="gray" mb="5" as="p">Inhalt des Tabs: <strong>{activeLabel}</strong></Text>
    )
}
export default Content