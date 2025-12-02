# Configuración de Email y Push Notifications

Esta guía explica cómo configurar el servicio de email (Resend) y las notificaciones push para Vibo.

## 📧 Configuración de Email con Resend

### 1. Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta gratuita (incluye 3,000 emails/mes)
3. Verifica tu dominio o usa el dominio de prueba

### 2. Obtener API Key

1. Ve a [API Keys](https://resend.com/api-keys)
2. Crea una nueva API key
3. Copia la clave (solo se muestra una vez)

### 3. Configurar variables de entorno

Agrega estas variables a tu archivo `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Vibo <noreply@tudominio.com>
```

**Nota:** Si usas el dominio de prueba de Resend, el formato será:

```env
RESEND_FROM_EMAIL=Vibo <onboarding@resend.dev>
```

### 4. Instalar dependencia

```bash
npm install resend
```

## 🔔 Configuración de Push Notifications

### 1. Generar VAPID Keys

Las VAPID keys son necesarias para autenticar las notificaciones push. Genera un par de claves:

```bash
npx web-push generate-vapid-keys
```

Esto generará algo como:

```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI...
Private Key: V8t5XbKzJz...
```

### 2. Configurar variables de entorno

Agrega estas variables a tu archivo `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_public_key_aqui
VAPID_PRIVATE_KEY=tu_private_key_aqui
VAPID_SUBJECT=mailto:tucorreo@ejemplo.com
```

**Importante:**

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` debe estar disponible en el cliente (prefijo `NEXT_PUBLIC_`)
- `VAPID_PRIVATE_KEY` debe mantenerse secreto (solo en servidor)
- `VAPID_SUBJECT` debe ser un email válido o `mailto:` URL

### 3. Instalar dependencia

```bash
npm install web-push
npm install --save-dev @types/web-push
```

## 🚀 Verificación

### Verificar Email

1. Invita a un miembro del staff desde el dashboard del club
2. Revisa que el email llegue correctamente
3. Verifica que el link de invitación funcione

### Verificar Push Notifications

1. Asegúrate de que el usuario tenga permisos de notificaciones habilitados
2. Cuando se acepte una invitación, deberías recibir una notificación push
3. Revisa la consola del navegador por errores

## 📝 Notas Importantes

### Email

- Resend tiene un límite de 3,000 emails/mes en el plan gratuito
- Los emails se envían desde la API route `/api/send-email`
- Si el email falla, la invitación aún se crea (solo se registra el error)

### Push Notifications

- Las notificaciones push requieren HTTPS en producción
- Los usuarios deben dar permiso explícito para recibir notificaciones
- Las suscripciones se guardan en la tabla `push_subscriptions`
- Las suscripciones inválidas se eliminan automáticamente

## 🔧 Troubleshooting

### Email no se envía

1. Verifica que `RESEND_API_KEY` esté configurado correctamente
2. Verifica que `RESEND_FROM_EMAIL` tenga el formato correcto
3. Revisa los logs de la consola del servidor
4. Verifica tu cuenta de Resend por límites o problemas

### Push Notifications no funcionan

1. Verifica que las VAPID keys estén configuradas
2. Verifica que el usuario tenga permisos de notificaciones
3. Revisa que el service worker esté registrado (`/sw.js`)
4. Verifica que las suscripciones estén guardadas en la base de datos
5. Revisa la consola del navegador por errores

## 📚 Recursos

- [Resend Documentation](https://resend.com/docs)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
