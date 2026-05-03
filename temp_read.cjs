const ExcelJS = require('exceljs');
const fs = require('fs');

async function readExcel() {
  const filePath = "d:/cursovidcoding/prestpro/subir.xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  let markdown = "";

  workbook.eachSheet((sheet) => {
    markdown += `### Hoja: ${sheet.name}\n\n`;
    markdown += `| Columna | Tipo de Dato | Fórmula (si aplica) | Ejemplo (Fila 2) |\n`;
    markdown += `|---|---|---|---|\n`;

    const headerRow = sheet.getRow(1);
    const dataRow = sheet.getRow(2);
    
    headerRow.eachCell((cell, colNumber) => {
      const colName = cell.value?.toString().replace(/\n/g, ' ') || `Columna ${colNumber}`;
      
      let dataCell = dataRow.getCell(colNumber);
      // Try to find a non-empty cell if row 2 is empty for this column
      if (dataCell.value === null || dataCell.value === undefined) {
        for(let i=3; i<=10; i++) {
            const tempCell = sheet.getRow(i).getCell(colNumber);
            if (tempCell.value !== null && tempCell.value !== undefined) {
                dataCell = tempCell;
                break;
            }
        }
      }

      const val = dataCell.value;
      let type = typeof val;
      if (val instanceof Date) {
          type = "date";
      } else if (val && typeof val === 'object' && val.formula) {
          type = typeof val.result || "formula_result";
      }

      let isFormula = false;
      let formula = 'N/A';
      
      if (val && typeof val === 'object' && val.formula) {
          isFormula = true;
          formula = val.formula;
      } else if (dataCell.type === ExcelJS.ValueType.Formula) {
          isFormula = true;
          formula = dataCell.formula;
      } else if (dataCell.type === ExcelJS.ValueType.SharedString) {
          type = "string";
      }

      const valDisplay = val !== null && val !== undefined 
            ? (typeof val === 'object' ? JSON.stringify(val.result || val) : String(val).replace(/\n/g, ' '))
            : '';

      markdown += `| ${colName} | ${type} | ${isFormula ? `\`${formula}\`` : 'N/A'} | ${valDisplay.substring(0, 50)} |\n`;
    });
    markdown += `\n`;
  });

  fs.writeFileSync('excel_structure.md', markdown);
  console.log('Estructura guardada en excel_structure.md');
}

readExcel().catch(console.error);
