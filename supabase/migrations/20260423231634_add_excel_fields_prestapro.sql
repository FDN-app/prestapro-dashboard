ALTER TABLE public.prestamos
ADD COLUMN comision_cancelados numeric NULL,
ADD COLUMN renovados numeric NULL;

ALTER TABLE public.pagos
ADD COLUMN es_cobro_directo_admin boolean DEFAULT false;
