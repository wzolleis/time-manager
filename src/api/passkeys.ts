import type {PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON} from "@simplewebauthn/browser";
import {request} from "./http";
import type {Passkey} from "@shared/passkey";

/** Die eigenen Passkeys des angemeldeten Users */
export const fetchPasskeys = () => request<Passkey[]>("/api/passkeys");

/** Optionen mit einer neuen Challenge für den Dialog des Browsers */
export const fetchPasskeyRegisterOptions = () =>
    request<PublicKeyCredentialCreationOptionsJSON>("/api/auth/passkey-register-options", {method: "POST"});

export const registerPasskey = (data: {name: string; response: RegistrationResponseJSON}) =>
    request<Passkey>("/api/auth/passkey-register", {method: "POST", body: JSON.stringify(data)});

export const deletePasskey = (id: string) => request<void>(`/api/passkeys/${id}`, {method: "DELETE"});
