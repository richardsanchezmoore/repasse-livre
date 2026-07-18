import "dotenv/config"; import { supabase } from "./supabaseClient.js";
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const BASE="2026-07-15T18:03:16.2Z";
async function main(){
  console.log("monitorando run OLX disparado agora...");
  for(let i=0;i<30;i++){
    const {data}=await supabase.from("discovery_runs").select("iniciado_em,finalizado_em,status,novos,elegiveis,descartados,sem_fipe,observacao,erro_mensagem")
      .ilike("categoria_url","%olx%").gt("iniciado_em",BASE).order("iniciado_em",{ascending:false}).limit(1);
    const r=data?.[0];
    if(r && r.status!=="em_andamento"){
      const dur=r.finalizado_em?Math.round((+new Date(r.finalizado_em)-+new Date(r.iniciado_em))/1000):0;
      console.log(`\n=== RESULTADO (${r.iniciado_em}) ===`);
      console.log(`status: ${r.status} | ${Math.floor(dur/60)}min${dur%60}s | N/E/D/SF: ${r.novos}/${r.elegiveis}/${r.descartados}/${r.sem_fipe}`);
      console.log(`radar/erro: ${r.observacao??r.erro_mensagem??"—"}`);
      const {data:dbg}=await supabase.from("worker_config").select("valor").eq("chave","OLX_DEBUG_HTML_FALHA").maybeSingle();
      if(dbg?.valor){ const em=JSON.parse(String(dbg.valor)).em; console.log(`último 504 no debug: ${em} ${new Date(em)>new Date(BASE)?"⚠️ FRESCO":"(antigo, ok)"}`); }
      return;
    }
    if(r) { if(i%3===0) console.log(`  [${i}] run ${r.iniciado_em} em andamento...`); }
    else if(i%4===0) console.log(`  [${i}] ainda não apareceu run novo...`);
    await sleep(30000);
  }
  console.log("timeout ~15min.");
}
main().then(()=>process.exit(0));
