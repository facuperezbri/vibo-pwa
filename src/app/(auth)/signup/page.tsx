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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountries, getProvincesByCountry } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  CATEGORY_ELO_MAP,
  CATEGORY_LABELS,
  type PlayerCategory,
} from "@/types/database";
import {
  Globe,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Swords,
  User,
  Users,
} from "lucide-react";
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
    country: "",
    province: "",
    phone: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [availableProvinces, setAvailableProvinces] = useState<
    Array<{ code: string; name: string }>
  >([]);
  const router = useRouter();
  const countries = getCountries();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (formData.country) {
      const provinces = getProvincesByCountry(formData.country);
      setAvailableProvinces(provinces);
      // Reset province if country changes
      setFormData((prev) => {
        if (
          prev.province &&
          !provinces.find(
            (p) => p.code === prev.province || p.name === prev.province
          )
        ) {
          return { ...prev, province: "" };
        }
        return prev;
      });
    } else {
      setAvailableProvinces([]);
      setFormData((prev) => ({ ...prev, province: "" }));
    }
  }, [formData.country]);

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
            username: formData.username
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, ""),
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
        // Ensure username is lowercase before saving
        const normalizedUsername = formData.username
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "");

        await supabase
          .from("profiles")
          .update({
            elo_score: initialElo,
            category_label: formData.category,
            full_name: formData.fullName,
            username: normalizedUsername,
            email: formData.email,
            country: formData.country || null,
            province: formData.province || null,
            phone: formData.phone || null,
            gender: formData.gender || null,
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="category">Tu Categoría de Padel</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label="Información sobre el sistema de puntuación"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Sistema de Puntuación ELO</DialogTitle>
                        <DialogDescription>
                          Cómo funciona el sistema de puntuación en Padelio
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h3 className="font-semibold mb-2">
                            ¿Qué es el ELO?
                          </h3>
                          <p className="text-muted-foreground">
                            El ELO es un sistema de puntuación que refleja tu
                            nivel de juego. Cuanto más alto sea tu ELO, mejor
                            jugador sos considerado.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">
                            Puntuación Inicial por Categoría
                          </h3>
                          <div className="space-y-1 text-muted-foreground">
                            {CATEGORIES.map((cat) => (
                              <div
                                key={cat}
                                className="flex items-center justify-between"
                              >
                                <span>{CATEGORY_LABELS[cat]}</span>
                                <span className="font-mono">
                                  {CATEGORY_ELO_MAP[cat]} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">
                            ¿Cómo cambia mi ELO?
                          </h3>
                          <p className="text-muted-foreground mb-2">
                            Después de cada partido, tu ELO se actualiza según:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                            <li>
                              <strong>Si ganaste:</strong> Tu ELO aumenta
                            </li>
                            <li>
                              <strong>Si perdiste:</strong> Tu ELO disminuye
                            </li>
                            <li>
                              <strong>El nivel del oponente:</strong> Ganar
                              contra jugadores más fuertes te da más puntos
                            </li>
                            <li>
                              <strong>Factor de aceleración:</strong> En tus
                              primeros 10 partidos, los cambios son el doble de
                              rápidos para ajustar tu nivel más rápido
                            </li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">
                            Actualización de Categoría
                          </h3>
                          <p className="text-muted-foreground">
                            Tu categoría se actualiza automáticamente según tu
                            ELO:
                          </p>
                          <div className="mt-2 space-y-1 text-muted-foreground text-xs">
                            <div>• Menos de 1100 pts → 8va Categoría</div>
                            <div>• 1100-1299 pts → 7ma Categoría</div>
                            <div>• 1300-1499 pts → 6ta Categoría</div>
                            <div>• 1500-1699 pts → 5ta Categoría</div>
                            <div>• 1700-1899 pts → 4ta Categoría</div>
                            <div>• 1900-2099 pts → 3ra Categoría</div>
                            <div>• 2100-2299 pts → 2da Categoría</div>
                            <div>• 2300+ pts → 1ra Categoría</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            <strong>Tip:</strong> Seleccioná la categoría que
                            mejor represente tu nivel actual. Tu ELO se ajustará
                            automáticamente mientras jugás partidos.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select
                    value={formData.country}
                    onValueChange={(value) =>
                      setFormData({ ...formData, country: value })
                    }
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Selecciona tu país" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.country && availableProvinces.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={formData.province}
                      onValueChange={(value) =>
                        setFormData({ ...formData, province: value })
                      }
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Selecciona tu provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProvinces.map((province) => (
                          <SelectItem key={province.code} value={province.name}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <PhoneInput
                  id="phone"
                  placeholder="+54 9 11 1234-5678"
                  value={formData.phone || undefined}
                  onChange={(value: string | undefined) =>
                    setFormData({ ...formData, phone: value || "" })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Selecciona tu género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                      <SelectItem value="Prefiero no decir">
                        Prefiero no decir
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
