import ExcelJS from "npm:exceljs@4.4.0";

// Formato de fecha
const formatDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
};

// Generar las últimas 12 semanas (lunes a domingo)
const getSemanas = () => {
  const w = [];
  const currDate = new Date();
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

  const semanas = getSemanas();

  // ─── HOJA 1: RC JORGE ───────────────────────────────────────────────
  const sheet1 = wb.addWorksheet("RC Jorge");
  
  // Encabezados
  const headerRow1 = [
    "Nombre", "CUIL", "Cuil", "Saldo", "Crédito", "interes", "Cuotas",
    "Comisión cancelados", "Renovados", "fecha", "suma total semanales",
    "Clientes q me pagaron a mi", "Total Semanales"
  ];
  semanas.forEach(s => headerRow1.push(s.label));
  
  sheet1.addRow(headerRow1);

  // Estilo encabezados
  const hRow1 = sheet1.getRow(1);
  hRow1.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
  });
  
  // Forzar valor de A1 por seguridad
  sheet1.getCell('A1').value = "Nombre";

  const prestamosActivosYMora = data.prestamos.filter((p: any) => p.estado === "activo" || p.estado === "mora");

  let rowNum = 2;
  for (const p of prestamosActivosYMora) {
    const cliente = data.clientes.find((c: any) => c.id === p.cliente_id) || {};
    
    // Calcular "Clientes q me pagaron a mi" (pagos directos al admin)
    const pagosPrestamo = data.pagos.filter((pag: any) => pag.prestamo_id === p.id);
    const sumaPagosAdmin = pagosPrestamo
      .filter((pag: any) => pag.es_cobro_directo_admin === true)
      .reduce((sum: number, pag: any) => sum + Number(pag.monto_pagado || 0), 0);

    const interes = (Number(p.monto_original || 0) * Number(p.tasa_interes || 0)) / 100;
    
    const rowValues = [
      cliente.nombre_completo || "",
      cliente.dni || "",
      "", // Columna legacy vacía
      { formula: `E${rowNum}+F${rowNum}-K${rowNum}` }, // Saldo
      Number(p.monto_original || 0), // Crédito
      interes,
      Number(p.cantidad_cuotas || 0),
      Number(p.comision || 0), // Comisión cancelados
      Number(p.cantidad_renovaciones || 0), // Renovados
      p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-AR") : "", // fecha
      { formula: `SUM(N${rowNum}:Z${rowNum})` }, // suma total semanales (asumiendo semanas empiezan en N)
      sumaPagosAdmin, // Clientes q me pagaron a mi
      0 // Total Semanales (lo dejamos en 0 o vacío por ahora)
    ];

    // Llenar semanas
    semanas.forEach(s => {
      const pagosSemana = pagosPrestamo.filter((pag: any) => {
        const d = new Date(pag.fecha_pago).getTime();
        return d >= s.start && d <= s.end;
      });
      const sum = pagosSemana.reduce((acc: number, curr: any) => acc + Number(curr.monto_pagado || 0), 0);
      rowValues.push(sum > 0 ? sum : 0);
    });

    sheet1.addRow(rowValues);
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
    sheet1.getCell(`${letter}${rowNum}`).value = { formula: `SUM(${letter}2:${letter}${rowNum-1})` };
  });


  // ─── HOJA 2: Ganancias semanales ──────────────────────────────────
  const sheet2 = wb.addWorksheet("Ganancias semanales");
  sheet2.addRow(["Ganancias semanales"]);
  sheet2.getRow(1).font = { bold: true };

  let rowNumH2 = 2;
  semanas.forEach(s => {
    // Buscar pagos en esa semana
    const pagosSemana = data.pagos.filter((pag: any) => {
      const d = new Date(pag.fecha_pago).getTime();
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

    const dDate = new Date(s.start);
    const dateStr = `${String(dDate.getDate()).padStart(2, "0")}/${String(dDate.getMonth() + 1).padStart(2, "0")}/${String(dDate.getFullYear()).slice(-2)}`;
    sheet2.addRow([dateStr, gananciaSemana]);
    rowNumH2++;
  });
  
  sheet2.addRow(["", { formula: `SUM(B2:B${rowNumH2-1})` }]);
  sheet2.getRow(rowNumH2).font = { bold: true };


  // ─── HOJA 3: Total Rendido ────────────────────────────────────────
  const sheet3 = wb.addWorksheet("Total Rendido");
  sheet3.addRow(["Fecha", "Total", "Jorge", "yo"]);
  sheet3.getRow(1).font = { bold: true };

  let rowNumH3 = 2;
  semanas.forEach(s => {
    const pagosSemana = data.pagos.filter((pag: any) => {
      const d = new Date(pag.fecha_pago).getTime();
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
    sheet3.addRow([
      s.label,
      totalCobrado,
      parteCobrador,
      { formula: `B${rowNumH3}-C${rowNumH3}` }
    ]);
    rowNumH3++;
  });

  sheet3.addRow([
    "TOTALES",
    { formula: `SUM(B2:B${rowNumH3-1})` },
    { formula: `SUM(C2:C${rowNumH3-1})` },
    { formula: `SUM(D2:D${rowNumH3-1})` }
  ]);
  sheet3.getRow(rowNumH3).font = { bold: true };

  return await wb.xlsx.writeBuffer();
};
