const NOVA = /(?<!\d)(?:\+?55[\s.-]*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}(?!\d)/g;
const dig = (s:string)=>s.replace(/\D/g,"");
function casa(t:string){return [...t.matchAll(NOVA)].map(m=>m[0]).filter(m=>{const d=dig(m).length;return d>=10&&d<=13;});}
const telefones = ["21- 96489-6082","11 - 96454 2043","(85)\n99229-8550","12-3341 - 3880","31 3428-9008","11 94982-4698","(11) 983838123","(11) 98383-8123","51 99973-1320","71-99954-4411","+55 21 99999-8888","Whatsapp: 21 3428-9008 fim"];
const naoTelefones = ["R$ 66.900,00","R$ 9.052,00","ano 2018","modelo 2017 2018 2019","CEP 20000-000","CNPJ 12.345.678/0001-90","valor 150000","km 42.000"];
console.log("== TELEFONES (devem casar) ==");
for (const t of telefones){const m=casa(t);console.log(`${m.length?"OK ":"** FALHOU **"} ${JSON.stringify(t)} -> ${JSON.stringify(m)}`);}
console.log("\n== NÃO-TELEFONES (NÃO podem casar) ==");
for (const t of naoTelefones){const m=casa(t);console.log(`${m.length?"** FALSO+ **":"OK "} ${JSON.stringify(t)} -> ${JSON.stringify(m)}`);}
