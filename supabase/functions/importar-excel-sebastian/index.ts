import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import ExcelJS from "npm:exceljs@4.4.0";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://prestapro-dashboard.vercel.app",
];

const corsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

// Genera un UUID v4
const uuidv4 = () => crypto.randomUUID();

Deno.serve(async (req) => {
  const { method } = req;
  const origin = req.headers.get("origin");

  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file");
    const accion = formData.get("accion") as string;

    if (!file || !(file instanceof File)) {
      throw new Error("No se proporcionó un archivo válido.");
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0]; // Hoja principal
    if (!sheet) throw new Error("El archivo no tiene hojas.");

    // Filas 1 y 2 ignoradas
    // Fila 3 es el header
    const headersRow = sheet.getRow(3);
    const headerMap: Record<string, number> = {};
    const semanasMap: { colIdx: number; label: string; start: Date }[] = [];

    const currentYear = new Date().getFullYear();

    headersRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || "").trim();
      if (!val) return;
      
      headerMap[val.toLowerCase()] = colNumber;

      // Buscar si es columna de semana, ej "22/12 al 27/12"
      const weekMatch = val.match(/^(\d{1,2})\/(\d{1,2})\s+al\s+(\d{1,2})\/(\d{1,2})$/i);
      if (weekMatch) {
        const startDay = parseInt(weekMatch[1], 10);
        const startMonth = parseInt(weekMatch[2], 10) - 1; // 0-indexed
        
        let year = currentYear;
        // Inferir año. Si estamos parseando y vemos algo de un mes mayor y luego salta a 1 (ej dic a enero)
        // Por ahora, asumimos el currentYear a menos que necesitemos algo complejo.
        const startDate = new Date(year, startMonth, startDay, 12, 0, 0);
        
        semanasMap.push({
          colIdx: colNumber,
          label: val,
          start: startDate
        });
      }
    });

    // Ajustar años de semanas consecutivas para el cruce de diciembre a enero
    // Si vemos que el mes de una semana es menor al anterior por mucho (ej diciembre -> enero), avanzamos el año
    for (let i = 1; i < semanasMap.length; i++) {
      const prev = semanasMap[i - 1];
      const curr = semanasMap[i];
      if (prev.start.getMonth() === 11 && curr.start.getMonth() === 0) { // Diciembre a Enero
        curr.start.setFullYear(curr.start.getFullYear() + 1);
        // Actualizar todos los subsiguientes
        for (let j = i + 1; j < semanasMap.length; j++) {
          semanasMap[j].start.setFullYear(semanasMap[j].start.getFullYear() + 1);
        }
      }
    }

    const idxNombre = headerMap["nombre"];
    const idxCuil = headerMap["cuil"];
    const idxCredito = headerMap["crédito"];
    const idxInteres = headerMap["interes"];
    const idxCuotas = headerMap["cuotas"];
    const idxFecha = headerMap["fecha"];

    if (!idxNombre || !idxCredito) {
      throw new Error("No se encontraron las columnas 'Nombre' o 'Crédito' en la Fila 3.");
    }

    const clientes: any[] = [];
    const prestamos: any[] = [];
    const cuotas: any[] = [];
    const pagos: any[] = [];

    // Fila 4 en adelante
    for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const nombreCell = String(row.getCell(idxNombre).value || "").trim();
      if (!nombreCell || nombreCell.toLowerCase() === "totales") continue;

      // Parseo nombre y tasa (ej "Mirta 35%")
      let nombre = nombreCell;
      let tasaInteres = 0;
      const match = nombreCell.match(/^(.*?)\s*(\d+)%?$/);
      if (match) {
        nombre = match[1].trim();
        tasaInteres = parseFloat(match[2]);
      }

      const creditoStr = String(row.getCell(idxCredito).value || "0");
      const creditoNum = parseFloat(creditoStr.replace(/[^\d.-]/g, ""));
      
      const interesStr = idxInteres ? String(row.getCell(idxInteres).value || "0") : "0";
      const interesNum = parseFloat(interesStr.replace(/[^\d.-]/g, ""));

      if (!tasaInteres && creditoNum > 0) {
        tasaInteres = Math.round((interesNum / creditoNum) * 100);
      }

      let dni = idxCuil ? String(row.getCell(idxCuil).value || "").trim() : "";
      if (!dni) dni = `IMP-${rowNumber}`;

      let cuotasStr = idxCuotas ? String(row.getCell(idxCuotas).value || "0") : "1";
      const cuotasNum = parseInt(cuotasStr.replace(/[^\d]/g, ""), 10) || 1;

      let fechaInicio = new Date();
      if (idxFecha) {
        const valFecha = row.getCell(idxFecha).value;
        if (valFecha instanceof Date) {
          fechaInicio = valFecha;
        } else if (typeof valFecha === "string") {
          const parts = valFecha.split("/");
          if (parts.length === 3) {
            fechaInicio = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }

      // Si tiene año muy viejo (por error), usamos el currentYear
      if (fechaInicio.getFullYear() < 2000) {
        fechaInicio.setFullYear(currentYear);
      }

      const clienteId = uuidv4();
      clientes.push({
        id: clienteId,
        nombre_completo: nombre,
        dni: dni,
        estado: "activo",
      });

      const prestamoId = uuidv4();
      const totalAPagar = creditoNum + interesNum;
      
      prestamos.push({
        id: prestamoId,
        cliente_id: clienteId,
        cliente_dni: dni,
        monto_original: creditoNum,
        tasa_interes: tasaInteres,
        cantidad_cuotas: cuotasNum,
        fecha_inicio: fechaInicio.toISOString(),
        saldo_pendiente: totalAPagar,
        estado: "activo",
      });

      // Procesar pagos semanales en la fila
      const pagosDeEstePrestamo: { monto: number; fecha: Date }[] = [];
      let totalPagado = 0;

      semanasMap.forEach(sem => {
        const cellVal = row.getCell(sem.colIdx).value;
        if (cellVal !== null && cellVal !== undefined && cellVal !== "") {
          const montoStr = String(cellVal).replace(/[^\d.-]/g, "");
          const monto = parseFloat(montoStr);
          if (monto > 0) {
            pagosDeEstePrestamo.push({
              monto,
              fecha: sem.start
            });
            totalPagado += monto;
          }
        }
      });

      // Generar cuotas automáticamente
      const montoPorCuota = totalAPagar / cuotasNum;
      let pagadoAcumulado = totalPagado;

      for (let i = 1; i <= cuotasNum; i++) {
        const cuotaId = uuidv4();
        // Vencimiento semanal a partir de fecha_inicio
        const vencimiento = new Date(fechaInicio);
        vencimiento.setDate(vencimiento.getDate() + (i * 7));

        let estadoCuota = "pendiente";
        let montoCobrado = 0;
        let fechaPagoCuota: Date | null = null;

        // Marcar pagada si el acumulado lo cubre
        if (pagadoAcumulado >= montoPorCuota) {
          montoCobrado = montoPorCuota;
          estadoCuota = "pagada";
          pagadoAcumulado -= montoPorCuota;
          
          // Buscar qué pago cubrió esta cuota (aproximado, tomamos la fecha del último pago usado o el vencimiento)
          const pagoMasCercano = pagosDeEstePrestamo.find(p => p.fecha >= vencimiento) || pagosDeEstePrestamo[pagosDeEstePrestamo.length - 1];
          fechaPagoCuota = pagoMasCercano ? pagoMasCercano.fecha : vencimiento;

        } else if (pagadoAcumulado > 0) {
          montoCobrado = pagadoAcumulado;
          estadoCuota = "parcial";
          pagadoAcumulado = 0;
          
          const pagoMasCercano = pagosDeEstePrestamo.find(p => p.fecha >= vencimiento) || pagosDeEstePrestamo[pagosDeEstePrestamo.length - 1];
          fechaPagoCuota = pagoMasCercano ? pagoMasCercano.fecha : vencimiento;
        }

        cuotas.push({
          id: cuotaId,
          prestamo_id: prestamoId,
          numero_cuota: i,
          monto_cuota: montoPorCuota,
          monto_cobrado: montoCobrado,
          fecha_vencimiento: vencimiento.toISOString(),
          estado: estadoCuota,
          fecha_pago: fechaPagoCuota ? fechaPagoCuota.toISOString() : null
        });
      }

      // Ajustar saldo pendiente del prestamo
      const prestamoRef = prestamos.find(p => p.id === prestamoId);
      if (prestamoRef) {
        prestamoRef.saldo_pendiente = totalAPagar - totalPagado;
        if (prestamoRef.saldo_pendiente <= 0) {
          prestamoRef.estado = "pagado";
        }
      }

      // Generar registros de pagos
      pagosDeEstePrestamo.forEach(pago => {
        pagos.push({
          id: uuidv4(),
          prestamo_id: prestamoId,
          monto_pagado: pago.monto,
          fecha_pago: pago.fecha.toISOString(),
          metodo_pago: "efectivo"
        });
      });
    }

    const resultStats = {
      clientes: clientes.length,
      prestamos: prestamos.length,
      cuotas: cuotas.length,
      pagos: pagos.length
    };

    if (accion === "preview") {
      return new Response(JSON.stringify(resultStats), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Si no es preview, ejecutamos la RPC en la base de datos
    const { error: rpcError } = await supabase.rpc("importar_ecosistema_sebastian", {
      p_clientes: clientes,
      p_prestamos: prestamos,
      p_cuotas: cuotas,
      p_pagos: pagos,
      p_accion: accion
    });

    if (rpcError) {
      throw new Error(`Error en RPC: ${rpcError.message}`);
    }

    return new Response(JSON.stringify({ success: true, stats: resultStats }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 400,
    });
  }
});
