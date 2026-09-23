# ESTADO_PROYECTO — PrestaPro

> Archivo canónico de estado para `prestapro-dashboard`.

## Última actualización
2026-09-23 — App en producción funcionando bien. Se agregaron mejoras en el detalle de préstamo (ver "Cambios realizados").

## Link de producción
https://prestapro-dashboard.vercel.app

## Resumen rápido para retomar
- Gestión integral de préstamos, clientes, créditos, cuotas, pagos, cobradores y auditoría.
- Stack: React 18, Vite, TypeScript, Tailwind, shadcn, React Router, React Query, Recharts y Supabase.
- Motor financiero “Cascada” implementado en funciones SQL.
- Deploy en Vercel.
- Estado reportado: robustez de producción; 21/22 pruebas en PASS. Fernando confirma que la app anda bien.

## Cambios realizados
- **2026-09-23** — En el detalle del préstamo (vista de cliente) ahora se muestra la tasa de interés cobrada (%), junto al resto de los datos del préstamo. [`src/pages/ClientDetail.tsx`]
- **2026-09-23** — Nuevas opciones de administrador en cada préstamo (solo si no tiene cuotas pagadas ni pagos registrados, para no romper el historial financiero):
  - **Editar préstamo**: permite corregir monto, tasa, comisión, cantidad de cuotas, frecuencia y fecha de inicio. Recalcula el cronograma de cuotas y pide confirmación antes de guardar.
  - **Eliminar préstamo**: borra el préstamo por completo (con confirmación) para el caso de haberlo cargado mal por error, sin necesidad de marcar todas las cuotas como pagadas primero.
  - Funciones nuevas en la base: `editar_prestamo_con_cuotas` y `eliminar_prestamo` (migración `20260923120000_add_editar_eliminar_prestamo.sql`).

## Estado observado
- Rama `main`.
- `TEST-19` corresponde a Embajadores/Marketing, módulo que todavía no existe. Fernando no lo considera prioritario por ahora.
- La raíz contiene scripts de diagnóstico y dumps SQL acumulados; falta `.env.example`.
- Archivo local preexistente sin versionar: `test-off2.mjs`.

## Pendiente inmediato
- Definir alcance y construir Embajadores/Marketing antes de ejecutar `TEST-19` (no urgente).
- Ordenar scripts/dumps con cuidado, sin borrar archivos hasta clasificarlos.
- Crear `.env.example` sin secretos.

## Reglas de trabajo
- Preservar el motor financiero SQL y validar regresiones en cálculos.
- No hacer `git commit` ni `git push` sin permiso explícito de Fernando.
- Registrar acá decisiones, cambios, pruebas y bloqueos.
