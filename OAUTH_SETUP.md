# Configuración de OAuth con Google

## Pasos para Configurar Google OAuth en Supabase

### 1. Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services > Credentials**
4. Click en **Create Credentials > OAuth client ID**
5. Si es la primera vez, configura la pantalla de consentimiento OAuth:
   - Selecciona **External** (o Internal si tenés Google Workspace)
   - Completa la información requerida
   - Agrega tu email como test user si está en modo testing
6. Selecciona **Web application** como tipo de aplicación
7. Configura las URLs autorizadas:
   - **Authorized JavaScript origins**:
     - `https://YOUR_PROJECT.supabase.co`
     - `http://localhost:3000` (para desarrollo local)
   - **Authorized redirect URIs**:
     - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (para desarrollo local)
8. Click en **Create**
9. Copia el **Client ID** y **Client Secret**

### 2. Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com/)
2. Navega a **Authentication > Providers**
3. Busca **Google** en la lista de providers
4. Habilita el toggle de Google
5. Pega el **Client ID** (de Google Cloud Console)
6. Pega el **Client Secret** (de Google Cloud Console)
7. Click en **Save**

### 3. Verificación

Después de configurar:

1. Reiniciá el servidor de desarrollo: `npm run dev`
2. Ve a `/login` o `/signup`
3. Click en **"Continuar con Google"**
4. Deberías ser redirigido a Google para autenticarte
5. Después de autenticarte:
   - Si es tu primera vez → serás redirigido a `/complete-profile` para seleccionar tu categoría
   - Si ya tenés cuenta → serás redirigido al dashboard

## Notas Importantes

- **Redirect URLs**: La URL de callback debe ser exactamente `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- **Desarrollo local**: Para desarrollo, también necesitás agregar `http://localhost:3000` en los orígenes autorizados
- **Pantalla de consentimiento**: Google requiere que configures la pantalla de consentimiento antes de crear OAuth credentials
- **Modo Testing**: Si tu app está en modo testing, solo los usuarios agregados como "Test users" podrán autenticarse

## Troubleshooting

### Error "redirect_uri_mismatch"

- Verificá que las URLs en Google Cloud Console coincidan exactamente con las configuradas en Supabase
- Asegurate de incluir tanto la versión con `https://` como `http://localhost:3000` para desarrollo

### Error "access_denied"

- Verificá que la pantalla de consentimiento esté configurada correctamente
- Si está en modo testing, agregá tu email como test user

### No aparece el botón de Google

- Verificá que el provider esté habilitado en Supabase Dashboard
- Asegurate de que el Client ID y Client Secret sean correctos
- Revisá la consola del navegador para errores

## Producción

Cuando despliegues a producción:

1. Agregá tu dominio de producción a las URLs autorizadas en Google Cloud Console
2. Actualizá el redirect URI en Supabase si es necesario
3. Verificá que la pantalla de consentimiento esté publicada (no en modo testing)
