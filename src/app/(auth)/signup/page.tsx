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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  CATEGORY_ELO_MAP,
  CATEGORY_LABELS,
  type PlayerCategory,
} from "@/types/database";
import { Loader2, Lock, Mail, Swords, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    username: "",
    category: "8va" as PlayerCategory,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!mounted) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Calculate initial ELO based on category
      const initialElo = CATEGORY_ELO_MAP[formData.category];

      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Update the profile with category and ELO
      // Note: This relies on the trigger to create the profile first
      // We'll update it immediately after signup
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({
            elo_score: initialElo,
            category_label: formData.category,
            full_name: formData.fullName,
            username: formData.username,
          })
          .eq("id", user.id);

        // Also update the auto-created player record
        await supabase
          .from("players")
          .update({
            elo_score: initialElo,
            category_label: formData.category,
            display_name: formData.fullName || formData.username,
          })
          .eq("profile_id", user.id);
      }

      setSuccess(true);
      setLoading(false);

      // Redirect after successful signup
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch {
      setError("Error al crear la cuenta");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo/Brand */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Swords className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">Padelio</h1>
      </div>

      <Card className="w-full max-w-sm border-0 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-xl">Crear Cuenta</CardTitle>
          <CardDescription>Completá tus datos para empezar</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert>
              <AlertDescription className="text-center">
                ¡Cuenta creada exitosamente! Redirigiendo...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    type="text"
                    placeholder="juanperez"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, ""),
                      })
                    }
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
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
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Tu Categoría de Padel</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as PlayerCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{CATEGORY_LABELS[cat]}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {CATEGORY_ELO_MAP[cat]} pts
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tu ELO inicial será de {CATEGORY_ELO_MAP[formData.category]}{" "}
                  puntos
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !mounted}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </form>
          )}

          {!success && (
            <div className="mt-6">
              <OAuthButtons onError={setError} />
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">¿Ya tenés cuenta? </span>
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Iniciá sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
