# PrestaPro - Documento Maestro

**Sistema de gestión de préstamos y cobranzas**
**Versión:** 1.0
**Fecha:** Abril 2026
**Estado:** Activo 

## 1. Visión del Producto
### 1.1 Problema
Un prestamista independiente o pequeña agencia pierde control de saldos y vencimientos al usar cuadernos o Excel.
### 1.2 Solución
PrestaPro es una app especializada, sencilla pero estricta, que automatiza el cálculo de cuotas y saldos en tiempo real.
### 1.3 Usuario Target
- Prestamista independiente (Administrador).
- Cobrador (empleado que en la calle registra pagos).
### 1.4 Principios de diseño
- Mobile First. Simplicidad. Control total. Flexibilidad.

## 2. Roles y Permisos
- REGLA CRÍTICA: Nadie, excepto el sistema, borra datos de auditoría. El Admin rige el sistema y los Cobradores tienen alcance limitado.

## 3. Funcionalidades Detalladas
### 3.1 Dashboard Principal
- Pantalla inicial con métricas, semáforo de cartera y panel financiero (Capital disponible, colocado, etc.).
### 3.2 Gestión de Clientes
- Alta de cliente, historial crediticio, y calificación implícita.
### 3.3 Gestión de Préstamos
- Creación de préstamo con cálculo automático de cuotas y fechas.
- Frecuencias de pago soportadas: Semanal (7 días), Quincenal (14 días), Mensual (30 días), y Personalizado (X días dictados por el administrador).
- Opción de descontar una **comisión** (monto fijo).
- Se mantiene un **contador de renovaciones** que hereda e incrementa si un préstamo proviene de un refinanciamiento.
### 3.4 Registro de Pagos
- Seleccionar cliente, monto pagado, fecha, método, actualización de saldo.
### 3.5 Interés por Mora
- Cálculo automático de interés en caso de atraso.
### 3.6 Refinanciamiento
- Solo admin. Saldo pendiente se convierte en nuevo préstamo.
### 3.7 Liquidación Anticipada
- Cancelación total del préstamo antes de tiempo.

### 3.8 Sistema de Backup y Restauración
- Backup automático programado (diario o semanal, configurable por el admin).
- El backup genera un archivo Excel (`.xlsx`) con una hoja por tabla: Clientes, Préstamos, Cuotas, Pagos, Capital.
- Se almacena en Supabase Storage.
- Retención configurable: mantiene los últimos 7 backups y elimina el más viejo automáticamente. El admin puede cambiar la cantidad.
- El admin puede descargar cualquier backup desde la app y abrirlo en Excel.
- El admin puede generar un backup manual en cualquier momento con un botón.
- Restauración: el admin sube un Excel de backup, la app valida los datos, muestra resumen ("Se van a restaurar X clientes, X préstamos, X pagos") y el admin confirma antes de ejecutar.
- Solo el admin tiene acceso a backup y restauración.

### 3.9 Cobros por Período y Control de Rendición
- **Cobros por Período**: Vista matricial de clientes vs semanas (u otro período). Muestra cuánto pagó cada cliente en cada semana, con totales por columna y fila. Reemplaza el seguimiento tabular semanal en Excel.
- **Rendición**: El cobrador registra pagos en la calle. El admin visualiza en una sección de "Rendición" qué pagos ingresaron ("Pendiente de rendir") y marca manualmente cuando recibe el dinero físico ("Rendido"). En caso de discrepancias entre lo cobrado y lo rendido, se dispara una alerta visual roja (posible fraude).

### 3.10 Ganancias y Reparto
- **Reporte de Ganancias**: Vista gráfica y detallada de la utilidad neta (intereses cobrados, excluyendo capital devuelto) fragmentada por semana/mes. Solo interactuable y visible por Administradores.
- **Reparto (Comisiones)**: Perfiles configurables para empleados. El admin puede asignar, por ejemplo, un 10% de comisión sobre lo cobrado. El reporte descuenta automáticamente esta comisión de la ganancia neta.

## 4. Filosofía de Diseño UX / UI
- **Todo Colapsable ("Progressive Disclosure")**: Mostrar poca información por defecto. Tablas y listas se reemplazan por tarjetas compactas que revelan detalle exclusivamente al hacer clic.
- **Mobile First**: Cero *scroll* horizontal. Todos los desglose se apilan verticalmente.
- Ocultar reportes financieros, rendiciones y ganancias de las vistas del cobrador.

## 5. Integración Telegram Bot API
- Mensajes al cliente (Recordatorios, Avisos). Alertas al Admin.

## 6. Asistente Inteligente
- Chat integrado vía Claude API u OpenAI.

## 7. Log de Auditoría
- Registro inmutable. NADIE puede editar.

## 8. Arquitectura Técnica
- **Stack:** React, Vite, TS, Tailwind, Supabase (PostgreSQL).
- **Modelo de Datos:** perfiles, clientes, prestamos, cuotas, pagos, capital, log_auditoria, config_telegram.
- **Seguridad:** Row Level Security (RLS), Autenticación obligatoria.

## 9. Flujos Lógicos Core
- Admin crea préstamo $\rightarrow$ App calcula $\rightarrow$ Admin revisa $\rightarrow$ Crea préstamo + cuotas.
- Cobrador registra pago $\rightarrow$ App actualiza monto y saldos.

## 10. Mapa de Pantallas
| Pantalla | Descripción |
| :--- | :--- |
| **Login** | Ingreso al sistema |
| **Dashboard** | Tarjetas resumen de capital y métricas base. Contiene accesos directos colapsables a "Cobros del período", "Rendiciones", y "Ganancias", además de la tabla compacta de Préstamos Activos desplegable. |
| **Cobros por Período** | Tarjeta expandible mostrando totales semanales cobrados. Permite profundizar (clic) a la vista de quién pagó y cuánto por semana. |
| **Rendición** | Resumen de rendición cobrador vs admin. Clickeable para ver el detalle de caja y marcar como "Rendido". |
| **Ganancias** | Muestra ganancia mensual/semanal en gráfico. Clickeable para desglose completo y visualización del cálculo con porcentajes de reparto a empleados. |
| **Clientes** | Alta, detalle e historial del cliente |
| **Préstamo Nuevo** | Simulador y generador atómico del préstamo |
| **Registrar Pago** | Asiento contable de un cobro de cuota |
| **Configuración** | Configuración de empresa, perfiles de reparto de comisiones, Telegram. |
| **Cobradores** | Gestión del personal |
| **Auditoría** | Trazabilidad inmutable de cambios |
| **Backups** | Lista de backups disponibles, descarga, backup manual, restauración desde Excel |

## 10. Alcance: MVP vs Fase 2
### 10.1 MVP (Lanzamiento)
- Login y autenticación
- Dashboard con semáforo y métricas
- CRUD de clientes
- Creación de préstamos atómica
- Registro de pagos (ingreso de dinero)
- Historial crediticio simple
- Roles: Admin y Cobrador
- Log de auditoría
- Interés por mora automático (Fase 1.5)
- Refinanciamiento / Liquidación anticipada (Fase 1.5)
- Responsive (mobile first)
- **Sistema de backup automático y manual con descarga en Excel**
- **Restauración de datos desde backup Excel**

### 10.2 Fase 2 (Post-lanzamiento)
- Integración Telegram Bot API
- Asistente Inteligente
- Múltiples carteras de cobro
- App Nativa PWA
