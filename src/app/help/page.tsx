import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, TrendingUp, Award, Target, Zap } from "lucide-react";

export default function HelpPage() {
  return (
    <>
      <Header title="Ayuda" showBack />
      <div className="space-y-6 p-4 pb-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sistema de Puntuación</h2>
          <p className="text-muted-foreground">
            Entendé cómo funciona el sistema de puntuación y cómo se calcula tu ranking.
          </p>
        </div>

        {/* Qué es el puntaje */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle>¿Qué es el puntaje?</CardTitle>
            </div>
            <CardDescription>
              El puntaje es un número que refleja tu nivel de juego
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Tu puntaje es un número que representa tu habilidad en el pádel. Cuanto más alto sea tu puntaje, mejor es tu nivel de juego.
            </p>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-2">Rangos de puntaje por categoría:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong className="text-foreground">8va:</strong> menos de 1100 puntos</li>
                <li>• <strong className="text-foreground">7ma:</strong> 1100 - 1299 puntos</li>
                <li>• <strong className="text-foreground">6ta:</strong> 1300 - 1499 puntos</li>
                <li>• <strong className="text-foreground">5ta:</strong> 1500 - 1699 puntos</li>
                <li>• <strong className="text-foreground">4ta:</strong> 1700 - 1899 puntos</li>
                <li>• <strong className="text-foreground">3ra:</strong> 1900 - 2099 puntos</li>
                <li>• <strong className="text-foreground">2da:</strong> 2100 - 2299 puntos</li>
                <li>• <strong className="text-foreground">1ra:</strong> 2300+ puntos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Puntuación inicial */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Puntuación Inicial</CardTitle>
            </div>
            <CardDescription>
              Tu puntaje inicial depende de la categoría que elijas al registrarte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-3">
              Cuando te registrás, elegís tu categoría inicial. Cada categoría tiene un puntaje de partida:
            </p>
            <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
              <p>• 8va: 1000 puntos</p>
              <p>• 7ma: 1200 puntos</p>
              <p>• 6ta: 1400 puntos</p>
              <p>• 5ta: 1600 puntos</p>
              <p>• 4ta: 1800 puntos</p>
              <p>• 3ra: 2000 puntos</p>
              <p>• 2da: 2200 puntos</p>
              <p>• 1ra: 2400 puntos</p>
            </div>
          </CardContent>
        </Card>

        {/* Cómo se calcula */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>¿Cómo se calcula después de cada partido?</CardTitle>
            </div>
            <CardDescription>
              Tu puntaje cambia después de cada partido según el resultado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">1. Se calcula el promedio de puntaje de cada equipo</p>
              <p className="text-sm text-muted-foreground">
                El sistema promedia el puntaje de los dos jugadores de cada equipo para determinar la fuerza del equipo.
              </p>
            </div>
            
            <div>
              <p className="font-medium mb-2">2. Se calcula tu probabilidad de ganar</p>
              <p className="text-sm text-muted-foreground">
                Basándose en la diferencia de puntaje entre tu equipo y el equipo contrario, el sistema calcula qué tan probable era que ganaras.
              </p>
            </div>

            <div>
              <p className="font-medium mb-2">3. Se ajusta tu puntaje según el resultado</p>
              <p className="text-sm text-muted-foreground mb-2">
                Si ganás cuando se esperaba que ganaras → ganás pocos puntos
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Si ganás cuando se esperaba que perdieras → ganás muchos puntos
              </p>
              <p className="text-sm text-muted-foreground">
                Si perdés cuando se esperaba que ganaras → perdés muchos puntos
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
              <p className="text-sm font-medium mb-2">💡 Calibración rápida para nuevos</p>
              <p className="text-sm text-muted-foreground">
                Los primeros 10 partidos valen el doble de puntos. Esto ayuda a que tu puntaje se ajuste más rápido a tu nivel real de juego. Verás un badge &quot;Nuevo&quot; junto a tu nombre durante estos primeros partidos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo práctico */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Ejemplo Práctico</CardTitle>
            </div>
            <CardDescription>
              Veamos cómo funciona con números reales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium mb-2">Escenario:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Tu equipo: puntaje promedio 1500</li>
                <li>• Equipo contrario: puntaje promedio 1400</li>
                <li>• Tu equipo tiene 64% de probabilidad de ganar</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                  Si ganás:
                </p>
                <p className="text-sm text-muted-foreground">
                  Ganás aproximadamente +11 puntos (porque era esperado que ganaras)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Si es uno de tus primeros 10 partidos: +22 puntos
                </p>
              </div>
              
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                  Si perdés:
                </p>
                <p className="text-sm text-muted-foreground">
                  Perdés aproximadamente -21 puntos (porque se esperaba que ganaras)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Si es uno de tus primeros 10 partidos: -42 puntos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle>Información Importante</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• El puntaje mínimo es 100 puntos (no puede bajar más)</p>
            <p>• Tu categoría se actualiza automáticamente cuando tu puntaje cambia</p>
            <p>• Cada jugador se evalúa individualmente contra el promedio del equipo contrario</p>
            <p>• El sistema guarda el historial de cambios de puntaje en cada partido</p>
            <p>• El badge &quot;Nuevo&quot; aparece durante tus primeros 10 partidos</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

