# 🏓 Vibo

A modern Progressive Web App (PWA) for tracking padel matches, calculating ELO rankings, and competing with friends.

## 📱 Features

### Core Functionality

- **Match Registration**: Record padel matches with detailed scoring (sets, games)
- **ELO Ranking System**: Automatic ELO calculation based on match results
- **Player Categories**: Argentine padel ranking system (8va to 1ra categories)
- **Player Profiles**: Track statistics including matches played, wins, win rate, and ELO score
- **Global Ranking**: See your position in the global leaderboard
- **Match History**: View and edit all your past matches
- **Ghost Players**: Add players without accounts to your matches

### Social Features

- **Match Invitations**: Invite players to confirm matches via shareable links
- **WhatsApp Integration**: Share match results and invitations directly through WhatsApp
- **Player Management**: Create and manage ghost players for casual matches

### User Experience

- **Progressive Web App**: Installable on mobile devices with offline support
- **Push Notifications**: Receive notifications for match invitations and updates
- **Responsive Design**: Optimized for mobile and desktop
- **OAuth Authentication**: Sign in with Google, GitHub, or email
- **Profile Customization**: Upload avatars and customize your profile

### Advanced Features

- **Match Configuration**: Golden Point and Super Tie-break settings
- **Match Time Tracking**: Record when matches were played
- **Venue Tracking**: Add location information to matches
- **Match Notes**: Add notes and comments to matches

## 🛠️ Technologies Used

### Frontend

- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

### Backend & Database

- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication (OAuth + Email)
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage for avatars

### PWA & Notifications

- **Service Workers** - Offline support and caching
- **Web Push API** - Push notifications
- **Manifest.json** - PWA configuration

### Development Tools

- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## 📸 Screenshots

> **Note**: Add screenshots of your application here. Consider including:
>
> - Home screen with stats
> - Match registration form
> - Ranking page
> - Profile page
> - Match details view

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/vibo.git
cd vibo
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:

- Run the SQL migrations in `supabase/migrations/` in order:
  - `001_add_features.sql`
  - `002_storage_setup.sql`
  - `003_fix_oauth_trigger.sql`
  - `004_add_match_time.sql`

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
vibo/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (app)/        # Protected app routes
│   │   ├── (auth)/       # Authentication routes
│   │   └── invite/       # Match invitation routes
│   ├── components/       # React components
│   │   ├── auth/         # Authentication components
│   │   ├── home/         # Home page components
│   │   ├── layout/       # Layout components
│   │   ├── match/        # Match-related components
│   │   ├── profile/      # Profile components
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Utility functions
│   │   └── supabase/     # Supabase client configuration
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── migrations/       # Database migrations
│   └── schema.sql        # Database schema
└── public/               # Static assets
```

## 🔐 Authentication

The app supports multiple authentication methods:

- Email/Password
- OAuth providers (Google, GitHub)
- Magic links

See `OAUTH_SETUP.md` for detailed OAuth configuration instructions.

## 📊 ELO System

The ELO rating system automatically calculates player rankings based on:

- Match results
- Opponent strength
- Expected vs actual performance

Categories are automatically assigned based on ELO scores:

- **8va**: < 1100
- **7ma**: 1100 - 1299
- **6ta**: 1300 - 1499
- **5ta**: 1500 - 1699
- **4ta**: 1700 - 1899
- **3ra**: 1900 - 2099
- **2da**: 2100 - 2299
- **1ra**: ≥ 2300

## 🎯 Usage

1. **Sign Up**: Create an account or sign in with OAuth
2. **Complete Profile**: Set your username, name, and initial category
3. **Register Matches**: Add new matches with scores and players
4. **Track Progress**: View your statistics and ranking on the home page
5. **Invite Players**: Share match invitations via WhatsApp or links
6. **View History**: Browse all your matches in the matches section
7. **Check Rankings**: See where you stand in the global leaderboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary.

## 👤 Author

Facundo Pérez Brizuela

---

# 🏓 Vibo

Una aplicación web progresiva (PWA) moderna para rastrear partidos de pádel, calcular rankings ELO y competir con amigos.

## 📱 Funcionalidades

### Funcionalidad Principal

- **Registro de Partidos**: Registra partidos de pádel con puntuación detallada (sets, juegos)
- **Sistema de Ranking ELO**: Cálculo automático de ELO basado en resultados de partidos
- **Categorías de Jugadores**: Sistema de ranking argentino de pádel (categorías de 8va a 1ra)
- **Perfiles de Jugadores**: Rastrea estadísticas incluyendo partidos jugados, victorias, porcentaje de victorias y puntuación ELO
- **Ranking Global**: Ve tu posición en la tabla de clasificación global
- **Historial de Partidos**: Visualiza y edita todos tus partidos anteriores
- **Jugadores Fantasma**: Agrega jugadores sin cuenta a tus partidos

### Funciones Sociales

- **Invitaciones a Partidos**: Invita jugadores a confirmar partidos mediante enlaces compartibles
- **Integración con WhatsApp**: Comparte resultados de partidos e invitaciones directamente a través de WhatsApp
- **Gestión de Jugadores**: Crea y gestiona jugadores fantasma para partidos casuales

### Experiencia de Usuario

- **Aplicación Web Progresiva**: Instalable en dispositivos móviles con soporte offline
- **Notificaciones Push**: Recibe notificaciones para invitaciones a partidos y actualizaciones
- **Diseño Responsivo**: Optimizado para móvil y escritorio
- **Autenticación OAuth**: Inicia sesión con Google, GitHub o email
- **Personalización de Perfil**: Sube avatares y personaliza tu perfil

### Funciones Avanzadas

- **Configuración de Partidos**: Configuración de Punto de Oro y Super Tie-break
- **Seguimiento de Tiempo**: Registra cuándo se jugaron los partidos
- **Seguimiento de Ubicación**: Agrega información de ubicación a los partidos
- **Notas de Partidos**: Agrega notas y comentarios a los partidos

## 🛠️ Tecnologías Utilizadas

### Frontend

- **Next.js 15** - Framework React con App Router
- **React 18** - Biblioteca de UI
- **TypeScript** - Desarrollo con tipos seguros
- **Tailwind CSS** - Framework CSS utility-first
- **Radix UI** - Componentes primitivos accesibles
- **Lucide React** - Biblioteca de iconos

### Backend y Base de Datos

- **Supabase** - Backend como Servicio
  - Base de datos PostgreSQL
  - Autenticación (OAuth + Email)
  - Row Level Security (RLS)
  - Suscripciones en tiempo real
  - Almacenamiento para avatares

### PWA y Notificaciones

- **Service Workers** - Soporte offline y caché
- **Web Push API** - Notificaciones push
- **Manifest.json** - Configuración PWA

### Herramientas de Desarrollo

- **ESLint** - Linting de código
- **PostCSS** - Procesamiento de CSS
- **TypeScript** - Verificación de tipos estáticos

## 📸 Capturas de Pantalla

> **Nota**: Agrega capturas de pantalla de tu aplicación aquí. Considera incluir:
>
> - Pantalla de inicio con estadísticas
> - Formulario de registro de partidos
> - Página de ranking
> - Página de perfil
> - Vista de detalles de partido

## 🚀 Comenzar

### Prerrequisitos

- Node.js 18+ y npm
- Cuenta y proyecto de Supabase

### Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/yourusername/vibo.git
cd vibo
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno:
   Crea un archivo `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

4. Configura la base de datos:

- Ejecuta las migraciones SQL en `supabase/migrations/` en orden:
  - `001_add_features.sql`
  - `002_storage_setup.sql`
  - `003_fix_oauth_trigger.sql`
  - `004_add_match_time.sql`

5. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

6. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
vibo/
├── src/
│   ├── app/              # Páginas del App Router de Next.js
│   │   ├── (app)/        # Rutas protegidas de la app
│   │   ├── (auth)/       # Rutas de autenticación
│   │   └── invite/       # Rutas de invitación a partidos
│   ├── components/       # Componentes React
│   │   ├── auth/         # Componentes de autenticación
│   │   ├── home/         # Componentes de la página de inicio
│   │   ├── layout/       # Componentes de diseño
│   │   ├── match/        # Componentes relacionados con partidos
│   │   ├── profile/      # Componentes de perfil
│   │   └── ui/           # Componentes UI reutilizables
│   ├── lib/              # Funciones de utilidad
│   │   └── supabase/     # Configuración del cliente Supabase
│   └── types/            # Definiciones de tipos TypeScript
├── supabase/
│   ├── migrations/       # Migraciones de base de datos
│   └── schema.sql        # Esquema de base de datos
└── public/               # Archivos estáticos
```

## 🔐 Autenticación

La aplicación admite múltiples métodos de autenticación:

- Email/Contraseña
- Proveedores OAuth (Google, GitHub)
- Enlaces mágicos

Consulta `OAUTH_SETUP.md` para instrucciones detalladas de configuración OAuth.

## 📊 Sistema ELO

El sistema de puntuación ELO calcula automáticamente los rankings de los jugadores basándose en:

- Resultados de partidos
- Fortaleza del oponente
- Rendimiento esperado vs real

Las categorías se asignan automáticamente según las puntuaciones ELO:

- **8va**: < 1100
- **7ma**: 1100 - 1299
- **6ta**: 1300 - 1499
- **5ta**: 1500 - 1699
- **4ta**: 1700 - 1899
- **3ra**: 1900 - 2099
- **2da**: 2100 - 2299
- **1ra**: ≥ 2300

## 🎯 Uso

1. **Regístrate**: Crea una cuenta o inicia sesión con OAuth
2. **Completa tu Perfil**: Establece tu nombre de usuario, nombre y categoría inicial
3. **Registra Partidos**: Agrega nuevos partidos con puntuaciones y jugadores
4. **Rastrea tu Progreso**: Visualiza tus estadísticas y ranking en la página de inicio
5. **Invita Jugadores**: Comparte invitaciones a partidos vía WhatsApp o enlaces
6. **Visualiza el Historial**: Navega por todos tus partidos en la sección de partidos
7. **Consulta los Rankings**: Ve dónde te encuentras en la tabla de clasificación global

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor, siéntete libre de enviar un Pull Request.

## 📝 Licencia

Este proyecto es privado y propietario.

## 👤 Autor

Facundo Pérez Brizuela
