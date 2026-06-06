fetch('http://127.0.0.1:3000/api/employees').then(r => r.json()).then(console.log).catch(console.error);
