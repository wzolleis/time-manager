import {Flex, type FlexProps} from "@radix-ui/themes";
import type {PropsWithChildren} from "react";

export function StartEnd({children}: PropsWithChildren<FlexProps>) {
    return (
        <Flex justify="between" align="center" gap="3" px="4" width={"100%"} minWidth="0">
            {children}
        </Flex>
    );
}
