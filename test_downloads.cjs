const ExcelJS = require('exceljs');

async function testDownload(url, type) {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWdwZWppY3ZjeWthamJmd2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTQ2OTgsImV4cCI6MjA5MTA5MDY5OH0.Ouq8FYhprY3sAyU24UqalVV_53PoNfwxCo38O-1ZyQs";
  console.log(`\nTesting ${type}...`);
  const res = await fetch(url, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
  
  const contentType = res.headers.get("content-type");
  console.log("Headers:", contentType);
  
  if (res.ok && contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const buffer = await res.arrayBuffer();
    console.log(`Download ${type} OK: size =`, buffer.byteLength);
    require('fs').writeFileSync(`test_${type}.xlsx`, Buffer.from(buffer));
    
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(`test_${type}.xlsx`);
    console.log(`Hojas en ${type}:`, wb.worksheets.map(w => w.name).join(", "));
    
    if (type === 'sebastian') {
      const ws = wb.getWorksheet('RC Jorge');
      const cell = ws.getCell('D2');
      console.log('Formula in D2:', cell.formula ? cell.formula : 'None');
    }
  } else {
    console.log("Error or skipped:", await res.text());
  }
}

async function run() {
  await testDownload("https://vfegpejicvcykajbfwdx.supabase.co/functions/v1/backup-manager?mode=download&formato=sebastian", "sebastian");
  await testDownload("https://vfegpejicvcykajbfwdx.supabase.co/functions/v1/backup-manager?mode=download", "tecnico");
}
run().catch(console.error);
