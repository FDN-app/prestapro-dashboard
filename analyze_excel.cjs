const ExcelJS = require('exceljs');

async function analyze() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('D:\\cursovidcoding\\prestpro\\subir.xlsx');

  for (const ws of workbook.worksheets) {
    console.log(`\n\n=== HOJA: ${ws.name} ===`);
    
    // Buscar la fila con más texto para asumirla como encabezado
    let bestRow = null;
    let maxValues = 0;
    for(let i=1; i<=10; i++) {
        const row = ws.getRow(i);
        let vals = 0;
        row.eachCell(() => vals++);
        if(vals > maxValues) {
            maxValues = vals;
            bestRow = row;
        }
    }
    
    if (bestRow) {
      console.log(`\nENCABEZADOS (Fila ${bestRow.number}):`);
      bestRow.eachCell((cell, colNumber) => {
        console.log(`  Col ${colNumber}: ${cell.value}`);
      });
    }

    console.log("\nFÓRMULAS ENCONTRADAS (Primeras 15 filas):");
    let count = 0;
    for(let i=1; i<=15; i++) {
      ws.getRow(i).eachCell((cell, colNumber) => {
        if (cell.type === ExcelJS.ValueType.Formula) {
          console.log(`  Fila ${i}, Col ${colNumber}: =${cell.formula}`);
          count++;
        }
      });
    }
    if(count === 0) console.log("  Ninguna");
  }
}

analyze().catch(console.error);
