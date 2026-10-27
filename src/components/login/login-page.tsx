// src/components/login/login-page.tsx
import {useState} from "react";
import {Fingerprint} from "lucide-react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {browserSupportsWebAuthn, startAuthentication} from "@simplewebauthn/browser";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {fetchPasskeyLoginOptions, login, loginWithPasskey, ME_QUERY_KEY} from "@/api/auth";
import {passkeyError} from "@/lib/passkey-error";
import type {Login} from "@shared/auth";
import type {User} from "@shared/user";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";

// Ohne Session: die Optionen nennen keinen User, der Browser bietet alle Passkeys dieser Domain an
async function passkeyLogin(): Promise<User> {
    const optionsJSON = await fetchPasskeyLoginOptions();
    let response;
    try {
        response = await startAuthentication({optionsJSON});
    } catch (err) {
        throw passkeyError(err, "Anmeldung mit Passkey abgebrochen");
    }
    return loginWithPasskey(response);
}

// Steht außerhalb des Routers: ohne Anmeldung gibt es keine andere Seite
export function LoginPage() {
    const qc = useQueryClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const signIn = (user: User) => {
        // Daten eines vorher angemeldeten Users dürfen nicht stehen bleiben
        qc.removeQueries({predicate: (q) => q.queryKey[0] !== ME_QUERY_KEY[0]});
        qc.setQueryData(ME_QUERY_KEY, user);
    };

    const submit = useMutation({mutationFn: (data: Login) => login(data), onSuccess: signIn});
    const passkey = useMutation({mutationFn: passkeyLogin, onSuccess: signIn});
    const isPending = submit.isPending || passkey.isPending;
    const error = submit.error ?? passkey.error;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        passkey.reset();
        submit.mutate({email, password});
    };

    const handlePasskey = () => {
        submit.reset();
        passkey.mutate();
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>
                        <h1 className="text-2xl font-semibold">Anmelden</h1>
                    </CardTitle>
                    <CardDescription>
                        Mit E-Mail und Passwort oder mit einem Passkey beim Time Manager anmelden.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField label="E-Mail" htmlFor="login-email">
                            <Input
                                id="login-email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </FormField>

                        <FormField label="Passwort" htmlFor="login-password">
                            <Input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </FormField>

                        {error && <ErrorText>{error.message}</ErrorText>}

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {submit.isPending ? "Melde an…" : "Anmelden"}
                        </Button>

                        {browserSupportsWebAuthn() && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={isPending}
                                onClick={handlePasskey}
                            >
                                <Fingerprint aria-hidden />
                                {passkey.isPending ? "Warte auf Passkey…" : "Mit Passkey anmelden"}
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
