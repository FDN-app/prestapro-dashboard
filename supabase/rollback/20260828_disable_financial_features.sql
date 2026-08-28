-- REVERSIÓN SEGURA (preferida): deshabilita operaciones nuevas sin borrar datos.
-- Puede ejecutarse aunque ya existan moras o renovaciones registradas.
REVOKE EXECUTE ON FUNCTION agregar_mora_manual(UUID, UUID, TEXT, NUMERIC) FROM authenticated;
REVOKE EXECUTE ON FUNCTION renovar_prestamo_con_descuento(
  UUID, NUMERIC, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, INT, TEXT, INT,
  DATE, DATE, INT, JSONB, NUMERIC
) FROM authenticated;

COMMENT ON FUNCTION agregar_mora_manual(UUID, UUID, TEXT, NUMERIC)
  IS 'DESHABILITADA mediante rollback seguro';
COMMENT ON FUNCTION renovar_prestamo_con_descuento(UUID, NUMERIC, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, INT, TEXT, INT, DATE, DATE, INT, JSONB, NUMERIC)
  IS 'DESHABILITADA mediante rollback seguro';
