const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('d:\\cursovidcoding\\prestpro\\prestapro-dashboard\\documento\\PrestaPro_Documento_Maestro.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => console.error(err));
