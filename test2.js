import fs from 'fs';
const fileData = fs.readFileSync('content/tracks/associate-data-scientist-python/introduction-to-python/exercises/mcq.json', 'utf-8');
const data = JSON.parse(fileData);
let items = [];
const exerciseType = 'mcq';
if (Array.isArray(data)) {
  items = data;
} else {
  if (exerciseType === 'mcq') items = data.questions || [];
}

if (exerciseType === 'mcq' || exerciseType === 'bossbattle') {
  items = items.map(q => ({
    ...q,
    option_a: q.options?.a,
  }));
}

console.log(typeof items.slice, Array.isArray(items));
