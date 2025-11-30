"use client";

import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EloBadge } from "@/components/ui/elo-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  getCountries,
  getCountryName,
  getProvincesByCountry,
} from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import type { Player, Profile } from "@/types/database";
import {
  Check,
  Ghost,
  Globe,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClaimGhostPlayers } from "./claim-ghost-players";
import { PartnerStatsComponent } from "./partner-stats";
import { useEditMode } from "./profile-edit-button-wrapper";

interface ProfileFormProps {
  initialProfile: Profile;
  playerId: string | null;
  initialGhostPlayers: Player[];
}

export function ProfileForm({
  initialProfile,
  playerId,
  initialGhostPlayers,
}: ProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [ghostPlayers, setGhostPlayers] =
    useState<Player[]>(initialGhostPlayers);
  const { editMode, setEditMode } = useEditMode();
  const [formData, setFormData] = useState({
    fullName: initialProfile.full_name || "",
    username: initialProfile.username || "",
    email: initialProfile.email || "",
    phone: initialProfile.phone || "",
    country: initialProfile.country || "",
    province: initialProfile.province || "",
    gender: initialProfile.gender || "",
  });
  const [availableProvinces, setAvailableProvinces] = useState<
    Array<{ code: string; name: string }>
  >([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const countries = getCountries();
  const previousCountryRef = useRef<string>(formData.country);

  // Update formData when initialProfile changes
  useEffect(() => {
    setProfile(initialProfile);
    setFormData({
      fullName: initialProfile.full_name || "",
      username: initialProfile.username || "",
      email: initialProfile.email || "",
      phone: initialProfile.phone || "",
      country: initialProfile.country || "",
      province: initialProfile.province || "",
      gender: initialProfile.gender || "",
    });
    previousCountryRef.current = initialProfile.country || "";
  }, [initialProfile]);

  useEffect(() => {
    const countryChanged = previousCountryRef.current !== formData.country;
    previousCountryRef.current = formData.country;

    if (formData.country) {
      const provinces = getProvincesByCountry(formData.country);
      setAvailableProvinces(provinces);
      // Reset province if country changes and current province is not valid
      if (countryChanged) {
        setFormData((prev) => {
          const currentProvince = prev.province;
          if (
            currentProvince &&
            !provinces.find(
              (p) => p.code === currentProvince || p.name === currentProvince
            )
          ) {
            return { ...prev, province: "" };
          }
          return prev;
        });
      }
    } else {
      setAvailableProvinces([]);
      if (countryChanged) {
        setFormData((prev) => {
          if (prev.province) {
            return { ...prev, province: "" };
          }
          return prev;
        });
      }
    }
  }, [formData.country]);

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);

    // Ensure username is lowercase before saving
    const normalizedUsername = formData.username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: formData.fullName,
        username: normalizedUsername,
        email: formData.email || null,
        phone: formData.phone || null,
        country: formData.country || null,
        province: formData.province || null,
        gender: formData.gender || null,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Also update the player record
    await supabase
      .from("players")
      .update({ display_name: formData.fullName || normalizedUsername })
      .eq("profile_id", profile.id);

    setProfile({
      ...profile,
      full_name: formData.fullName,
      username: normalizedUsername,
      email: formData.email || null,
      phone: formData.phone || null,
      country: formData.country || null,
      province: formData.province || null,
      gender: formData.gender || null,
    });
    setEditMode(false);
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleAvatarUpload(url: string | null) {
    setProfile({ ...profile, avatar_url: url });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleDeleteGhost(ghostId: string) {
    const { error } = await supabase.from("players").delete().eq("id", ghostId);

    if (!error) {
      setGhostPlayers((prev) => prev.filter((g) => g.id !== ghostId));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {success && (
        <Alert className="mx-4 mt-4">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Perfil actualizado correctamente
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6 p-4">
        {/* Profile Card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-background" />
          <CardContent className="-mt-10 pb-6">
            <div className="flex flex-col items-center text-center">
              {editMode ? (
                <AvatarUpload
                  userId={profile.id}
                  currentAvatarUrl={profile.avatar_url}
                  userName={profile.full_name || profile.username || "Usuario"}
                  onUploadComplete={handleAvatarUpload}
                />
              ) : (
                <PlayerAvatar
                  name={profile.full_name || profile.username || "Usuario"}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                  className="ring-4 ring-background"
                />
              )}

              {editMode ? (
                <div className="mt-4 w-full max-w-xs space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          username: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="mt-4 text-xl font-bold">
                    {profile.full_name || profile.username || "Usuario"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    @{profile.username || "sin_username"}
                  </p>
                  <div className="mt-3">
                    <EloBadge
                      elo={profile.elo_score || 1400}
                      category={profile.category_label}
                      size="lg"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <>
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <PhoneInput
                    id="phone"
                    placeholder="+54 9 11 1234-5678"
                    value={formData.phone || undefined}
                    onChange={(value: string | undefined) =>
                      setFormData({ ...formData, phone: value || "" })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
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
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
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
                            <SelectItem
                              key={province.code}
                              value={province.name}
                            >
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
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
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                {profile.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="font-medium">{profile.phone}</span>
                  </div>
                )}
                {profile.country && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">País:</span>
                    <span className="font-medium">
                      {getCountryName(profile.country) || profile.country}
                    </span>
                  </div>
                )}
                {profile.province && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Provincia:</span>
                    <span className="font-medium">{profile.province}</span>
                  </div>
                )}
                {profile.gender && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Género:</span>
                    <span className="font-medium">{profile.gender}</span>
                  </div>
                )}
                {!profile.email &&
                  !profile.phone &&
                  !profile.country &&
                  !profile.province &&
                  !profile.gender && (
                    <p className="text-sm text-muted-foreground">
                      No hay información personal disponible
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner Stats */}
        {playerId && !editMode && <PartnerStatsComponent playerId={playerId} />}

        {/* Ghost Players */}
        {ghostPlayers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ghost className="h-4 w-4" />
                Jugadores Invitados ({ghostPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ghostPlayers.map((ghost) => (
                <div
                  key={ghost.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                >
                  <PlayerAvatar name={ghost.display_name} isGhost size="sm" />
                  <div className="flex-1">
                    <p className="font-medium">{ghost.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ghost.matches_played} partidos
                    </p>
                  </div>
                  <EloBadge
                    elo={ghost.elo_score}
                    category={ghost.category_label}
                    size="sm"
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>¿Eliminar jugador?</DialogTitle>
                        <DialogDescription>
                          Esta acción no se puede deshacer. El jugador será
                          eliminado permanentemente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteGhost(ghost.id)}
                        >
                          Eliminar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Historical Matches Claiming */}
        <div className="space-y-4">
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-medium">Partidos históricos</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Si jugaste partidos antes de registrarte, puedes vincularlos a tu
              cuenta buscando por nombre. Revisa los partidos de cada jugador
              para confirmar que son tuyos.
            </p>
            <ClaimGhostPlayers />
          </div>
        </div>

        {/* Push Notifications */}
        <PushNotificationSettings />

        <Separator />

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  );
}
