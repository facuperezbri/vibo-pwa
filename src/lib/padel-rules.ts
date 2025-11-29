import type { MatchConfig, SetScore } from "@/types/database";

/**
 * Valida si un set tiene un resultado válido según las reglas del pádel
 */
export function isValidSetScore(
  team1: number,
  team2: number,
  isSuperTiebreak: boolean
): boolean {
  // Valores deben ser números válidos
  if (team1 < 0 || team2 < 0) return false;

  if (isSuperTiebreak) {
    // Super Tiebreak: gana con 10 puntos con diferencia de 2
    // Máximo permitido es 10 (o más si hay empate prolongado, pero limitamos a 10)
    if (team1 > 10 || team2 > 10) return false;

    // Si uno tiene 10, el otro debe tener máximo 8 (diferencia de 2)
    if (team1 === 10) return team2 <= 8;
    if (team2 === 10) return team1 <= 8;

    // Si ninguno tiene 10, ambos deben tener menos de 10
    return team1 < 10 && team2 < 10;
  }

  // Set normal: máximo 7 juegos
  if (team1 > 7 || team2 > 7) return false;

  // Si uno tiene 7, debe ser 7-5 o 7-6 (tiebreak)
  if (team1 === 7) {
    return team2 === 5 || team2 === 6;
  }
  if (team2 === 7) {
    return team1 === 5 || team1 === 6;
  }

  // Si uno tiene 6, debe tener diferencia de 2 o más (6-0, 6-1, 6-2, 6-3, 6-4)
  if (team1 === 6) {
    return team2 <= 4;
  }
  if (team2 === 6) {
    return team1 <= 4;
  }

  // Si ninguno tiene 6 o 7, ambos deben tener menos de 6 (set en progreso)
  return team1 < 6 && team2 < 6;
}

/**
 * Determina el ganador de un set
 * @returns 1 si gana equipo 1, 2 si gana equipo 2, null si no hay ganador aún
 */
export function getSetWinner(
  team1: number,
  team2: number,
  isSuperTiebreak: boolean
): 1 | 2 | null {
  if (!isValidSetScore(team1, team2, isSuperTiebreak)) {
    return null;
  }

  if (isSuperTiebreak) {
    if (team1 === 10 && team2 <= 8) return 1;
    if (team2 === 10 && team1 <= 8) return 2;
    return null;
  }

  // Set normal
  if (team1 === 7) return 1;
  if (team2 === 7) return 2;
  if (team1 === 6 && team2 <= 4) return 1;
  if (team2 === 6 && team1 <= 4) return 2;

  return null;
}

/**
 * Valida si se puede jugar un 3er set
 * Para jugar un 3er set, cada equipo debe haber ganado exactamente un set
 */
export function canPlayThirdSet(sets: SetScore[]): boolean {
  if (sets.length < 2) return false;

  const set1Winner = getSetWinner(
    sets[0].team1,
    sets[0].team2,
    sets[0].isTiebreak || false
  );
  const set2Winner = getSetWinner(
    sets[1].team1,
    sets[1].team2,
    sets[1].isTiebreak || false
  );

  // Ambos sets deben tener ganador
  if (!set1Winner || !set2Winner) return false;

  // Cada equipo debe haber ganado un set diferente
  return set1Winner !== set2Winner;
}

/**
 * Valida un partido completo según las reglas del pádel
 */
export function validateMatch(
  sets: SetScore[],
  matchConfig: MatchConfig
): { valid: boolean; error?: string } {
  // Debe haber al menos 2 sets
  if (sets.length < 2) {
    return { valid: false, error: "Un partido debe tener al menos 2 sets" };
  }

  // Validar cada set individualmente
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const isSuperTiebreak = matchConfig.superTiebreak && i === 2;

    if (!isValidSetScore(set.team1, set.team2, isSuperTiebreak)) {
      const setLabel = isSuperTiebreak ? "Super Tiebreak" : `Set ${i + 1}`;
      return {
        valid: false,
        error: `El ${setLabel} tiene un resultado inválido (${set.team1}-${set.team2}). Revisá las reglas del pádel.`,
      };
    }
  }

  // Contar sets ganados por cada equipo
  let team1Sets = 0;
  let team2Sets = 0;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const isSuperTiebreak = matchConfig.superTiebreak && i === 2;
    const winner = getSetWinner(set.team1, set.team2, isSuperTiebreak);

    if (winner === 1) team1Sets++;
    if (winner === 2) team2Sets++;
  }

  // Debe haber un ganador claro (2 sets ganados)
  if (team1Sets < 2 && team2Sets < 2) {
    return {
      valid: false,
      error: "El partido debe tener un ganador claro (2 sets ganados)",
    };
  }

  // Si hay 3 sets, validar que cada equipo ganó uno antes del 3er set
  if (sets.length === 3) {
    if (!canPlayThirdSet(sets.slice(0, 2))) {
      return {
        valid: false,
        error:
          "No se puede jugar un 3er set si un equipo ya ganó los primeros 2 sets",
      };
    }

    // El 3er set debe tener un ganador
    const set3Winner = getSetWinner(
      sets[2].team1,
      sets[2].team2,
      matchConfig.superTiebreak || false
    );

    if (!set3Winner) {
      return {
        valid: false,
        error: "El 3er set debe tener un ganador",
      };
    }
  }

  // Si hay 2 sets, el ganador debe haber ganado ambos
  if (sets.length === 2) {
    if (team1Sets !== 2 && team2Sets !== 2) {
      return {
        valid: false,
        error: "Con 2 sets, un equipo debe haber ganado ambos",
      };
    }
  }

  return { valid: true };
}
