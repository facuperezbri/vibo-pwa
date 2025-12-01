-- ============================================
-- Vibo - Complete Database Cleanup Script
-- ============================================
-- This script deletes ALL data from the database
-- Use with caution! This is irreversible.
-- ============================================

BEGIN;

-- Limpiar tablas en orden de dependencias
-- (TRUNCATE CASCADE maneja las foreign keys automáticamente)

-- 1. Tablas que dependen de matches
TRUNCATE TABLE match_invitations CASCADE;

-- 2. Tablas que dependen de players y profiles
TRUNCATE TABLE matches CASCADE;

-- 3. Tablas que dependen de profiles
TRUNCATE TABLE push_subscriptions CASCADE;
TRUNCATE TABLE notifications CASCADE;

-- 4. Tabla players (puede tener referencias a profiles)
TRUNCATE TABLE players CASCADE;

-- 5. Borrar usuarios de autenticación
-- Esto también borra profiles por CASCADE (profiles.id REFERENCES auth.users(id) ON DELETE CASCADE)
-- Y por lo tanto también borra push_subscriptions y notifications que tienen CASCADE con profiles
DELETE FROM auth.users;

-- 6. Limpiar storage (avatars)
DELETE FROM storage.objects WHERE bucket_id = 'avatars';

COMMIT;

-- ============================================
-- NOTAS:
-- ============================================
-- - Las tablas push_subscriptions y notifications tienen ON DELETE CASCADE
--   con profiles, así que se borrarían automáticamente al borrar auth.users,
--   pero las incluimos explícitamente para mayor claridad y control.
--
-- - El orden es importante: primero las tablas dependientes, luego las principales.
--
-- - TRUNCATE CASCADE es más rápido que DELETE pero puede tener limitaciones
--   con algunas foreign keys complejas. Si encuentras errores, considera usar
--   DELETE en lugar de TRUNCATE.

