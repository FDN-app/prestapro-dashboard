# Informe de Desarrollo y Funcionalidades - PrestaPro

**Fecha de actualización:** 16 de Abril, 2026
**Estado del Proyecto:** Operativo / Fase de Refinamiento Avanzado

---

## 1. Visión General
PrestaPro es una solución integral diseñada para la gestión profesional de carteras de préstamos y cobranzas. El sistema abandona la dependencia en hojas de cálculo tradicionales para ofrecer control en tiempo real, auditoría inmutable y automatización financiera.

---

## 2. Módulos y Funcionalidades Principales

### 2.1 Dashboard Administrativo (Centro de Control)
- **Métricas Financieras:** Visualización de Capital Propio, Capital Colocado, Intereses por Cobrar y Ganancia Estimada.
- **Semáforo de Cartera:** Indicadores visuales automáticos sobre la salud de los préstamos (Verde: Al día, Amarillo: Atraso leve, Rojo: Mora crítica).
- **Navegación Compacta:** Uso de "Progressive Disclosure" para mantener una interfaz limpia en dispositivos móviles.

### 2.2 Gestión de Clientes y Préstamos
- **Expediente de Cliente:** Historial completo de créditos, comportamiento de pago y contador de renovaciones.
- **Motor de Préstamos:** Cálculo automático de cuotas según frecuencia (Diario, Semanal, Quincenal, Mensual o Personalizado).
- **Comisiones y Gastos:** Soporte para descuentos de comisiones fijos al momento de la entrega.
- **Refinanciamiento y Extensiones:** Capacidad de convertir saldos vencidos en nuevos préstamos o extender plazos de cuotas existentes.

### 2.3 Motor Financiero "Cascada" (Waterfall)
- **Distribución de Pagos:** Implementación de lógica inteligente que distribuye automáticamente los abonos del cliente entre las cuotas pendientes, priorizando intereses y capital vencido.
- **Tracking de Saldos:** Actualización instantánea del saldo insoluto tras cada registro de pago.
- **Intereses por Mora:** Cálculo dinámico de recargos por atraso según la configuración de la empresa.

### 2.4 Control de Cobradores y Rendición
- **Roles y Permisos:** Diferenciación estricta entre Administrador (Control total) y Cobrador (Solo registro de calle).
- **Sistema de Rendición:** Flujo de validación donde el Admin confirma el dinero físico recibido vs. lo registrado digitalmente por el cobrador.
- **Alertas de Discrepancia:** Indicadores rojos ante diferencias entre lo cobrado y lo rendido.

---

## 3. Innovaciones Recientes (Últimos Sprints)

### 3.1 Gestión de Suscripciones
- **Ciclo de Vida:** Implementación de estados robustos (**Activo, Pausado, Cancelado**).
- **Flujo "Pagué":** Proceso automatizado para que el usuario reporte pagos y se actualice el estado de la suscripción.
- **Reactivación:** Flujo simplificado para reanudar servicios pausados manteniendo el historial.

### 3.2 Integración con Telegram (Bot Oficial)
- **Notificaciones Real-time:** Alertas instantáneas al Admin cuando se registra un pago en el sistema.
- **Resúmenes Diarios:** Ejecución de *Cron Jobs* vía Edge Functions para enviar un reporte matutino con vencimientos del día y mora acumulada.
- **Configuración Personalizable:** Toggles en la sección de ajustes para habilitar/deshabilitar alertas administrativas.

### 3.3 Gestión de Capital
- **Tracking de Flujo:** Registro de entradas y salidas de capital (Inyecciones de dinero vs. Préstamos otorgados).
- **Hook `useCapital`:** Lógica centralizada para asegurar que los cálculos de disponibilidad sean consistentes en toda la app.

---

## 4. Seguridad e Infraestructura

- **Backup y Restauración:**
  - Exportación automática y manual a archivos **Excel (.xlsx)** almacenados en Supabase Storage.
  - Capacidad de restauración total desde un archivo Excel validado.
- **Auditoría Inmutable:** Registro de cada acción (quién, qué y cuándo) en un log que nadie puede editar.
- **Seguridad RLS (Row Level Security):** Protección a nivel de base de datos para asegurar que cada usuario solo acceda a la información permitida.
- **Persistence de Sesión:** Solución a problemas de cierre de sesión inesperado para una experiencia fluida.

---

## 5. Arquitectura Técnica
- **Frontend:** React + TypeScript + Vite.
- **Estilos:** Tailwind CSS con enfoque "Mobile First" y estética Premium.
- **Backend/Base de Datos:** Supabase (PostgreSQL), Edge Functions (Deno Runtime) y Storage.
- **Manejo de Estados:** Hooks personalizados y Context API para sincronización global.

---

## 6. Estado Actual y Próximos Pasos
Actualmente, el sistema cuenta con todas las funciones core operativas (MVP++) y ha integrado con éxito las capas de automatización (Telegram) y gestión financiera avanzada (Cascada/Suscripciones).

**Próximos objetivos:**
- Refinamiento de reportes gráficos avanzados (Charts.js/Recharts).
- Optimización de performance en listas de clientes masivas.
- Implementación de notificaciones push directas (PWA).
