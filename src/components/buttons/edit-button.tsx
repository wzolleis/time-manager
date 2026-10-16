import {Button} from "@/components/ui/button";
import type {ButtonProps} from "@base-ui/react";

export interface EditButtonProps extends ButtonProps {
    handleOpenChange: (open: boolean) => void;
}

export const EditButton = (props: EditButtonProps) => {
    const {handleOpenChange} = props;

    return (
        <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
            Bearbeiten
        </Button>
    );
};
