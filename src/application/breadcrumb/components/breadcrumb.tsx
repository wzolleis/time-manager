import type {NavItem} from "@/application/navigation/types.ts";
import {Flex, Text} from "@radix-ui/themes";

interface BreadcrumbProps {
    path: NavItem[]
}

export const Breadcrumb = (props: BreadcrumbProps) => {
    const {path} = props;
    return (
        <Flex align="center" gap="3">
            {
                path.map((item: NavItem, index) => {
                    return (
                        <>
                            <Text key={item.id} weight="medium">{item.label}</Text>
                            {index < path.length - 1 && <span>{'/'}</span>}
                        </>
                    )
                })
            }
        </Flex>
    )

}