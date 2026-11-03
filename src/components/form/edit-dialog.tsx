import type {ComponentProps} from "react";
import {FormDialog} from "@/components/form/form-dialog";

type Props = Omit<ComponentProps<typeof FormDialog>, "description">;

/** Dialog zum Bearbeiten eines Datensatzes, dessen Änderungen sofort gelten */
export function EditDialog(props: Props) {
    return <FormDialog description="Änderungen gelten nach dem Speichern sofort." {...props} />;
}
