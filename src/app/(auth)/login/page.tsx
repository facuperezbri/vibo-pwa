"use client";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);

    // Check for error in URL (from OAuth callback)
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      // Clean URL
      router.replace("/login");
    }
  }, [searchParams, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!mounted) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo/Brand */}
      <div className="mb-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold">Vibo</h1>
        <p className="text-sm text-muted-foreground">
          Tu ranking, tus partidos
        </p>
      </div>

      <Card className="w-full max-w-sm border-0 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
          <CardDescription>Ingresá tu email y contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={loading || !mounted}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ingresar
            </Button>
          </form>

          <div className="mt-6">
            <OAuthButtons onError={setError} />
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">¿No tenés cuenta? </span>
            <Link
              href="/signup"
              className="font-medium text-secondary hover:underline"
            >
              Registrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
