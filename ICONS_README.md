# Iconos de la PWA

Este proyecto incluye iconos SVG de ejemplo que podés reemplazar con tus propios diseños.

## Archivos de Iconos

- `public/icon-192.svg` - Icono principal 192x192 (también se usa como fallback)
- `public/icon-512.svg` - Icono grande 512x512
- `public/apple-icon.svg` - Icono para Apple devices 180x180

## Generar PNGs desde SVG

Los SVG funcionan bien, pero algunos navegadores prefieren PNG. Para generar los PNGs:

### Opción 1: Usar el script incluido

1. Instalá sharp:
```bash
npm install sharp --save-dev
```

2. Ejecutá el script:
```bash
node scripts/generate-icons.js
```

Esto generará:
- `icon-192.png`
- `icon-512.png`
- `apple-icon.png`

### Opción 2: Usar herramientas online

Podés usar herramientas como:
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)
- [SVG to PNG](https://svgtopng.com/)

### Opción 3: Usar herramientas de diseño

1. Abrí los SVG en Figma, Sketch, o Adobe Illustrator
2. Exportá como PNG en los tamaños requeridos:
   - 192x192 px
   - 512x512 px
   - 180x180 px (Apple)

## Personalizar los Iconos

Los SVG actuales son placeholders simples con:
- Fondo verde (#22c55e) - color primario de la app
- Icono de raqueta de padel
- Texto "PT" o "PadelTracker"

### Para crear tus propios iconos:

1. **Diseño recomendado:**
   - Fondo sólido o degradado
   - Icono de raqueta de padel prominente
   - Colores que coincidan con tu branding
   - Texto opcional (mejor sin texto para tamaños pequeños)

2. **Tamaños:**
   - 192x192 px (mínimo recomendado)
   - 512x512 px (alta resolución)
   - 180x180 px (Apple)

3. **Formato:**
   - SVG para mejor calidad y escalabilidad
   - PNG como fallback para compatibilidad

4. **Requisitos PWA:**
   - Fondo opaco (no transparente)
   - Contraste suficiente para legibilidad
   - Diseño reconocible incluso en tamaño pequeño

## Reemplazar los Iconos

1. Creá tus nuevos iconos en los tamaños requeridos
2. Reemplazá los archivos en `public/`:
   - `icon-192.svg` / `icon-192.png`
   - `icon-512.svg` / `icon-512.png`
   - `apple-icon.svg` / `apple-icon.png`
3. Si cambiás los nombres, actualizá:
   - `public/manifest.json`
   - `src/app/layout.tsx`

## Notas

- Los SVG son preferidos porque escalan perfectamente
- Los PNG son necesarios para algunos navegadores antiguos
- Apple requiere PNG específicamente para el icono de home screen
- Asegurate de que los iconos tengan buen contraste para modo claro y oscuro

