import ExcelJS from "npm:exceljs@4.4.0";

// Formato de fecha
const formatDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
};

// Generar las últimas 12 semanas (lunes a domingo)
const getSemanas = (data: any) => {
  // Encontrar la fecha más reciente en pagos (o usar hoy si no hay)
  let fechaReferencia = new Date();
  if (data.pagos && data.pagos.length > 0) {
    const fechas = data.pagos
      .map((p: any) => new Date(p.fecha_pago || p.created_at).getTime())
      .filter((t: number) => !isNaN(t));
    if (fechas.length > 0) {
      fechaReferencia = new Date(Math.max(...fechas));
    }
  }
  
  const w = [];
  const currDate = new Date(fechaReferencia);
  const day = currDate.getDay() || 7; 
  currDate.setDate(currDate.getDate() - (day - 1));
  currDate.setHours(0,0,0,0);
  
  for (let i = 0; i < 12; i++) {
    const monday = new Date(currDate);
    monday.setDate(monday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    
    w.push({
      label: `${formatDate(monday)} al ${formatDate(sunday)}`,
      start: monday.getTime(),
      end: sunday.getTime()
    });
  }
  return w.reverse(); // De más antigua a más reciente para el Excel
};

// Construir el workbook de Sebastián
// deno-lint-ignore no-explicit-any
export const buildSebastianWorkbook = async (data: any): Promise<ArrayBuffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PrestaPro";
  wb.created = new Date();

  const semanas = getSemanas(data);

  // ─── HOJA 1 ───────────────────────────────────────────────
  const sheet1 = wb.addWorksheet("Hoja1");
  
  // FILA 1: Título "RC Jorge"
  sheet1.getCell('A1').value = "RC Jorge";
  sheet1.getCell('A1').font = { bold: true, size: 16 };

  // FILA 2: Vacía (o decorativa, la dejamos vacía)
  sheet1.addRow([]);

  // FILA 3: Encabezados
  const headers = [
    "Nombre", "CUIL", "Cuil", "Saldo", "Crédito", "interes", "Cuotas",
    "Comisión cancelados", "Renovados", "fecha", "suma total semanales",
    "Clientes q me pagaron a mi", "Total Semanales"
  ];
  semanas.forEach(s => headers.push(s.label));
  sheet1.getRow(3).values = headers;
  
  const hRow3 = sheet1.getRow(3);
  hRow3.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
  });

  const prestamosActivosYMora = data.prestamos.filter((p: any) => {
    const st = String(p.estado || "").trim().toLowerCase();
    return st === "activo" || st === "mora";
  });

  let rowNum = 4;
  for (const p of prestamosActivosYMora) {
    const cliente = data.clientes.find((c: any) => c.id === p.cliente_id) || {};
    
    // Calcular "Clientes q me pagaron a mi" (pagos directos al admin)
    const pagosPrestamo = data.pagos.filter((pag: any) => pag.prestamo_id === p.id);
    const sumaPagosAdmin = pagosPrestamo
      .filter((pag: any) => pag.es_cobro_directo_admin === true)
      .reduce((sum: number, pag: any) => sum + Number(pag.monto_pagado || 0), 0);

    const interes = (Number(p.monto_original || 0) * Number(p.tasa_interes || 0)) / 100;
    
    const nombreExportar = cliente.nombre_original_excel || cliente.nombre_completo || "";

    const rowValues = [
      nombreExportar,
      cliente.dni || "",
      "", // Columna legacy vacía
      { formula: `E${rowNum}+F${rowNum}-K${rowNum}` }, // Saldo
      Number(p.monto_original || 0), // Crédito
      interes,
      Number(p.cantidad_cuotas || 0),
      Number(p.comision || 0), // Comisión cancelados
      Number(p.cantidad_renovaciones || 0), // Renovados
      p.fecha_inicio ? new Date(p.fecha_inicio) : null, // fecha
      { formula: `SUM(N${rowNum}:${sheet1.getColumn(13 + semanas.length).letter}${rowNum})` }, // suma total semanales
      sumaPagosAdmin, // Clientes q me pagaron a mi
      0 // Total Semanales
    ];

    // Llenar semanas
    semanas.forEach(s => {
      const pagosSemana = pagosPrestamo.filter((pag: any) => {
        const fecha = pag.fecha_pago || pag.created_at;
        if (!fecha) return false;
        const d = new Date(fecha).getTime();
        return d >= s.start && d <= s.end;
      });
      const sum = pagosSemana.reduce((acc: number, curr: any) => acc + Number(curr.monto_pagado || 0), 0);
      rowValues.push(sum > 0 ? sum : 0);
    });

    sheet1.getRow(rowNum).values = rowValues;
    const cellFecha = sheet1.getCell(`J${rowNum}`);
    cellFecha.numFmt = 'dd/mm/yyyy';
    rowNum++;
  }

  // Fila de totales al final de Hoja 1
  const totRow1 = sheet1.addRow(["TOTALES"]);
  totRow1.font = { bold: true };
  // Formulas para columnas numericas (E, F, K, L, M y semanas)
  const colsToSumH1 = [5, 6, 11, 12, 13];
  for(let i = 0; i < semanas.length; i++) colsToSumH1.push(14 + i);
  
  colsToSumH1.forEach(colIdx => {
    const letter = sheet1.getColumn(colIdx).letter;
    sheet1.getCell(`${letter}${rowNum}`).value = { formula: `SUM(${letter}4:${letter}${rowNum-1})` };
  });


  // ─── HOJA 2 ──────────────────────────────────
  const sheet2 = wb.addWorksheet("Hoja2");
  sheet2.getCell('A1').value = "Ganancias semanales";
  sheet2.getCell('A1').font = { bold: true };

  let rowNumH2 = 2;
  semanas.forEach(s => {
    // Buscar pagos en esa semana
    const pagosSemana = data.pagos.filter((pag: any) => {
      const fecha = pag.fecha_pago || pag.created_at;
      if (!fecha) return false;
      const d = new Date(fecha).getTime();
      return d >= s.start && d <= s.end;
    });

    let gananciaSemana = 0;
    pagosSemana.forEach((pag: any) => {
      const p = data.prestamos.find((pr: any) => pr.id === pag.prestamo_id);
      if (p) {
        const tasa = Number(p.tasa_interes || 0);
        gananciaSemana += Number(pag.monto_pagado || 0) * (tasa / (100 + tasa));
      }
    });

    const dateMonday = new Date(s.start);
    const cellFecha = sheet2.getCell(`A${rowNumH2}`);
    cellFecha.value = dateMonday;
    cellFecha.numFmt = 'dd/mm/yy';
    
    sheet2.getCell(`B${rowNumH2}`).value = gananciaSemana;
    rowNumH2++;
  });
  
  sheet2.addRow(["", { formula: `SUM(B2:B${rowNumH2-1})` }]);
  sheet2.getRow(rowNumH2).font = { bold: true };


  // ─── HOJA 3 ────────────────────────────────────────
  const sheet3 = wb.addWorksheet("Hoja3");
  sheet3.getCell('A1').value = "Total Rendido";
  sheet3.getCell('A1').font = { bold: true };
  sheet3.getCell('C1').value = "Total Ganancia";
  sheet3.getCell('C1').font = { bold: true };

  sheet3.getRow(2).values = ["Fecha", "Total", "Jorge", "yo"];
  sheet3.getRow(2).font = { bold: true };

  let rowNumH3 = 3;
  semanas.forEach(s => {
    const pagosSemana = data.pagos.filter((pag: any) => {
      const fecha = pag.fecha_pago || pag.created_at;
      if (!fecha) return false;
      const d = new Date(fecha).getTime();
      return d >= s.start && d <= s.end;
    });

    let totalCobrado = 0;
    let parteCobrador = 0;

    pagosSemana.forEach((pag: any) => {
      totalCobrado += Number(pag.monto_pagado || 0);
      
      const p = data.prestamos.find((pr: any) => pr.id === pag.prestamo_id);
      if (p) {
        const tasa = Number(p.tasa_interes || 0);
        const ganancia = Number(pag.monto_pagado || 0) * (tasa / (100 + tasa));
        
        let comisionPorcentaje = 0;
        if (pag.cobrador_id) {
          const cob = data.perfiles.find((perf: any) => perf.id === pag.cobrador_id);
          if (cob) comisionPorcentaje = Number(cob.comision_porcentaje || 0);
        }
        
        parteCobrador += ganancia * (comisionPorcentaje / 100);
      }
    });

    // Columna A: Fecha
    // Columna B: Total
    // Columna C: Jorge (Valor estático calculado)
    // Columna D: yo (Formula viva: Total - Jorge)
    const fechaCierre = new Date(s.end); // domingo de la semana
    const cellFecha = sheet3.getCell(`A${rowNumH3}`);
    cellFecha.value = fechaCierre;
    cellFecha.numFmt = 'dd/mm/yyyy';
    
    sheet3.getCell(`B${rowNumH3}`).value = totalCobrado;
    sheet3.getCell(`C${rowNumH3}`).value = parteCobrador;
    sheet3.getCell(`D${rowNumH3}`).value = { formula: `B${rowNumH3}-C${rowNumH3}` };
    rowNumH3++;
  });

  sheet3.getCell(`A${rowNumH3}`).value = "TOTALES";
  sheet3.getCell(`A${rowNumH3}`).font = { bold: true };
  sheet3.getCell(`B${rowNumH3}`).value = { formula: `SUM(B3:B${rowNumH3-1})` };
  sheet3.getCell(`C${rowNumH3}`).value = { formula: `SUM(C3:C${rowNumH3-1})` };
  sheet3.getCell(`D${rowNumH3}`).value = { formula: `SUM(D3:D${rowNumH3-1})` };

  return await wb.xlsx.writeBuffer();
};
