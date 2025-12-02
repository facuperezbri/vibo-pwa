"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PadelBallLoader } from "@/components/ui/padel-ball-loader";
import { useTournament } from "@/lib/react-query/hooks/use-tournaments";
import { useUpdateTournament } from "@/lib/react-query/mutations/use-update-tournament";
import {
  CATEGORIES,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  type PlayerCategory,
  type TournamentFormat,
  type TournamentStatus,
} from "@/types/database";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface EditTournamentFormProps {
  tournamentId: string;
}

export function EditTournamentForm({ tournamentId }: EditTournamentFormProps) {
  const router = useRouter();
  const { data: tournament, isLoading } = useTournament(tournamentId);
  const updateTournament = useUpdateTournament();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    format: "single_elimination" as TournamentFormat,
    maxTeams: "",
    minTeams: "4",
    categoryLabel: "" as PlayerCategory | "",
    gender: "" as "Masculino" | "Femenino" | "Mixto" | "",
    entryFee: "",
    prizePool: "",
    rules: "",
    status: "draft" as TournamentStatus,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name,
        slug: tournament.slug,
        description: tournament.description || "",
        startDate: tournament.start_date,
        endDate: tournament.end_date || "",
        registrationDeadline: tournament.registration_deadline || "",
        format: tournament.format,
        maxTeams: tournament.max_teams?.toString() || "",
        minTeams: tournament.min_teams.toString(),
        categoryLabel: tournament.category_label || "",
        gender: tournament.gender || "",
        entryFee: tournament.entry_fee?.toString() || "",
        prizePool: tournament.prize_pool || "",
        rules: tournament.rules || "",
        status: tournament.status,
      });
    }
  }, [tournament]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await updateTournament.mutateAsync({
        tournamentId,
        data: {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          start_date: formData.startDate,
          end_date: formData.endDate || null,
          registration_deadline: formData.registrationDeadline || null,
          format: formData.format,
          max_teams: formData.maxTeams ? parseInt(formData.maxTeams) : null,
          min_teams: parseInt(formData.minTeams),
          category_label: formData.categoryLabel || null,
          gender: formData.gender || null,
          entry_fee: formData.entryFee ? parseFloat(formData.entryFee) : null,
          prize_pool: formData.prizePool || null,
          rules: formData.rules || null,
          status: formData.status,
        },
      });

      router.push("/club/tournaments");
    } catch (err: any) {
      setError(err.message || "Error al actualizar el torneo");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <PadelBallLoader size="lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Torneo no encontrado</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Torneo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as TournamentStatus,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TOURNAMENT_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de Inicio *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de Fin</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationDeadline">
              Fecha Límite de Inscripción
            </Label>
            <Input
              id="registrationDeadline"
              type="date"
              value={formData.registrationDeadline}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  registrationDeadline: e.target.value,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="format">Formato *</Label>
            <Select
              value={formData.format}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  format: value as TournamentFormat,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minTeams">Mínimo de Equipos *</Label>
              <Input
                id="minTeams"
                type="number"
                min="2"
                value={formData.minTeams}
                onChange={(e) =>
                  setFormData({ ...formData, minTeams: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTeams">Máximo de Equipos</Label>
              <Input
                id="maxTeams"
                type="number"
                min="2"
                value={formData.maxTeams}
                onChange={(e) =>
                  setFormData({ ...formData, maxTeams: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryLabel">Categoría</Label>
            <Select
              value={formData.categoryLabel}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  categoryLabel: value as PlayerCategory,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Género</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  gender: value as "Masculino" | "Femenino" | "Mixto",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los géneros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los géneros</SelectItem>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Femenino">Femenino</SelectItem>
                <SelectItem value="Mixto">Mixto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="entryFee">Precio de Inscripción ($)</Label>
            <Input
              id="entryFee"
              type="number"
              min="0"
              step="0.01"
              value={formData.entryFee}
              onChange={(e) =>
                setFormData({ ...formData, entryFee: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizePool">Premios</Label>
            <Textarea
              id="prizePool"
              value={formData.prizePool}
              onChange={(e) =>
                setFormData({ ...formData, prizePool: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rules">Reglamento</Label>
            <Textarea
              id="rules"
              value={formData.rules}
              onChange={(e) =>
                setFormData({ ...formData, rules: e.target.value })
              }
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={updateTournament.isPending}
        >
          {updateTournament.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}

