BEGIN;

CREATE OR REPLACE FUNCTION eliminar_cliente_completo(p_cliente_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar clientes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM clientes
    WHERE id = p_cliente_id AND archivado = TRUE
  ) THEN
    RAISE EXCEPTION 'Solo se pueden eliminar clientes archivados';
  END IF;

  DELETE FROM pagos WHERE prestamo_id IN (
    SELECT id FROM prestamos WHERE cliente_id = p_cliente_id
  );
  DELETE FROM cuotas WHERE prestamo_id IN (
    SELECT id FROM prestamos WHERE cliente_id = p_cliente_id
  );
  DELETE FROM mensajes_telegram WHERE prestamo_id IN (
    SELECT id FROM prestamos WHERE cliente_id = p_cliente_id
  );
  DELETE FROM prestamos WHERE cliente_id = p_cliente_id;
  DELETE FROM clientes WHERE id = p_cliente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION eliminar_cliente_completo(UUID) TO authenticated;

COMMIT;
