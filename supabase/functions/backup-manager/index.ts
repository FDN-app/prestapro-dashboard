import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import ExcelJS from "npm:exceljs@4.4.0";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// TODO: actualizar con dominio definitivo de Vercel antes de producción
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://prestapro-dashboard.vercel.app",
];

const corsHeaders = (origin: string | null) => {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};

// ─── FORMATEO ─────────────────────────────────────────────────────────────────
const formatDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return `$${Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const boolToSiNo = (value: boolean | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return value ? "Sí" : "No";
};

// ─── ESTILO DE ENCABEZADOS ────────────────────────────────────────────────────
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDCE6F1" }, // Azul muy claro
};

const applyHeaderStyle = (
  sheet: ExcelJS.Worksheet,
  columnCount: number
): void => {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FF1F497D" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF9DC3E6" } },
    };
  });
  headerRow.height = 22;

  // Fila fija al hacer scroll
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // Filtros automáticos en encabezado
  const lastCol = String.fromCharCode(64 + columnCount);
  sheet.autoFilter = { from: "A1", to: `${lastCol}1` };
};

// ─── TIPOS DE COLUMNA ─────────────────────────────────────────────────────────
type ColType = "text" | "date" | "currency" | "number" | "boolean" | "json";

interface ColDef {
  header: string;
  key: string;
  width: number;
  type: ColType;
}

// ─── CONSTRUIR UNA HOJA DE DATOS ──────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
const buildSheet = (
  wb: ExcelJS.Workbook,
  title: string,
  columns: ColDef[],
  rows: Record<string, unknown>[]
): void => {
  const sheet = wb.addWorksheet(title);

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  for (const row of rows) {
    const rowData: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = row[col.key];
      switch (col.type) {
        case "date":
          rowData[col.key] = formatDate(raw as string);
          break;
        case "currency":
          rowData[col.key] = formatCurrency(raw as number);
          break;
        case "boolean":
          rowData[col.key] = boolToSiNo(raw as boolean);
          break;
        case "json":
          rowData[col.key] = raw ? JSON.stringify(raw) : "";
          break;
        default:
          rowData[col.key] = raw ?? "";
      }
    }
    sheet.addRow(rowData);
  }

  applyHeaderStyle(sheet, columns.length);
};

// ─── DEFINICIÓN DE COLUMNAS POR TABLA ────────────────────────────────────────
const COLUMNS: Record<string, ColDef[]> = {
  clientes: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Nombre Completo", key: "nombre_completo", width: 28, type: "text" },
    { header: "DNI", key: "dni", width: 14, type: "text" },
    { header: "Teléfono", key: "telefono", width: 16, type: "text" },
    { header: "Dirección", key: "direccion", width: 28, type: "text" },
    { header: "Estado", key: "estado", width: 12, type: "text" },
    { header: "Notas", key: "notas", width: 30, type: "text" },
    { header: "Creado En", key: "creado_en", width: 14, type: "date" },
    { header: "Telegram Chat ID", key: "telegram_chat_id", width: 20, type: "text" },
    { header: "Creado Por (ID)", key: "creado_por", width: 38, type: "text" },
  ],
  prestamos: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Cliente ID", key: "cliente_id", width: 38, type: "text" },
    { header: "Monto Original", key: "monto_original", width: 16, type: "currency" },
    { header: "Saldo Pendiente", key: "saldo_pendiente", width: 16, type: "currency" },
    { header: "Tasa de Interés (%)", key: "tasa_interes", width: 18, type: "number" },
    { header: "Tipo Interés", key: "tipo_interes", width: 16, type: "text" },
    { header: "Cant. Cuotas", key: "cantidad_cuotas", width: 14, type: "number" },
    { header: "Frecuencia Pago", key: "frecuencia_pago", width: 16, type: "text" },
    { header: "Frecuencia (Días)", key: "frecuencia_dias", width: 16, type: "number" },
    { header: "Fecha Inicio", key: "fecha_inicio", width: 14, type: "date" },
    { header: "Fecha 1° Cuota", key: "fecha_primera_cuota", width: 16, type: "date" },
    { header: "Estado", key: "estado", width: 14, type: "text" },
    { header: "Comisión", key: "comision", width: 14, type: "currency" },
    { header: "Renovaciones", key: "cantidad_renovaciones", width: 14, type: "number" },
    { header: "Notas", key: "notas", width: 30, type: "text" },
    { header: "Creado En", key: "creado_en", width: 14, type: "date" },
    { header: "Creado Por (ID)", key: "creado_por", width: 38, type: "text" },
  ],
  cuotas: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Préstamo ID", key: "prestamo_id", width: 38, type: "text" },
    { header: "N° Cuota", key: "numero_cuota", width: 10, type: "number" },
    { header: "Monto Cuota", key: "monto_cuota", width: 14, type: "currency" },
    { header: "Monto Cobrado", key: "monto_cobrado", width: 14, type: "currency" },
    { header: "Fecha Vencimiento", key: "fecha_vencimiento", width: 16, type: "date" },
    { header: "Estado", key: "estado", width: 12, type: "text" },
    { header: "Fecha de Pago", key: "fecha_pago", width: 16, type: "date" },
    { header: "Monto Mora", key: "monto_mora", width: 14, type: "currency" },
    { header: "Fecha Última Mora", key: "fecha_ultima_mora", width: 16, type: "date" },
  ],
  pagos: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Cuota ID", key: "cuota_id", width: 38, type: "text" },
    { header: "Préstamo ID", key: "prestamo_id", width: 38, type: "text" },
    { header: "Cobrador ID", key: "cobrador_id", width: 38, type: "text" },
    { header: "Monto Pagado", key: "monto_pagado", width: 14, type: "currency" },
    { header: "Método de Pago", key: "metodo_pago", width: 16, type: "text" },
    { header: "Destino Caja", key: "destino_caja", width: 16, type: "text" },
    { header: "Notas", key: "notas", width: 28, type: "text" },
    { header: "Fecha de Pago", key: "fecha_pago", width: 16, type: "date" },
  ],
  capital: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Tipo", key: "tipo", width: 30, type: "text" },
    { header: "Monto", key: "monto", width: 14, type: "currency" },
    { header: "Fecha", key: "fecha", width: 16, type: "date" },
    { header: "Referencia ID", key: "referencia_id", width: 38, type: "text" },
    { header: "Usuario ID", key: "usuario_id", width: 38, type: "text" },
    { header: "Descripción", key: "descripcion", width: 35, type: "text" },
  ],
  perfiles: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Email", key: "email", width: 28, type: "text" },
    { header: "Nombre Completo", key: "nombre_completo", width: 24, type: "text" },
    { header: "Rol", key: "rol", width: 12, type: "text" },
    { header: "Comisión (%)", key: "comision_porcentaje", width: 14, type: "number" },
    { header: "Creado En", key: "creado_en", width: 14, type: "date" },
  ],
  suscripciones: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Settings ID", key: "settings_id", width: 38, type: "text" },
    { header: "Estado", key: "estado", width: 14, type: "text" },
    { header: "Fecha Inicio", key: "fecha_inicio", width: 16, type: "date" },
    { header: "Fecha Vencimiento", key: "fecha_vencimiento", width: 18, type: "date" },
    { header: "Actualizado En", key: "updated_at", width: 16, type: "date" },
  ],
  pagos_suscripcion: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Suscripción ID", key: "suscripcion_id", width: 38, type: "text" },
    { header: "Monto", key: "monto", width: 14, type: "currency" },
    { header: "Reportado Por (ID)", key: "reportado_por", width: 38, type: "text" },
    { header: "Validado Por Admin (ID)", key: "validado_por_admin", width: 38, type: "text" },
    { header: "Fecha Reporte", key: "fecha_reporte", width: 16, type: "date" },
    { header: "Fecha Validación", key: "fecha_validacion", width: 16, type: "date" },
    { header: "Estado", key: "estado", width: 14, type: "text" },
  ],
  log_auditoria: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Usuario ID", key: "usuario_id", width: 38, type: "text" },
    { header: "Acción", key: "accion", width: 22, type: "text" },
    { header: "Entidad", key: "entidad", width: 20, type: "text" },
    { header: "Entidad ID", key: "entidad_id", width: 38, type: "text" },
    { header: "Detalles (JSON)", key: "detalles", width: 50, type: "json" },
    { header: "Fecha", key: "fecha", width: 16, type: "date" },
  ],
  mensajes_telegram: [
    { header: "ID", key: "id", width: 38, type: "text" },
    { header: "Cliente ID", key: "cliente_id", width: 38, type: "text" },
    { header: "Préstamo ID", key: "prestamo_id", width: 38, type: "text" },
    { header: "Tipo Mensaje", key: "tipo_mensaje", width: 22, type: "text" },
    { header: "Contenido", key: "contenido", width: 50, type: "text" },
    { header: "Estado", key: "estado", width: 12, type: "text" },
    { header: "Creado En", key: "created_at", width: 16, type: "date" },
  ],
};

// ─── CONSULTAS A LA BASE DE DATOS ────────────────────────────────────────────
const fetchAllData = async (supabase: ReturnType<typeof createClient>) => {
  const results = await Promise.all([
    supabase.from("clientes").select("*").order("creado_en", { ascending: true }),
    supabase.from("prestamos").select("*").order("creado_en", { ascending: true }),
    supabase.from("cuotas").select("*").order("fecha_vencimiento", { ascending: true }),
    supabase.from("pagos").select("*").order("fecha_pago", { ascending: true }),
    supabase.from("capital").select("*").order("fecha", { ascending: true }),
    supabase.from("perfiles").select("*").order("creado_en", { ascending: true }),
    supabase.from("suscripciones").select("*").order("fecha_inicio", { ascending: true }),
    supabase.from("pagos_suscripcion").select("*").order("fecha_reporte", { ascending: true }),
    supabase.from("log_auditoria").select("*").order("fecha", { ascending: true }),
    supabase.from("mensajes_telegram").select("*").order("created_at", { ascending: true }),
  ]);

  const tableNames = [
    "clientes", "prestamos", "cuotas", "pagos", "capital",
    "perfiles", "suscripciones", "pagos_suscripcion", "log_auditoria", "mensajes_telegram",
  ];

  for (let i = 0; i < results.length; i++) {
    if (results[i].error) {
      throw new Error(`Error consultando ${tableNames[i]}: ${results[i].error!.message}`);
    }
  }

  return {
    clientes:          results[0].data ?? [],
    prestamos:         results[1].data ?? [],
    cuotas:            results[2].data ?? [],
    pagos:             results[3].data ?? [],
    capital:           results[4].data ?? [],
    perfiles:          results[5].data ?? [],
    suscripciones:     results[6].data ?? [],
    pagos_suscripcion: results[7].data ?? [],
    log_auditoria:     results[8].data ?? [],
    mensajes_telegram: results[9].data ?? [],
  };
};

type AllData = Awaited<ReturnType<typeof fetchAllData>>;

// ─── HOJA RESUMEN ─────────────────────────────────────────────────────────────
const buildResumenSheet = (wb: ExcelJS.Workbook, data: AllData): void => {
  const sheet = wb.addWorksheet("RESUMEN");

  // Título principal
  sheet.mergeCells("A1:B1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "PrestaPro — Resumen de Backup";
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1F497D" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
  sheet.getRow(1).height = 30;

  // Timestamp
  sheet.mergeCells("A2:B2");
  const now = new Date();
  const tsCell = sheet.getCell("A2");
  tsCell.value = `Generado el ${formatDate(now.toISOString())} a las ${now.toTimeString().slice(0, 5)}`;
  tsCell.font = { italic: true, size: 10, color: { argb: "FF595959" } };
  tsCell.alignment = { horizontal: "center" };
  sheet.getRow(2).height = 16;

  // Fila espaciadora
  sheet.addRow([]);

  // Encabezado de tabla de KPIs
  const headerRow = sheet.addRow(["Indicador", "Valor"]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FF1F497D" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF9DC3E6" } } };
  });
  headerRow.height = 22;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  // deno-lint-ignore no-explicit-any
  const prestamosActivos  = (data.prestamos as any[]).filter((p) => p.estado === "activo");
  // deno-lint-ignore no-explicit-any
  const prestamosEnMora   = (data.prestamos as any[]).filter((p) => p.estado === "mora");
  // deno-lint-ignore no-explicit-any
  const prestamosCerrados = (data.prestamos as any[]).filter((p) =>
    ["pagado", "liquidado"].includes(p.estado)
  );

  const capitalTotalPrestado = (data.prestamos as any[]).reduce(
    (sum, p) => sum + Number(p.monto_original || 0), 0
  );
  const saldoPendienteTotal = [...prestamosActivos, ...prestamosEnMora].reduce(
    (sum, p) => sum + Number(p.saldo_pendiente || 0), 0
  );
  const totalCobrado = (data.pagos as any[]).reduce(
    (sum, p) => sum + Number(p.monto_pagado || 0), 0
  );
  // deno-lint-ignore no-explicit-any
  const cuotasVencidas = (data.cuotas as any[]).filter((c) => c.estado === "vencida").length;

  const kpis: [string, string | number][] = [
    ["Total Clientes",                              (data.clientes as any[]).length],
    ["Clientes Activos",                            (data.clientes as any[]).filter((c) => c.estado === "activo").length],
    ["Clientes Inactivos",                          (data.clientes as any[]).filter((c) => c.estado === "inactivo").length],
    ["Total Préstamos",                             (data.prestamos as any[]).length],
    ["Préstamos Activos",                           prestamosActivos.length],
    ["Préstamos en Mora",                           prestamosEnMora.length],
    ["Capital Total Prestado",                      formatCurrency(capitalTotalPrestado)],
    ["Saldo Pendiente Total (Activos + Mora)",      formatCurrency(saldoPendienteTotal)],
    ["Total Cobrado Histórico",                     formatCurrency(totalCobrado)],
    ["Cuotas Vencidas Sin Pagar",                   cuotasVencidas],
    ["Préstamos Cerrados (Pagados + Liquidados)",   prestamosCerrados.length],
  ];

  for (const [label, value] of kpis) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { size: 11 };
    row.getCell(1).alignment = { vertical: "middle" };
    row.getCell(2).font = { bold: true, size: 11 };
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    row.height = 18;
  }

  sheet.getColumn("A").width = 46;
  sheet.getColumn("B").width = 30;
};

// ─── CONSTRUCCIÓN DEL WORKBOOK ────────────────────────────────────────────────
const buildWorkbook = async (data: AllData): Promise<ArrayBuffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PrestaPro Backup System";
  wb.created = new Date();

  // 1. RESUMEN siempre primero
  buildResumenSheet(wb, data);

  // 2. Hojas de datos (una por tabla)
  buildSheet(wb, "Clientes",              COLUMNS.clientes,          data.clientes);
  buildSheet(wb, "Préstamos",             COLUMNS.prestamos,         data.prestamos);
  buildSheet(wb, "Cuotas",               COLUMNS.cuotas,            data.cuotas);
  buildSheet(wb, "Pagos",                COLUMNS.pagos,             data.pagos);
  buildSheet(wb, "Capital",              COLUMNS.capital,           data.capital);
  buildSheet(wb, "Perfiles (Cobradores)", COLUMNS.perfiles,         data.perfiles);
  buildSheet(wb, "Suscripciones",        COLUMNS.suscripciones,     data.suscripciones);
  buildSheet(wb, "Pagos Suscripción",    COLUMNS.pagos_suscripcion, data.pagos_suscripcion);
  buildSheet(wb, "Log Auditoría",        COLUMNS.log_auditoria,     data.log_auditoria);
  buildSheet(wb, "Mensajes Telegram",    COLUMNS.mensajes_telegram, data.mensajes_telegram);

  return await wb.xlsx.writeBuffer();
};

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const { method } = req;
  const origin = req.headers.get("origin");

  // Preflight CORS
  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Backup Manager — iniciando generación de Excel...");

    const data = await fetchAllData(supabase);

    console.log(
      `Datos consultados: ${(data.clientes as any[]).length} clientes, ` +
      `${(data.prestamos as any[]).length} préstamos, ` +
      `${(data.cuotas as any[]).length} cuotas, ` +
      `${(data.pagos as any[]).length} pagos`
    );

    const buffer = await buildWorkbook(data);

    // Nombre de archivo con fecha y hora
    const now   = new Date();
    const fecha = now.toISOString().slice(0, 10);                        // "2026-04-22"
    const hora  = now.toTimeString().slice(0, 5).replace(":", "-");      // "15-30"
    const filename = `PrestaPro_Backup_${fecha}_${hora}.xlsx`;

    console.log(`Excel generado: ${filename} (${buffer.byteLength} bytes)`);

    return new Response(buffer, {
      headers: {
        ...corsHeaders(origin),
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      status: 200,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error en Backup Manager:", msg);

    return new Response(
      JSON.stringify({ status: "error", message: msg }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
