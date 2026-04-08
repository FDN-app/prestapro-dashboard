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

## 4. Integración WhatsApp
- Mensajes al cliente (Recordatorios, Avisos). Alertas al Admin.

## 5. Asistente Inteligente
- Chat integrado vía Claude API u OpenAI.

## 6. Log de Auditoría
- Registro inmutable. NADIE puede editar.

## 7. Arquitectura Técnica
- **Stack:** React, Vite, TS, Tailwind, Supabase (PostgreSQL).
- **Modelo de Datos:** perfiles, clientes, prestamos, cuotas, pagos, capital, log_auditoria, config_whatsapp.
- **Seguridad:** Row Level Security (RLS), Autenticación obligatoria.

## 8. Flujos Lógicos Core
- Admin crea préstamo $\rightarrow$ App calcula $\rightarrow$ Admin revisa $\rightarrow$ Crea préstamo + cuotas.
- Cobrador registra pago $\rightarrow$ App actualiza monto y saldos.

## 9. Mapa de Pantallas
| Pantalla | Descripción |
| :--- | :--- |
| **Login** | Ingreso al sistema |
| **Dashboard** | Resumen financiero y la Tabla principal de Préstamos Activos (Cliente, CUIL, Saldo, Crédito, Interés, Cuotas con su frecuencia, Comisión, Renovados y Fecha de inicio). Cada fila es desplegable para mostrar opciones rápidas (modificar porcentaje de interés, cambiar frecuencia como quincenal/sec/pers, detalle pagado vs pendiente, registrar pago, refinanciar, liquidar). |
| **Clientes** | Alta, detalle e historial del cliente |
| **Préstamo Nuevo** | Simulador y generador atómico del préstamo |
| **Registrar Pago** | Asiento contable de un cobro de cuota |
| **Configuración** | Mora, Whatsapp y parámetros generales |
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
- Integración WhatsApp
- Asistente Inteligente
- Múltiples carteras de cobro
- App Nativa PWA
