-- Migración para agregar columna archivado a la tabla prestamos
ALTER TABLE public.prestamos ADD COLUMN archivado BOOLEAN NOT NULL DEFAULT FALSE;
