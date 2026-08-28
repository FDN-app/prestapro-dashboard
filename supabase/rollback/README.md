# Reversión de cambios financieros — 2026-08-28

Antes del despliegue se debe generar un backup remoto completo y guardar su ubicación.

## Si una prueba falla después de comenzar a usar las funciones

1. Volver a desplegar la versión anterior del frontend.
2. Ejecutar `20260828_disable_financial_features.sql`.
3. Conservar columnas, tablas y registros para diagnóstico; este procedimiento no borra datos.
4. Volver a desplegar la versión anterior de `telegram-cron` si el fallo corresponde a Telegram.

## Si no llegó a registrarse ninguna mora o renovación

Después de retirar el frontend nuevo se puede ejecutar
`20260828_remove_unused_financial_features.sql`. El script se niega a borrar estructuras si
encuentra información creada por las funciones nuevas.

Nunca ejecutar el script de limpieza total sin verificar primero el backup y los conteos de
`moras_manuales` y préstamos con `renovado_desde_id`.
