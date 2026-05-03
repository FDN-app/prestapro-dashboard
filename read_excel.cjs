const xlsx = require('xlsx'); 
const wb = xlsx.readFile('../subir.xlsx'); 
wb.SheetNames.forEach(sn => { 
  console.log('\n--- Sheet: ' + sn + ' ---'); 
  const ws = wb.Sheets[sn]; 
  const json = xlsx.utils.sheet_to_json(ws, {header: 1}); 
  if (json.length > 0) { 
    console.log('Headers:'); 
    console.log(json[0]); 
    if(json.length > 1) { 
      console.log('Row 1:'); 
      console.log(json[1]); 
    } 
  } 
});
