-- Migración: Crear RPC eliminar_cliente_completo para borrado físico en cascada
-- Timestamp: 20260723233200

CREATE OR REPLACE FUNCTION eliminar_cliente_completo(p_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo admin puede ejecutar esta función
  IF NOT EXISTS (
    SELECT 1 FROM perfiles 
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar clientes';
  END IF;

  -- Verificar que el cliente esté archivado
  IF NOT EXISTS (
    SELECT 1 FROM clientes 
    WHERE id = p_cliente_id AND archivado = true
  ) THEN
    RAISE EXCEPTION 'Solo se pueden eliminar clientes archivados';
  END IF;

  -- Borrar en cascada, en orden correcto
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

GRANT EXECUTE ON FUNCTION eliminar_cliente_completo(uuid) TO authenticated;
