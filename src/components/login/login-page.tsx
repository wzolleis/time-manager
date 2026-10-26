// src/components/login/login-page.tsx
import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {login, ME_QUERY_KEY} from "@/api/auth";
import type {Login} from "@shared/auth";

// Steht außerhalb des Routers: ohne Anmeldung gibt es keine andere Seite
export function LoginPage() {
    const qc = useQueryClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const submit = useMutation({
        mutationFn: (data: Login) => login(data),
        onSuccess: (user) => {
            // Daten eines vorher angemeldeten Users dürfen nicht stehen bleiben
            qc.removeQueries({predicate: (q) => q.queryKey[0] !== ME_QUERY_KEY[0]});
            qc.setQueryData(ME_QUERY_KEY, user);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submit.mutate({email, password});
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>
                        <h1 className="text-2xl font-semibold">Anmelden</h1>
                    </CardTitle>
                    <CardDescription>Mit E-Mail und Passwort beim Time Manager anmelden.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">E-Mail</Label>
                            <Input
                                id="login-email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="login-password">Passwort</Label>
                            <Input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {submit.isError && (
                            <p role="alert" className="text-sm text-destructive">
                                {submit.error.message}
                            </p>
                        )}

                        <Button type="submit" className="w-full" disabled={submit.isPending}>
                            {submit.isPending ? "Melde an…" : "Anmelden"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
