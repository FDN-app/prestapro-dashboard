-- Migración para agregar columna archivado a la tabla clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS archivado boolean DEFAULT false;
