const fs = require('fs');
const data = JSON.parse(fs.readFileSync('content/tracks/associate-data-scientist-python/introduction-to-python/exercises/mcq.json', 'utf-8'));
let items = data.questions || [];
console.log(Array.isArray(items));
