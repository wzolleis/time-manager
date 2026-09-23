import {Flex, type FlexProps} from '@radix-ui/themes'
import type {PropsWithChildren} from "react";

export function StartEnd({children}: PropsWithChildren<FlexProps>) {
    return (
        <Flex
            justify="between"
            align="center"
            px="4"
            width={'100%'}
        >
            {children}
        </Flex>
    )
}