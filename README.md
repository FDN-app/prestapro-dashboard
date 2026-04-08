# PrestaPro Dashboard

PrestaPro es una aplicación web moderna diseñada para la gestión integral de préstamos y cobranzas. Proporciona una interfaz intuitiva (Dashboard) tanto para administradores como para cobradores, facilitando el seguimiento de clientes, créditos activos, pagos y finanzas generales.

## 🚀 Características Principales

- **Gestión de Clientes (`/clientes`)**: Registro, edición y visualización detallada del perfil y el historial crediticio de cada usuario.
- **Administración de Préstamos (`/nuevo-prestamo`)**: Creación de nuevos préstamos con seguimiento de saldos, cuotas e intereses.
- **Control de Cobros (`/cobros-pendientes`, `/registrar-pago`)**: Herramientas específicas para registrar recaudaciones diarias y revisar cuotas atrasadas.
- **Módulo de Cobradores (`/cobradores`)**: Gestión de personal de cobranza, seguimiento de su desempeño o asignación de carteras.
- **Registro de Auditoría (`/auditoria`)**: Historial de acciones dentro del sistema para mantener trazabilidad y seguridad sobre las operaciones.
- **Roles y Accesos**: Sistema basado en roles para asegurar que cada miembro de la organización solo vea la información correspondiente a sus funciones. 
- **Panel de Control (Dashboard)**: Visualización general de métricas clave (ingresos, préstamos activos, metas, etc.).

## 🛠️ Tecnologías Utilizadas

Este proyecto fue generado y estructurado utilizando un stack moderno para el Frontend:

*   **[React 18](https://react.dev/)**, biblioteca de interfaces de usuario.
*   **[Vite](https://vitejs.dev/)**, para empaquetado, un entorno de desarrollo rápido y eficiente.
*   **[TypeScript](https://www.typescriptlang.org/)**, para tipado estático, mejorando la experiencia del desarrollador y la solidez del código.
*   **[Tailwind CSS](https://tailwindcss.com/)**, framework de CSS de utilidades para estilar la interfaz rápidamente.
*   **[shadcn/ui](https://ui.shadcn.com/)** y **Radix UI**, para una librería de componentes accesibles y personalizables de primer nivel.
*   **[React Router Dom](https://reactrouter.com/)**, para el enrutamiento de páginas (SPA).
*   **[React Query](https://tanstack.com/query/v5)** (`@tanstack/react-query`), para el almacenamiento en caché y conexión con apis/datos asíncronos.
*   **[Recharts](https://recharts.org/)**, para presentar datos métricos visuales en el panel principal.

## 📦 Instalación y Desarrollo Local

1. Clona el repositorio a tu máquina local.
2. Abre la terminal en el directorio del proyecto (e.g. `prestapro-dashboard`).
3. Instala las dependencias iniciales usando tu gestor de paquetes (npm):
   ```bash
   npm install
   ```
4. Levanta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
5. Abre en el navegador la dirección que indica Vite (usualmente `http://localhost:5173/`).

## ⚙️ Comandos Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila la aplicación para producción.
- `npm run preview`: Da una vista previa local de la compilación de producción.
- `npm run lint`: Evalúa el código buscando problemas de convención y limpieza (`ESLint`).
