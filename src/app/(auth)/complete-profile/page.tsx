"use client";

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
  Loader2,
  Mail,
  MapPin,
  Phone,
  Swords,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    category: "8va" as PlayerCategory,
    country: "",
    province: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOAuthEmail, setHasOAuthEmail] = useState(false);
  const [hasOAuthPhone, setHasOAuthPhone] = useState(false);
  const [availableProvinces, setAvailableProvinces] = useState<
    Array<{ code: string; name: string }>
  >([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const countries = getCountries();

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Check if profile already exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Check if profile is complete (has category and required fields)
    if (
      profile &&
      profile.category_label &&
      profile.country &&
      profile.province &&
      (profile.email || user.email) &&
      profile.phone
    ) {
      // Profile already complete, redirect
      router.push("/");
      return;
    }

    // Pre-fill with OAuth data
    const metadata = user.user_metadata || {};
    const oauthEmail = user.email || metadata.email;
    const oauthPhone = metadata.phone || metadata.phone_number;

    setHasOAuthEmail(!!oauthEmail);
    setHasOAuthPhone(!!oauthPhone);

    setFormData({
      fullName: metadata.full_name || metadata.name || "",
      username: metadata.username || metadata.preferred_username || "",
      category: "8va",
      email: oauthEmail || "",
      phone: oauthPhone || "",
      country: metadata.country || "",
      province: metadata.province || metadata.state || "",
    });

    // Load provinces if country is set
    if (metadata.country) {
      const provinces = getProvincesByCountry(metadata.country);
      setAvailableProvinces(provinces);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (formData.country) {
      const provinces = getProvincesByCountry(formData.country);
      setAvailableProvinces(provinces);
      // Reset province if country changes and current province is not valid
      if (
        formData.province &&
        !provinces.find(
          (p) => p.code === formData.province || p.name === formData.province
        )
      ) {
        setFormData((prev) => ({ ...prev, province: "" }));
      }
    } else {
      setAvailableProvinces([]);
      if (formData.province) {
        setFormData((prev) => ({ ...prev, province: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.country]);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const initialElo = CATEGORY_ELO_MAP[formData.category];

    try {
      // Update profile
      const updateData: any = {
        full_name: formData.fullName || null,
        username: formData.username || null,
        elo_score: initialElo,
        category_label: formData.category,
        country: formData.country || null,
        province: formData.province || null,
      };

      // Only update email/phone if they were provided (not from OAuth)
      if (!hasOAuthEmail && formData.email) {
        updateData.email = formData.email;
      } else if (hasOAuthEmail && user.email) {
        updateData.email = user.email;
      }

      if (!hasOAuthPhone && formData.phone) {
        updateData.phone = formData.phone;
      } else if (hasOAuthPhone) {
        updateData.phone = formData.phone;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Update player record
      await supabase
        .from("players")
        .update({
          display_name: formData.fullName || formData.username || "Usuario",
          elo_score: initialElo,
          category_label: formData.category,
        })
        .eq("profile_id", user.id);

      router.push("/");
      router.refresh();
    } catch {
      setError("Error al completar el perfil");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          <CardTitle className="text-xl">Completá tu Perfil</CardTitle>
          <CardDescription>
            Necesitamos algunos datos para empezar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComplete} className="space-y-4">
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

            {!hasOAuthEmail && (
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
            )}

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

            {!hasOAuthPhone && (
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
