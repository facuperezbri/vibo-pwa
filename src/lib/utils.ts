import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * @param str1 Primera string
 * @param str2 Segunda string
 * @returns Distancia de Levenshtein (número de cambios necesarios)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Inicializar matriz
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Calcular distancia
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // eliminación
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j - 1] + 1  // sustitución
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calcula la similitud entre dos strings usando distancia de Levenshtein
 * @param str1 Primera string
 * @param str2 Segunda string
 * @returns Score de similitud entre 0 y 1 (1 = idéntico, 0 = completamente diferente)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  const maxLength = Math.max(s1.length, s2.length)
  const distance = levenshteinDistance(s1, s2)
  
  // Normalizar: 1 - (distancia / longitud máxima)
  return 1 - distance / maxLength
}

/**
 * Tipo para resultados de búsqueda con score de relevancia
 */
export interface SearchResult<T> {
  item: T
  score: number
  matchType: 'exact' | 'starts-with' | 'contains' | 'fuzzy'
}

/**
 * Busca y ordena items por relevancia usando búsqueda difusa
 * @param items Array de items a buscar
 * @param searchTerm Término de búsqueda
 * @param getSearchableText Función que extrae el texto buscable de cada item
 * @param limit Límite de resultados (default: 30)
 * @returns Array de resultados ordenados por relevancia
 */
export function fuzzySearch<T>(
  items: T[],
  searchTerm: string,
  getSearchableText: (item: T) => string,
  limit: number = 30
): SearchResult<T>[] {
  const searchLower = searchTerm.toLowerCase().trim()

  // Si no hay término de búsqueda, retornar todos los items
  if (!searchLower) {
    return items.slice(0, limit).map(item => ({
      item,
      score: 1,
      matchType: 'exact' as const
    }))
  }

  const results: SearchResult<T>[] = []

  for (const item of items) {
    const text = getSearchableText(item)
    const textLower = text.toLowerCase().trim()

    // Coincidencia exacta
    if (textLower === searchLower) {
      results.push({
        item,
        score: 1,
        matchType: 'exact'
      })
      continue
    }

    // Empieza con el término de búsqueda
    if (textLower.startsWith(searchLower)) {
      results.push({
        item,
        score: 0.9,
        matchType: 'starts-with'
      })
      continue
    }

    // Contiene el término de búsqueda
    if (textLower.includes(searchLower)) {
      // Score más alto si está más cerca del inicio
      const index = textLower.indexOf(searchLower)
      const positionScore = 1 - index / textLower.length
      results.push({
        item,
        score: 0.7 + positionScore * 0.1,
        matchType: 'contains'
      })
      continue
    }

    // Búsqueda difusa
    const similarity = stringSimilarity(searchLower, textLower)
    if (similarity > 0.3) { // Umbral mínimo de similitud
      results.push({
        item,
        score: similarity * 0.6, // Score más bajo para fuzzy matches
        matchType: 'fuzzy'
      })
    }
  }

  // Ordenar por score descendente y luego por nombre alfabéticamente
  return results
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      const textA = getSearchableText(a.item).toLowerCase()
      const textB = getSearchableText(b.item).toLowerCase()
      return textA.localeCompare(textB)
    })
    .slice(0, limit)
}
