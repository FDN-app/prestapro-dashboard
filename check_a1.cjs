const ExcelJS = require('exceljs');
async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('test_sebastian.xlsx');
  
  const ws1 = wb.getWorksheet('RC Jorge');
  console.log('RC Jorge A1:', ws1.getCell('A1').value);
  
  const ws2 = wb.getWorksheet('Ganancias semanales');
  console.log('Ganancias A1:', ws2.getCell('A1').value);
  console.log('Ganancias A2:', ws2.getCell('A2').value);
  
  const ws3 = wb.getWorksheet('Total Rendido');
  console.log('Rendido D2 Formula:', ws3.getCell('D2').formula);
  console.log('Rendido B14 Formula:', ws3.getCell('B14').formula);
}
run().catch(console.error);
