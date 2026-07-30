-- Migración para hacer que DNI y Teléfono sean opcionales en la tabla clientes
ALTER TABLE public.clientes ALTER COLUMN dni DROP NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN telefono DROP NOT NULL;
