import { useState, useMemo, useEffect, useRef } from "react";

const HORAS_DIA=8, HORAS_SAB=4;
const COLORS=["#1D9E75","#378ADD","#D85A30","#BA7517","#7F77DD","#D4537E","#639922","#E24B4A"];
const CATS=["Materiales","Herramienta","Transporte","Mano de obra","Otro"];
const MATERIALES_BASE=["Madera MDF","Madera aglomerada","Madera pino","Madera roble","Madera cedro","Tablero melamínico","Triplay","Tablaroca","Herrajes","Bisagras","Correderas","Jaladores","Chapas y cerraduras","Tornillos y clavos","Pegamento/adhesivo","Lija","Sellador","Pintura","Barniz","Tinte","Vidrio","Espejo","Perfil metálico","Tubo cuadrado","Perfil de aluminio","Silicón","Masilla","Fibra de vidrio","Otro"];
const ETAPAS_DEF=["Medición y diseño","Compra de materiales","Corte","Ensamble","Acabado/pintura","Entrega"];
const STORAGE_KEY="taller_v2";

const DEMO=[
  {id:1,nombre:"Closet recámara principal",cliente:"Sra. García",telefono:"81 2345 6789",anticipo:"3500",total:"9000",fechaEntrega:"2026-06-20",startOverride:null,posicion:0,etapas:[{nombre:"Medición y diseño",horas:3,hechas:0},{nombre:"Compra de materiales",horas:2,hechas:0},{nombre:"Corte",horas:8,hechas:0},{nombre:"Ensamble",horas:10,hechas:0},{nombre:"Acabado/pintura",horas:5,hechas:0},{nombre:"Entrega",horas:2,hechas:0}],gastos:[{id:11,desc:"Madera MDF 18mm",monto:"2100",cat:"Materiales"},{id:12,desc:"Herrajes y correderas",monto:"680",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"Color blanco mate.",color:"#1D9E75"},
  {id:2,nombre:"Estante para sala",cliente:"Familia Rodríguez",telefono:"81 3456 7890",anticipo:"1200",total:"3200",fechaEntrega:"2026-06-27",startOverride:null,posicion:1,etapas:[{nombre:"Medición y diseño",horas:2,hechas:0},{nombre:"Compra de materiales",horas:1,hechas:0},{nombre:"Corte",horas:4,hechas:0},{nombre:"Ensamble",horas:5,hechas:0},{nombre:"Acabado/pintura",horas:3,hechas:0},{nombre:"Entrega",horas:1,hechas:0}],gastos:[{id:21,desc:"Tablón pino",monto:"850",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"Flotante, 3 niveles.",color:"#378ADD"},
  {id:3,nombre:"Puerta principal roble",cliente:"Ing. Martínez",telefono:"81 4567 8901",anticipo:"5000",total:"14000",fechaEntrega:"2026-07-04",startOverride:null,posicion:2,etapas:[{nombre:"Medición y diseño",horas:4,hechas:0},{nombre:"Compra de materiales",horas:3,hechas:0},{nombre:"Corte",horas:10,hechas:0},{nombre:"Ensamble",horas:12,hechas:0},{nombre:"Acabado/pintura",horas:8,hechas:0},{nombre:"Entrega e instalación",horas:4,hechas:0}],gastos:[{id:31,desc:"Roble macizo",monto:"4200",cat:"Materiales"},{id:32,desc:"Barniz y lija",monto:"430",cat:"Materiales"},{id:33,desc:"Herrajes premium",monto:"1100",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"Bisagras ocultas.",color:"#D85A30"},
  {id:4,nombre:"Zócalos sala-comedor",cliente:"Sra. López",telefono:"81 5678 9012",anticipo:"800",total:"2400",fechaEntrega:"2026-07-11",startOverride:null,posicion:3,etapas:[{nombre:"Medición",horas:1,hechas:0},{nombre:"Compra de materiales",horas:1,hechas:0},{nombre:"Corte y perfilado",horas:5,hechas:0},{nombre:"Instalación",horas:6,hechas:0},{nombre:"Acabado",horas:2,hechas:0}],gastos:[{id:41,desc:"MDF ranurado",monto:"560",cat:"Materiales"},{id:42,desc:"Adhesivo y fijaciones",monto:"180",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"18 metros lineales.",color:"#BA7517"},
  {id:5,nombre:"Escritorio home office",cliente:"Dr. Herrera",telefono:"81 6789 0123",anticipo:"2000",total:"5500",fechaEntrega:"2026-07-18",startOverride:null,posicion:4,etapas:[{nombre:"Diseño y medición",horas:3,hechas:0},{nombre:"Compra de materiales",horas:2,hechas:0},{nombre:"Corte",horas:6,hechas:0},{nombre:"Ensamble",horas:7,hechas:0},{nombre:"Acabado",horas:4,hechas:0},{nombre:"Entrega",horas:1,hechas:0}],gastos:[{id:51,desc:"Tablero nogal",monto:"1800",cat:"Materiales"},{id:52,desc:"Patas metálicas",monto:"650",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"160x80cm con cajón.",color:"#7F77DD"},
];

function parseDate(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function isoDate(d){const r=new Date(d);r.setHours(12);return r.toISOString().split("T")[0];}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function fmtShort(d){return d.toLocaleDateString("es-MX",{day:"numeric",month:"short"});}
function fmtLong(d){return d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"});}
function horasDelDia(d,exc={}){const key=isoDate(d);if(exc[key]!==undefined)return exc[key];const w=d.getDay();return w===0?0:w===6?HORAS_SAB:HORAS_DIA;}
function nextWork(d,exc={}){let r=new Date(d);r.setHours(0,0,0,0);while(horasDelDia(r,exc)===0)r=addDays(r,1);return r;}
const num=v=>parseFloat(v)||0;
const money=n=>"$"+Math.round(n).toLocaleString("es-MX");
const pend=e=>Math.max(0,num(e.horas)-num(e.hechas));
const totalPend=j=>j.etapas.reduce((s,e)=>s+pend(e),0);
const etapaActual=j=>j.etapas.find(e=>pend(e)>0);

function calcFin(etapas,start,exc={}){
  let h=etapas.reduce((s,e)=>s+pend(e),0);
  if(h===0)return nextWork(new Date(start),exc);
  let cur=nextWork(new Date(start),exc);
  while(h>0.001){const c=horasDelDia(cur,exc);const u=Math.min(h,c);h=parseFloat((h-u).toFixed(2));if(h>0.001){cur=addDays(cur,1);while(horasDelDia(cur,exc)===0)cur=addDays(cur,1);}}
  return cur;
}
function simSchedule(activos,exc={}){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  let cursor=nextWork(new Date(hoy),exc);
  return activos.map(j=>{
    const inicio=j.startOverride?nextWork(parseDate(j.startOverride),exc):new Date(cursor);
    const fin=calcFin(j.etapas,inicio,exc);
    cursor=nextWork(addDays(fin,1),exc);
    const entrega=j.fechaEntrega?parseDate(j.fechaEntrega):null;
    const diasMargen=entrega?Math.round((entrega-fin)/86400000):null;
    return{...j,inicio,fin,totalH:totalPend(j),tarde:!!(entrega&&fin>entrega),diasMargen};
  });
}
function calcImpacto(a,b){
  const enRiesgoNuevo=b.filter(j=>j.tarde&&!a.find(s=>s.id===j.id&&s.tarde));
  const retrasados=b.filter(j=>{const o=a.find(s=>s.id===j.id);return o&&j.fin>o.fin;});
  const diasRetraso=j=>{const o=a.find(s=>s.id===j.id);return o?Math.round((j.fin-o.fin)/86400000):0;};
  return{enRiesgoNuevo,retrasados,diasRetraso,viable:enRiesgoNuevo.length===0};
}
const defaultJob=()=>({id:Date.now(),nombre:"",cliente:"",telefono:"",anticipo:"",total:"",fechaEntrega:"",startOverride:null,posicion:999,etapas:ETAPAS_DEF.map(e=>({nombre:e,horas:0,hechas:0})),gastos:[],pagoFinalRecibido:false,archivado:false,notas:"",color:COLORS[Math.floor(Math.random()*COLORS.length)]});

function exportarJSON(trabajos,excepciones,materialesExtra){
  const data={version:2,fecha:new Date().toISOString(),trabajos,excepciones,materialesExtra};
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  a.download="respaldo_taller_"+isoDate(new Date())+".json";a.click();
}
function exportarCSV(trabajos){
  const rows=[["Trabajo","Cliente","Teléfono","Precio","Anticipo","Gastos","Margen $","Margen %","Horas plan","Horas hechas","$/hora","Pago final","Entrega","Estado","Notas"]];
  trabajos.forEach(j=>{const g=j.gastos.reduce((s,x)=>s+num(x.monto),0);const mg=num(j.total)-g;const h=j.etapas.reduce((s,e)=>s+num(e.horas),0);const hh=j.etapas.reduce((s,e)=>s+num(e.hechas),0);
    rows.push([j.nombre,j.cliente,j.telefono,num(j.total),num(j.anticipo),g,mg,num(j.total)>0?Math.round((mg/num(j.total))*100)+"%":"",h.toFixed(1),hh.toFixed(1),h>0?Math.round(num(j.total)/h):"",j.pagoFinalRecibido?"Cobrado":"Pendiente",j.fechaEntrega||"",j.archivado?"Archivado":"Activo",j.notas]);});
  const csv="\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));a.download="taller_"+isoDate(new Date())+".csv";a.click();
}

export default function App(){
  const [trabajos,setTrabajos]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY);if(s){const p=JSON.parse(s);if(p.length>0)return p.map(j=>({...j,etapas:j.etapas.map(e=>({...e,hechas:e.hechas||0}))}));}}catch(e){}return DEMO;});
  const [excepciones,setExcepciones]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY+"_exc");return s?JSON.parse(s):{}}catch(e){return {};}});
  const [materialesExtra,setMaterialesExtra]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY+"_mat");return s?JSON.parse(s):[]}catch(e){return [];}});
  const [tab,setTab]=useState("cierre");
  const [editando,setEditando]=useState(null);
  const [form,setForm]=useState(defaultJob());
  const [insertPos,setInsertPos]=useState(999);
  const [insertPreview,setInsertPreview]=useState(null);
  const [gastoForm,setGastoForm]=useState({jobId:"",desc:"",monto:"",cat:"Materiales",nota:""});
  const [nuevoMaterial,setNuevoMaterial]=useState("");
  const [mostrarNuevoMat,setMostrarNuevoMat]=useState(false);
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const dragIdx=useRef(null),dragOver=useRef(null);
  const fileRef=useRef(null);

  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(trabajos));}catch(e){}},[trabajos]);
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY+"_exc",JSON.stringify(excepciones));}catch(e){}},[excepciones]);
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY+"_mat",JSON.stringify(materialesExtra));}catch(e){}},[materialesExtra]);

  const showToast=(msg,tipo="ok")=>{setToast({msg,tipo});setTimeout(()=>setToast(null),3000);};
  const materiales=useMemo(()=>[...MATERIALES_BASE,...materialesExtra],[materialesExtra]);
  const activos=useMemo(()=>trabajos.filter(j=>!j.archivado).sort((a,b)=>(a.posicion||0)-(b.posicion||0)),[trabajos]);
  const archivados=useMemo(()=>trabajos.filter(j=>j.archivado),[trabajos]);
  const schedule=useMemo(()=>simSchedule(activos,excepciones),[activos,excepciones]);

  function agregarMaterial(){const m=nuevoMaterial.trim();if(!m)return;if(!materiales.includes(m))setMaterialesExtra(x=>[...x,m]);setGastoForm(f=>({...f,desc:m}));setMostrarNuevoMat(false);setNuevoMaterial("");showToast("Material agregado");}
  function setExcepcion(fecha,horas){setExcepciones(ex=>({...ex,[fecha]:horas}));showToast(`Día ${fecha}: ${horas}h`);}
  function resetExcepcion(fecha){setExcepciones(ex=>{const n={...ex};delete n[fecha];return n;});showToast("Día restablecido");}

  function importarArchivo(e){
    const file=e.target.files[0];if(!file)return;const reader=new FileReader();
    reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(!data.trabajos||!Array.isArray(data.trabajos))throw new Error();if(!confirm(`Respaldo con ${data.trabajos.length} trabajo(s). ¿Reemplazar todo lo actual?`))return;setTrabajos(data.trabajos.map(j=>({...j,etapas:j.etapas.map(et=>({...et,hechas:et.hechas||0}))})));if(data.excepciones)setExcepciones(data.excepciones);if(data.materialesExtra)setMaterialesExtra(data.materialesExtra);showToast("Respaldo importado");}catch(err){alert("El archivo no es un respaldo válido (.json de esta app).");}};
    reader.readAsText(file);e.target.value="";
  }

  // Gantt
  const ganttStart=useMemo(()=>{if(schedule.length){const d=new Date(schedule[0].inicio);d.setHours(0,0,0,0);return d;}const h=new Date();h.setHours(0,0,0,0);return h;},[schedule]);
  const ganttEnd=useMemo(()=>schedule.length?schedule[schedule.length-1].fin:addDays(new Date(),30),[schedule]);
  const totalDiasG=useMemo(()=>Math.max(Math.ceil((ganttEnd-ganttStart)/86400000)+2,28),[ganttStart,ganttEnd]);
  const diasOcupados=useMemo(()=>{const set=new Set();schedule.forEach(j=>{let cur=new Date(j.inicio);while(cur<=j.fin){set.add(isoDate(cur));cur=addDays(cur,1);}});return set;},[schedule]);

  const totalGastos=j=>j.gastos.reduce((s,g)=>s+num(g.monto),0);
  const totalHoras=j=>j.etapas.reduce((s,e)=>s+num(e.horas),0);
  const margen=j=>num(j.total)-totalGastos(j);
  const margenPct=j=>num(j.total)>0?Math.round((margen(j)/num(j.total))*100):0;
  const ingresosPorHora=j=>totalHoras(j)>0?Math.round(num(j.total)/totalHoras(j)):0;
  const cobrado=j=>num(j.anticipo)+(j.pagoFinalRecibido?(num(j.total)-num(j.anticipo)):0);
  const saldoJob=j=>cobrado(j)-totalGastos(j);
  const finGlobal=useMemo(()=>{const tA=trabajos.reduce((s,j)=>s+num(j.anticipo),0);const tF=trabajos.filter(j=>j.pagoFinalRecibido).reduce((s,j)=>s+(num(j.total)-num(j.anticipo)),0);const tG=trabajos.reduce((s,j)=>s+totalGastos(j),0);const pC=trabajos.filter(j=>!j.pagoFinalRecibido).reduce((s,j)=>s+(num(j.total)-num(j.anticipo)),0);const hT=trabajos.reduce((s,j)=>s+totalHoras(j),0);return{caja:tA+tF-tG,anticipos:tA,pagosF:tF,gastado:tG,porCobrar:pC,horasTotales:hT,iph:hT>0?Math.round((tA+tF)/hT):0,enRiesgo:activos.filter(j=>saldoJob(j)<0)};},[trabajos,activos]);
  const maxIph=useMemo(()=>Math.max(...trabajos.map(j=>ingresosPorHora(j)),1),[trabajos]);

  useEffect(()=>{
    if(tab!=="form"||editando){setInsertPreview(null);return;}
    if(!form.nombre.trim()){setInsertPreview(null);return;}
    const pos=Math.min(insertPos,activos.length);const lista=[...activos];lista.splice(pos,0,{...form,id:-1,posicion:pos});
    const s2=simSchedule(lista,excepciones);setInsertPreview({pos,imp:calcImpacto(schedule,s2.filter(j=>j.id!==-1)),sched2:s2});
  },[insertPos,form,tab,editando,activos,excepciones,schedule]);

  // ── Acciones de avance ────────────────────────────────────────────
  function avanzarHoras(jobId,etapaNombre,horas){
    setTrabajos(t=>t.map(j=>j.id!==jobId?j:{...j,etapas:j.etapas.map(e=>e.nombre===etapaNombre?{...e,hechas:Math.min(num(e.horas),num(e.hechas)+num(horas))}:e)}));
    showToast("Avance registrado");
  }
  function completarEtapa(jobId,etapaNombre){
    setTrabajos(t=>t.map(j=>j.id!==jobId?j:{...j,etapas:j.etapas.map(e=>e.nombre===etapaNombre?{...e,hechas:num(e.horas)}:e)}));
    showToast("Etapa completada");
  }
  function ajustarHorasReales(jobId,etapaNombre,nuevoTotal){
    // si llevó más horas: sube el total planeado de la etapa
    setTrabajos(t=>t.map(j=>j.id!==jobId?j:{...j,etapas:j.etapas.map(e=>e.nombre===etapaNombre?{...e,horas:Math.max(num(nuevoTotal),num(e.hechas))}:e)}));
    showToast("Horas de la etapa actualizadas");
  }

  function pedirMover(jobId,fechaSug){const j=trabajos.find(x=>x.id===jobId);const nf=fechaSug?isoDate(fechaSug):isoDate(nextWork(new Date(),excepciones));const sim=activos.map(x=>x.id===jobId?{...x,startOverride:nf}:x);const s2=simSchedule(sim,excepciones);setModal({tipo:"mover",jobId,job:j,nuevaFecha:nf,impacto:calcImpacto(schedule,s2),schedDes:s2});}
  function onCambioFechaMover(nf){if(!nf)return;const sim=activos.map(x=>x.id===modal.jobId?{...x,startOverride:nf}:x);const s2=simSchedule(sim,excepciones);setModal(m=>({...m,nuevaFecha:nf,impacto:calcImpacto(schedule,s2),schedDes:s2}));}
  function confirmarMover(){setTrabajos(t=>t.map(j=>j.id===modal.jobId?{...j,startOverride:modal.nuevaFecha}:j));showToast("Fecha actualizada");setModal(null);}

  function onDrop(){if(dragIdx.current===null||dragOver.current===null||dragIdx.current===dragOver.current){dragIdx.current=null;return;}const arr=[...activos];const[m]=arr.splice(dragIdx.current,1);arr.splice(dragOver.current,0,m);arr.forEach((j,i)=>j.posicion=i);const s2=simSchedule(arr,excepciones);const imp=calcImpacto(schedule,s2);const newAll=[...arr,...archivados];if(!imp.viable||imp.retrasados.length>0)setModal({tipo:"reorden",arr:newAll,impacto:imp,schedDes:s2});else{setTrabajos(newAll);showToast("Orden actualizado");}dragIdx.current=null;dragOver.current=null;}
  function confirmarReorden(){modal.arr.forEach((j,i)=>{if(!j.archivado)j.posicion=i;});setTrabajos([...modal.arr]);showToast("Orden actualizado");setModal(null);}

  const openNew=()=>{setForm(defaultJob());setInsertPos(activos.length);setEditando(null);setTab("form");};
  const openEdit=j=>{setForm({...j,etapas:j.etapas.map(e=>({...e})),gastos:j.gastos.map(g=>({...g}))});setEditando(j.id);setInsertPos(j.posicion||0);setTab("form");};
  const saveJob=()=>{if(!form.nombre.trim())return alert("Agrega el nombre del trabajo.");if(editando){setTrabajos(t=>t.map(j=>j.id===editando?{...form}:j));showToast("Trabajo actualizado");}else{const pos=Math.min(insertPos,activos.length);const lista=[...activos];lista.splice(pos,0,{...form,id:Date.now(),archivado:false,posicion:pos});lista.forEach((j,i)=>j.posicion=i);setTrabajos([...lista,...archivados]);showToast("Trabajo agregado");}setTab("trabajos");setInsertPreview(null);};
  const archivar=id=>{setTrabajos(t=>t.map(j=>j.id===id?{...j,archivado:true,startOverride:null}:j));showToast("Archivado");};
  const restaurar=id=>{setTrabajos(t=>t.map(j=>j.id===id?{...j,archivado:false}:j));showToast("Restaurado");};
  const eliminar=id=>{if(confirm("¿Eliminar permanentemente?"))setTrabajos(t=>t.filter(j=>j.id!==id));};
  const updEtapa=(i,f,v)=>setForm(fm=>({...fm,etapas:fm.etapas.map((e,idx)=>idx===i?{...e,[f]:v}:e)}));
  const addEtapa=()=>setForm(f=>({...f,etapas:[...f.etapas,{nombre:"",horas:0,hechas:0}]}));
  const remEtapa=i=>setForm(f=>({...f,etapas:f.etapas.filter((_,idx)=>idx!==i)}));
  const addGasto=()=>{if(!gastoForm.jobId||!gastoForm.monto)return alert("Selecciona trabajo y monto.");const desc=gastoForm.cat==="Materiales"?(gastoForm.desc+(gastoForm.nota?` — ${gastoForm.nota}`:"")):gastoForm.desc;setTrabajos(t=>t.map(j=>j.id===parseInt(gastoForm.jobId)?{...j,gastos:[...j.gastos,{id:Date.now(),desc:desc||gastoForm.cat,monto:gastoForm.monto,cat:gastoForm.cat}]}:j));setGastoForm(f=>({...f,desc:"",monto:"",nota:""}));showToast("Gasto registrado");};
  const delGasto=(jid,gid)=>setTrabajos(t=>t.map(j=>j.id===jid?{...j,gastos:j.gastos.filter(g=>g.id!==gid)}:j));
  const togglePF=id=>{setTrabajos(t=>t.map(j=>j.id===id?{...j,pagoFinalRecibido:!j.pagoFinalRecibido}:j));showToast("Pago actualizado");};
  const totalHF=()=>form.etapas.reduce((s,e)=>s+num(e.horas),0);
  const borrarTodo=()=>{if(confirm("¿Borrar TODOS los datos?"))setTrabajos([]);};
  const alertasTiempo=schedule.filter(j=>j.tarde);

  const S={
    card:{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",marginBottom:12},
    lbl:{fontSize:13,color:"var(--color-text-secondary)",display:"block",marginBottom:4},
    row2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12},
    btn:{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"6px 14px",cursor:"pointer",fontSize:13,color:"var(--color-text-primary)"},
    btnG:{background:"#1D9E75",border:"none",borderRadius:"var(--border-radius-md)",padding:"8px 18px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:500},
    btnR:{background:"transparent",border:"0.5px solid var(--color-border-danger)",borderRadius:"var(--border-radius-md)",padding:"6px 14px",cursor:"pointer",fontSize:13,color:"var(--color-text-danger)"},
    navBtn:a=>({background:a?"var(--color-background-secondary)":"transparent",border:"0.5px solid "+(a?"var(--color-border-secondary)":"transparent"),borderRadius:"var(--border-radius-md)",padding:"6px 14px",fontSize:14,cursor:"pointer",color:a?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:a?500:400}),
    peligro:{background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"0.5px solid var(--color-border-danger)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",marginBottom:10,fontSize:13},
    aviso:{background:"var(--color-background-warning)",color:"var(--color-text-warning)",border:"0.5px solid var(--color-border-warning)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",marginBottom:10,fontSize:13},
    ok:{background:"var(--color-background-success)",color:"var(--color-text-success)",border:"0.5px solid var(--color-border-success)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",marginBottom:10,fontSize:13},
  };

  const ImpactoPanel=({imp,schedDes,dark})=>{
    if(!imp)return null;const{viable,enRiesgoNuevo,retrasados,diasRetraso}=imp;
    const cS=dark?{peligro:{background:"#fdecea",color:"#a3261d",border:"1px solid #f5c6c2",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:13},aviso:{background:"#fff6e6",color:"#8a5a00",border:"1px solid #f0d9a8",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:13},ok:{background:"#eaf7f0",color:"#1a6b48",border:"1px solid #b8e0cc",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:13}}:S;
    if(retrasados.length===0&&enRiesgoNuevo.length===0)return <div style={cS.ok}>✅ Sin impacto. Todas las entregas siguen a tiempo.</div>;
    return <div>
      {!viable&&<div style={cS.peligro}><div style={{fontWeight:500,marginBottom:6}}>🚨 No es viable sin atrasar compromisos</div>{enRiesgoNuevo.map(j=><div key={j.id} style={{fontSize:12}}>· <strong>{j.nombre}</strong> quedaría tarde — comprometido {j.fechaEntrega?fmtShort(parseDate(j.fechaEntrega)):"sin fecha"}</div>)}</div>}
      {retrasados.length>0&&<div style={cS.aviso}><div style={{fontWeight:500,marginBottom:6}}>⚠️ Se retrasan:</div>{retrasados.map(j=>{const dr=diasRetraso(j);const sj=schedDes&&schedDes.find(s=>s.id===j.id);return <div key={j.id} style={{fontSize:12,marginTop:3}}>· <strong>{j.nombre}</strong> — <strong>{dr} día{dr!==1?"s":""}</strong> más{sj&&<span> → {fmtShort(sj.fin)}</span>}{j.fechaEntrega&&<span style={{color:sj&&sj.tarde?"#a3261d":"inherit"}}> (comprometido: {fmtShort(parseDate(j.fechaEntrega))})</span>}</div>;})}</div>}
    </div>;
  };

  // ── Panel de entregas (siempre visible en cierre) ─────────────────
  const PanelEntregas=()=>(
    <div style={{...S.card,background:"var(--color-background-secondary)"}}>
      <div style={{fontWeight:500,fontSize:14,marginBottom:10}}>📅 ¿Voy a llegar a las entregas?</div>
      {schedule.filter(j=>j.fechaEntrega).length===0&&<div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Ningún trabajo tiene fecha de entrega comprometida.</div>}
      {schedule.filter(j=>j.fechaEntrega).map(j=>(
        <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:j.color,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500}}>{j.nombre}</div><div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{j.cliente} · termina {fmtShort(j.fin)}</div></div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:500,color:j.tarde?"var(--color-text-danger)":"var(--color-text-success)"}}>{j.tarde?"⚠️ Tarde":"✅ A tiempo"}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{j.tarde?`${Math.abs(j.diasMargen)} día(s) tarde`:`${j.diasMargen} día(s) de margen`}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // Fechas estimadas por etapa de cada trabajo (para mostrar en el desglose)
  const etapasFechas=useMemo(()=>{
    const mapa={}; // jobId -> { etapaNombre: {inicio, fin} }
    schedule.forEach(j=>{
      mapa[j.id]={};
      let cur=new Date(j.inicio);let restDia=horasDelDia(cur,excepciones);
      j.etapas.forEach(e=>{
        const p=pend(e);
        if(p<=0){mapa[j.id][e.nombre]=null;return;}
        const ini=new Date(cur);
        let h=p;
        while(h>0.001){const usado=Math.min(h,restDia);h=parseFloat((h-usado).toFixed(2));restDia=parseFloat((restDia-usado).toFixed(2));if(restDia<=0.001&&h>0.001){cur=addDays(cur,1);while(horasDelDia(cur,excepciones)===0)cur=addDays(cur,1);restDia=horasDelDia(cur,excepciones);}}
        mapa[j.id][e.nombre]={inicio:ini,fin:new Date(cur)};
        if(restDia<=0.001){cur=addDays(cur,1);while(horasDelDia(cur,excepciones)===0)cur=addDays(cur,1);restDia=horasDelDia(cur,excepciones);}
      });
    });
    return mapa;
  },[schedule,excepciones]);

  // TarjetaCierre: proyecto colapsable con todas sus etapas
  const TarjetaCierre=({j})=>{
    const [abierto,setAbierto]=useState(false);
    const [editEtapa,setEditEtapa]=useState(null);
    const [val,setVal]=useState("");
    const sched_j=schedule.find(s=>s.id===j.id);
    const hechas=j.etapas.reduce((s,e)=>s+num(e.hechas),0);
    const plan=totalHoras(j);
    const pctAvance=plan>0?Math.round((hechas/plan)*100):0;
    const completo=totalPend(j)===0;
    const fechas=etapasFechas[j.id]||{};

    return(
      <div style={{...S.card,borderLeft:`4px solid ${j.color}`,opacity:completo?0.65:1,padding:0,overflow:"hidden",marginBottom:14}}>
        {/* header clickable */}
        <div onClick={()=>setAbierto(a=>!a)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem 1.25rem",cursor:"pointer"}}>
          <div style={{display:"flex",gap:14,alignItems:"center",flex:1,minWidth:0}}>
            <span style={{fontSize:22,color:"var(--color-text-secondary)",width:20,flexShrink:0,lineHeight:1}}>{abierto?"−":"+"}</span>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:600,fontSize:16,marginBottom:2}}>{j.nombre}</div>
              <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{j.cliente} · {completo?"✅ completado":`${totalPend(j)}h pendientes`}{hechas>0&&!completo&&` · ${pctAvance}%`}</div>
            </div>
          </div>
          {j.fechaEntrega&&<span style={{fontSize:13,fontWeight:500,flexShrink:0,marginLeft:10,padding:"4px 10px",borderRadius:6,background:sched_j?.tarde?"var(--color-background-danger)":"var(--color-background-success)",color:sched_j?.tarde?"var(--color-text-danger)":"var(--color-text-success)"}}>{sched_j?.tarde?"⚠️ tarde":"✅ a tiempo"}</span>}
        </div>
        {hechas>0&&<div style={{height:4,background:"var(--color-background-secondary)",margin:"0 1.25rem 0.8rem"}}><div style={{width:pctAvance+"%",height:"100%",background:"#1D9E75",borderRadius:2}}/></div>}

        {abierto&&<div style={{padding:"0.5rem 1.25rem 1.1rem",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
          {j.etapas.map((e,i)=>{
            const p=pend(e);const hecho=p<=0;const enParte=num(e.hechas)>0&&!hecho;
            const f=fechas[e.nombre];const enEd=editEtapa===e.nombre;
            return(
              <div key={i} style={{padding:"14px 0",borderBottom:i<j.etapas.length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <span style={{fontSize:18,flexShrink:0,width:22,textAlign:"center"}}>{hecho?"✅":enParte?"🔵":"⬜"}</span>
                  <div style={{flex:1,minWidth:120}}>
                    <div style={{fontSize:15,fontWeight:hecho?400:500,textDecoration:hecho?"line-through":"none",color:hecho?"var(--color-text-secondary)":"var(--color-text-primary)",marginBottom:3}}>{e.nombre}</div>
                    <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>
                      {hecho?`${num(e.horas)}h completadas`:`${num(e.hechas)} de ${num(e.horas)}h${f?` · estimado ${fmtShort(f.inicio)}`:""}`}
                    </div>
                  </div>
                  {!hecho&&!enEd&&<div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button style={{...S.btn,padding:"6px 14px",fontSize:13}} onClick={()=>{setEditEtapa(e.nombre);setVal("");}}>Cargar horas</button>
                    <button style={{...S.btnG,padding:"6px 14px",fontSize:13}} onClick={()=>completarEtapa(j.id,e.nombre)}>✓ Terminada</button>
                  </div>}
                  {hecho&&<button style={{...S.btn,padding:"5px 12px",fontSize:12,flexShrink:0}} onClick={()=>setTrabajos(t=>t.map(x=>x.id!==j.id?x:{...x,etapas:x.etapas.map(et=>et.nombre===e.nombre?{...et,hechas:0}:et)}))}>Deshacer</button>}
                </div>
                {enEd&&<div style={{display:"flex",gap:10,alignItems:"center",marginTop:12,paddingLeft:34,flexWrap:"wrap"}}>
                  <span style={{fontSize:14}}>¿Cuántas horas trabajé?</span>
                  <input type="number" min={0.5} step={0.5} value={val} onChange={ev=>setVal(ev.target.value)} placeholder="h" style={{width:80,fontSize:15,padding:"7px 10px"}} autoFocus
                    onKeyDown={ev=>{if(ev.key==="Enter"&&num(val)>0){avanzarHoras(j.id,e.nombre,val);setEditEtapa(null);setVal("");}if(ev.key==="Escape"){setEditEtapa(null);setVal("");}}}/>
                  <button style={{...S.btnG,padding:"7px 16px",fontSize:13}} onClick={()=>{if(num(val)>0)avanzarHoras(j.id,e.nombre,val);setEditEtapa(null);setVal("");}}>Guardar</button>
                  <button style={{...S.btn,padding:"7px 14px",fontSize:13}} onClick={()=>{setEditEtapa(null);setVal("");}}>Cancelar</button>
                </div>}
              </div>
            );
          })}
          {!completo&&<div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
            <button style={{...S.btn,padding:"7px 14px",fontSize:13}} onClick={()=>pedirMover(j.id,nextWork(addDays(new Date(),1),excepciones))}>📆 No pude avanzar — posponer este trabajo</button>
          </div>}
        </div>}
      </div>
    );
  };

  return(
  <div style={{fontFamily:"var(--font-sans)",color:"var(--color-text-primary)",maxWidth:780,margin:"0 auto",padding:"1rem"}}>
    {toast&&<div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.tipo==="warn"?"var(--color-background-warning)":"var(--color-background-success)",color:toast.tipo==="warn"?"var(--color-text-warning)":"var(--color-text-success)",border:"0.5px solid",borderColor:toast.tipo==="warn"?"var(--color-border-warning)":"var(--color-border-success)",borderRadius:"var(--border-radius-md)",padding:"10px 18px",fontSize:13,fontWeight:500}}>{toast.tipo==="warn"?"⚠️":"✅"} {toast.msg}</div>}
    <input type="file" accept=".json" ref={fileRef} onChange={importarArchivo} style={{display:"none"}}/>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem",flexWrap:"wrap",gap:8}}>
      <div><h2 style={{fontSize:18,fontWeight:500,margin:0}}>Planeación del taller</h2><p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"2px 0 0"}}>Lun–Vie 8h · Sáb 4h · Dom descanso</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button style={S.btn} onClick={()=>exportarJSON(trabajos,excepciones,materialesExtra)} title="Respaldo completo">💾 Respaldo</button>
        <button style={S.btn} onClick={()=>fileRef.current.click()} title="Restaurar respaldo">📂 Importar</button>
        <button style={S.btn} onClick={()=>exportarCSV(trabajos)} title="Exportar a Excel">📊 Excel</button>
        <button style={S.btnR} onClick={borrarTodo}>🗑</button>
      </div>
    </div>

    {alertasTiempo.length>0&&<div style={{...S.peligro,margin:"10px 0"}}>⚠️ Entrega en riesgo: {alertasTiempo.map(a=>a.nombre).join(", ")}</div>}
    {finGlobal.enRiesgo.length>0&&<div style={{...S.aviso,margin:"6px 0 10px"}}>⚠️ Dinero insuficiente en: {finGlobal.enRiesgo.map(j=>j.nombre).join(", ")}</div>}

    <nav style={{display:"flex",gap:8,margin:"1rem 0",borderBottom:"0.5px solid var(--color-border-tertiary)",paddingBottom:8,flexWrap:"wrap"}}>
      {[["cierre","✓ Cierre de día"],["trabajos","Trabajos"],["gantt","Gantt"],["finanzas","💰 Finanzas"],["historial","📁 Historial"]].map(([k,v])=>(
        <button key={k} style={S.navBtn(tab===k)} onClick={()=>setTab(k)}>{v}</button>
      ))}
    </nav>

    {/* CIERRE DE DÍA */}
    {tab==="cierre"&&<div>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>Al final del día, registra lo que hiciste. El plan y las entregas se recalculan solos.</p>
      <PanelEntregas/>
      <div style={{fontWeight:500,fontSize:14,margin:"16px 0 8px"}}>¿Qué hiciste hoy?</div>
      {activos.length===0&&<div style={{...S.card,textAlign:"center",color:"var(--color-text-secondary)",padding:"2rem"}}>Sin trabajos activos.</div>}
      {activos.map(j=><TarjetaCierre key={j.id} j={j}/>)}
    </div>}

    {/* TRABAJOS */}
    {tab==="trabajos"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>⠿ Arrastra para reordenar · {activos.length} activo(s)</span>
        <button style={S.btnG} onClick={openNew}>+ Nuevo trabajo</button>
      </div>
      {activos.length===0&&<div style={{...S.card,textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)"}}>🪚 Sin trabajos activos.</div>}
      {schedule.map((j,idx)=>{const hechas=j.etapas.reduce((s,e)=>s+num(e.hechas),0);const plan=totalHoras(j);const pctAvance=plan>0?Math.round((hechas/plan)*100):0;
        return(<div key={j.id} draggable onDragStart={()=>{dragIdx.current=idx;}} onDragEnter={()=>{dragOver.current=idx;}} onDragOver={e=>e.preventDefault()} onDrop={onDrop} style={{...S.card,borderLeft:`3px solid ${j.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{color:"var(--color-text-secondary)",fontSize:18,cursor:"grab",marginTop:2}}>⠿</span><div><div style={{fontWeight:500,fontSize:15}}>{j.nombre}</div><div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{j.cliente}{j.telefono&&` · ${j.telefono}`}</div></div></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>openEdit(j)}>Editar</button><button style={S.btn} onClick={()=>archivar(j.id)}>Archivar</button><button style={S.btnR} onClick={()=>eliminar(j.id)}>Eliminar</button></div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap",fontSize:13}}>
            <span>📅 {fmtShort(j.inicio)} → {fmtShort(j.fin)}</span>
            {j.fechaEntrega&&<span style={{color:j.tarde?"var(--color-text-danger)":"var(--color-text-success)"}}>{j.tarde?"⚠️":"✅"} {fmtShort(parseDate(j.fechaEntrega))}</span>}
            <span>⏱ {j.totalH.toFixed(0)}h pend.{hechas>0&&` · ${pctAvance}% hecho`}</span>
            {num(j.total)>0&&<span>💰 {money(num(j.total))} · <span style={{color:margen(j)>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{margenPct(j)}%</span></span>}
          </div>
          {hechas>0&&<div style={{height:4,background:"var(--color-background-secondary)",borderRadius:3,margin:"8px 0 0",overflow:"hidden"}}><div style={{width:pctAvance+"%",height:"100%",background:"#1D9E75"}}/></div>}
          <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}><button onClick={()=>togglePF(j.id)} style={{...S.btn,padding:"3px 10px",fontSize:12,color:j.pagoFinalRecibido?"var(--color-text-success)":"var(--color-text-secondary)"}}>{j.pagoFinalRecibido?"✅ Pago recibido":"⬜ Pago pendiente"}</button><button style={{...S.btn,padding:"3px 10px",fontSize:12}} onClick={()=>pedirMover(j.id,j.inicio)}>📆 Mover fecha</button></div>
        </div>);})}
    </div>}

    {/* GANTT */}
    {tab==="gantt"&&<div>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:4}}>Línea de tiempo completa — huecos = días libres</p>
      <div style={{display:"flex",gap:16,fontSize:11,color:"var(--color-text-secondary)",marginBottom:12,flexWrap:"wrap"}}><span><span style={{display:"inline-block",width:10,height:10,background:"var(--color-background-secondary)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Finde</span><span><span style={{display:"inline-block",width:10,height:10,border:"0.5px dashed var(--color-border-tertiary)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Día libre</span></div>
      {schedule.length===0&&<div style={{...S.card,textAlign:"center",color:"var(--color-text-secondary)",padding:"2rem"}}>Sin trabajos.</div>}
      <div style={{overflowX:"auto"}}><div style={{minWidth:Math.max(totalDiasG*24+180,400)}}>
        <div style={{display:"flex",marginLeft:160,marginBottom:2}}>{Array.from({length:totalDiasG}).map((_,i)=>{const d=addDays(ganttStart,i);const key=isoDate(d);const dow=d.getDay();const esHoy=key===isoDate(new Date());const finde=dow===0||dow===6;const exA=excepciones[key]!==undefined&&excepciones[key]>0;return <div key={i} style={{width:24,flexShrink:0,fontSize:9,textAlign:"center",color:esHoy?"#1D9E75":"var(--color-text-secondary)",background:exA?"#1D9E7522":finde?"var(--color-background-secondary)":"transparent",fontWeight:esHoy?700:400,borderLeft:esHoy?"2px solid #1D9E75":"none",boxSizing:"border-box"}}>{d.getDate()}</div>;})}</div>
        {schedule.map(j=>{const offset=Math.round((j.inicio-ganttStart)/86400000);const dur=Math.round((j.fin-j.inicio)/86400000)+1;return(<div key={j.id} style={{display:"flex",alignItems:"center",marginBottom:4}}><div style={{width:160,flexShrink:0,fontSize:12,paddingRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={j.nombre}>{j.nombre}</div><div style={{position:"relative",flex:1,height:20,display:"flex"}}>{Array.from({length:totalDiasG}).map((_,i)=>{const d=addDays(ganttStart,i);const key=isoDate(d);const dow=d.getDay();const finde=dow===0||dow===6;const exA=excepciones[key]!==undefined&&excepciones[key]>0;const enRango=i>=offset&&i<offset+dur;const libre=!diasOcupados.has(key)&&!finde&&!exA;let bg="transparent";if(enRango)bg=j.color;else if(exA)bg="#1D9E7522";else if(finde)bg="var(--color-background-secondary)";return <div key={i} style={{width:24,flexShrink:0,height:20,background:bg,border:libre?"0.5px dashed var(--color-border-tertiary)":"none",boxSizing:"border-box",borderRadius:(i===offset||i===offset+dur-1)?4:0}}/>;})}{j.fechaEntrega&&(()=>{const eOff=Math.round((parseDate(j.fechaEntrega)-ganttStart)/86400000);if(eOff<0||eOff>=totalDiasG)return null;return <div style={{position:"absolute",left:eOff*24+11,top:0,width:2,height:20,background:j.tarde?"#E24B4A":"#1D9E75",zIndex:2}}/>;})()}</div></div>);})}
      </div></div>
    </div>}

    {/* FINANZAS */}
    {tab==="finanzas"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
        {[["Caja disponible",money(finGlobal.caja),finGlobal.caja>=0?"var(--color-background-success)":"var(--color-background-danger)",finGlobal.caja>=0?"var(--color-text-success)":"var(--color-text-danger)"],["Anticipos",money(finGlobal.anticipos),null,null],["Pagos finales",money(finGlobal.pagosF),null,null],["Total gastado",money(finGlobal.gastado),null,null],["Por cobrar",money(finGlobal.porCobrar),"var(--color-background-warning)","var(--color-text-warning)"],["Horas totales",finGlobal.horasTotales.toFixed(0)+"h",null,null],["Ingreso / hora",money(finGlobal.iph),null,"var(--color-text-success)"]].map(([l,v,bg,tc])=>(<div key={l} style={{background:bg||"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.75rem",textAlign:"center"}}><div style={{fontSize:11,color:tc||"var(--color-text-secondary)",marginBottom:4}}>{l}</div><div style={{fontSize:16,fontWeight:500,color:tc||"var(--color-text-primary)"}}>{v}</div></div>))}
      </div>
      <div style={S.card}>
        <div style={{fontWeight:500,fontSize:14,marginBottom:10}}>Registrar gasto</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
          <div><label style={S.lbl}>Trabajo</label><select value={gastoForm.jobId} onChange={e=>setGastoForm(f=>({...f,jobId:e.target.value}))} style={{width:"100%"}}><option value="">Selecciona…</option>{trabajos.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}</select></div>
          <div><label style={S.lbl}>Categoría</label><select value={gastoForm.cat} onChange={e=>setGastoForm(f=>({...f,cat:e.target.value,desc:""}))} style={{width:"100%"}}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={S.lbl}>Monto</label><input type="number" value={gastoForm.monto} onChange={e=>setGastoForm(f=>({...f,monto:e.target.value}))} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div>
          <button style={{...S.btnG,padding:"8px 12px"}} onClick={addGasto}>+</button>
        </div>
        <div style={{marginTop:10}}>
          {gastoForm.cat==="Materiales"?(<div><label style={S.lbl}>Material</label><select value={gastoForm.desc} onChange={e=>{if(e.target.value==="__nuevo__")setMostrarNuevoMat(true);else{setGastoForm(f=>({...f,desc:e.target.value}));setMostrarNuevoMat(false);}}} style={{width:"100%",marginBottom:8}}><option value="">Selecciona material…</option>{materiales.filter(m=>m!=="Otro").map(m=><option key={m} value={m}>{m}</option>)}<option value="__nuevo__">+ Agregar material nuevo…</option></select>{mostrarNuevoMat&&<div style={{display:"flex",gap:8,marginBottom:8}}><input value={nuevoMaterial} onChange={e=>setNuevoMaterial(e.target.value)} placeholder="Material nuevo" style={{flex:1}} autoFocus onKeyDown={e=>{if(e.key==="Enter")agregarMaterial();if(e.key==="Escape"){setMostrarNuevoMat(false);setNuevoMaterial("");}}}/><button style={{...S.btnG,padding:"6px 12px",fontSize:13}} onClick={agregarMaterial}>Agregar</button><button style={{...S.btn,padding:"6px 10px",fontSize:13}} onClick={()=>{setMostrarNuevoMat(false);setNuevoMaterial("");}}>✕</button></div>}<input value={gastoForm.nota} onChange={e=>setGastoForm(f=>({...f,nota:e.target.value}))} placeholder="Nota adicional (opcional)" style={{width:"100%",boxSizing:"border-box",fontSize:13}}/></div>):(<div><label style={S.lbl}>Descripción</label><input value={gastoForm.desc} onChange={e=>setGastoForm(f=>({...f,desc:e.target.value}))} placeholder="Descripción del gasto" style={{width:"100%",boxSizing:"border-box"}}/></div>)}
        </div>
      </div>
      <div style={{fontWeight:500,fontSize:14,marginBottom:8}}>Rentabilidad por trabajo</div>
      {trabajos.length===0&&<div style={{...S.card,textAlign:"center",color:"var(--color-text-secondary)",padding:"1.5rem"}}>Sin trabajos.</div>}
      {trabajos.map(j=>{const gT=totalGastos(j);const mg=margen(j);const sb=saldoJob(j);const hT=totalHoras(j);const iph=ingresosPorHora(j);const pct=num(j.total)>0?Math.min(100,Math.round((gT/num(j.total))*100)):0;const iphPct=maxIph>0?Math.round((iph/maxIph)*100):0;
        return(<div key={j.id} style={{...S.card,borderLeft:`3px solid ${j.color}`,opacity:j.archivado?0.75:1}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontWeight:500}}>{j.nombre}{j.archivado&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}> · archivado</span>}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{j.cliente}</div></div><div style={{textAlign:"right",fontSize:13}}><div>Precio: <strong>{money(num(j.total))}</strong></div><div style={{color:mg>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>Margen: <strong>{money(mg)} ({margenPct(j)}%)</strong></div></div></div>
          <div style={{height:4,background:"var(--color-background-secondary)",borderRadius:3,marginBottom:4,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:pct>90?"#E24B4A":pct>70?"#BA7517":"#1D9E75"}}/></div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:10}}>Gastos vs precio: {pct}%</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10,fontSize:11}}>{[["Precio",money(num(j.total)),null],["Anticipo",money(num(j.anticipo)),null],["Gastado",money(gT),null],["Saldo",money(sb),sb<0?"var(--color-text-danger)":"var(--color-text-success)"],["Horas",hT.toFixed(1)+"h",null]].map(([l,v,c])=>(<div key={l} style={{background:"var(--color-background-secondary)",borderRadius:6,padding:"5px 6px",textAlign:"center"}}><div style={{color:"var(--color-text-secondary)",marginBottom:2,fontSize:10}}>{l}</div><div style={{fontWeight:500,color:c||"var(--color-text-primary)",fontSize:12}}>{v}</div></div>))}</div>
          <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"var(--color-text-secondary)"}}>Ingreso por hora trabajada</span><span style={{fontWeight:500,color:iphPct>=70?"var(--color-text-success)":iphPct>=40?"var(--color-text-warning)":"var(--color-text-danger)"}}>{money(iph)}/h</span></div><div style={{height:6,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}><div style={{width:iphPct+"%",height:"100%",background:iphPct>=70?"#1D9E75":iphPct>=40?"#BA7517":"#E24B4A"}}/></div></div>
          {j.gastos.map(g=>(<div key={g.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}><span style={{color:"var(--color-text-secondary)",fontSize:11,minWidth:70}}>{g.cat}</span><span style={{flex:1,marginLeft:6}}>{g.desc}</span><span style={{fontWeight:500,marginRight:8}}>{money(num(g.monto))}</span><button onClick={()=>delGasto(j.id,g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--color-text-danger)",fontSize:15,padding:0}}>×</button></div>))}
          {j.gastos.length===0&&<div style={{fontSize:12,color:"var(--color-text-secondary)"}}>Sin gastos.</div>}
        </div>);})}
    </div>}

    {/* HISTORIAL */}
    {tab==="historial"&&<div>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>Registro histórico de trabajos terminados.</p>
      {archivados.length===0&&<div style={{...S.card,textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)"}}>📁 Sin archivados.</div>}
      {archivados.map(j=>(<div key={j.id} style={{...S.card,borderLeft:`3px solid ${j.color}`,opacity:0.8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontWeight:500}}>{j.nombre}</div><div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{j.cliente}</div></div><div style={{display:"flex",gap:6}}><button style={S.btn} onClick={()=>restaurar(j.id)}>Restaurar</button><button style={S.btnR} onClick={()=>eliminar(j.id)}>Eliminar</button></div></div><div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap",fontSize:13}}>{j.fechaEntrega&&<span>📅 {fmtShort(parseDate(j.fechaEntrega))}</span>}<span>💰 {money(num(j.total))}</span><span style={{color:margen(j)>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>Margen: {money(margen(j))} ({margenPct(j)}%)</span><span>⏱ {totalHoras(j).toFixed(0)}h · {money(ingresosPorHora(j))}/h</span></div></div>))}
      {archivados.length>0&&<div style={{...S.card,background:"var(--color-background-secondary)"}}><div style={{fontWeight:500,fontSize:13,marginBottom:8}}>Resumen histórico</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,fontSize:13}}><div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>Trabajos</div><div style={{fontWeight:500}}>{archivados.length}</div></div><div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>Facturado</div><div style={{fontWeight:500}}>{money(archivados.reduce((s,j)=>s+num(j.total),0))}</div></div><div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>Margen prom.</div><div style={{fontWeight:500,color:"var(--color-text-success)"}}>{Math.round(archivados.reduce((s,j)=>s+margenPct(j),0)/archivados.length)}%</div></div><div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>$/hora prom.</div><div style={{fontWeight:500,color:"var(--color-text-success)"}}>{money(Math.round(archivados.reduce((s,j)=>s+ingresosPorHora(j),0)/archivados.length))}</div></div></div></div>}
    </div>}

    {/* FORMULARIO */}
    {tab==="form"&&<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1rem"}}><button style={S.btn} onClick={()=>{setTab("trabajos");setInsertPreview(null);}}>← Volver</button><h3 style={{margin:0,fontSize:16,fontWeight:500}}>{editando?"Editar trabajo":"Nuevo trabajo"}</h3></div>
      <div style={S.card}>
        <div style={S.row2}><div><label style={S.lbl}>Nombre *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Closet recámara" style={{width:"100%",boxSizing:"border-box"}}/></div><div><label style={S.lbl}>Cliente</label><input value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))} placeholder="Nombre" style={{width:"100%",boxSizing:"border-box"}}/></div></div>
        <div style={S.row2}><div><label style={S.lbl}>Teléfono</label><input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="81 1234 5678" style={{width:"100%",boxSizing:"border-box"}}/></div><div><label style={S.lbl}>Fecha de entrega comprometida</label><input type="date" value={form.fechaEntrega} onChange={e=>setForm(f=>({...f,fechaEntrega:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}}/></div></div>
        <div style={S.row2}><div><label style={S.lbl}>Anticipo ($)</label><input type="number" value={form.anticipo} onChange={e=>setForm(f=>({...f,anticipo:e.target.value}))} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div><div><label style={S.lbl}>Precio total ($)</label><input type="number" value={form.total} onChange={e=>setForm(f=>({...f,total:e.target.value}))} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div></div>
        <div style={{marginBottom:12}}><label style={S.lbl}>Notas</label><textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} rows={2} style={{width:"100%",boxSizing:"border-box",resize:"vertical"}}/></div>
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:500,fontSize:14}}>Etapas</div><span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{totalHF().toFixed(1)}h · ~{Math.ceil(totalHF()/HORAS_DIA)} día(s)</span></div>
        {form.etapas.map((e,i)=>(<div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}><input value={e.nombre} onChange={ev=>updEtapa(i,"nombre",ev.target.value)} placeholder="Etapa" style={{flex:2}}/><input type="number" value={e.horas||""} onChange={ev=>updEtapa(i,"horas",parseFloat(ev.target.value)||0)} placeholder="h" min={0} step={0.5} style={{flex:1,maxWidth:72}}/><button style={{...S.btn,padding:"4px 10px",color:"var(--color-text-danger)"}} onClick={()=>remEtapa(i)}>×</button></div>))}
        <button style={{...S.btn,marginTop:4}} onClick={addEtapa}>+ Etapa</button>
      </div>
      {!editando&&activos.length>0&&<div style={S.card}>
        <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>¿En qué posición va este trabajo?</div>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:0,marginBottom:12}}>El ícono muestra si afecta los compromisos existentes.</p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>{[...Array(activos.length+1)].map((_,pos)=>{const label=pos===0?"Al inicio":pos===activos.length?"Al final":`Después de: ${activos[pos-1].nombre}`;const sel=insertPos===pos;const prev=form.nombre.trim()?(()=>{try{const l=[...activos];l.splice(pos,0,{...form,id:-1});const s2=simSchedule(l,excepciones);return calcImpacto(schedule,s2.filter(j=>j.id!==-1));}catch(e){return null;}})():null;const icon=!prev?"":(prev.viable&&prev.retrasados.length===0)?"✅":prev.viable?"⚠️":"🚨";return(<label key={pos} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:`1px solid ${sel?"#1D9E75":"var(--color-border-tertiary)"}`,background:sel?"#1D9E7511":"transparent",cursor:"pointer"}}><input type="radio" name="insertPos" checked={sel} onChange={()=>setInsertPos(pos)} style={{accentColor:"#1D9E75"}}/><span style={{flex:1,fontSize:13}}>{label}</span><span style={{fontSize:14}}>{icon}</span></label>);})}</div>
        {insertPreview&&form.nombre.trim()&&<div style={{marginTop:14}}><div style={{fontSize:13,fontWeight:500,marginBottom:6,color:"var(--color-text-secondary)"}}>Detalle del impacto:</div><ImpactoPanel imp={insertPreview.imp} schedDes={insertPreview.sched2}/></div>}
      </div>}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>{setTab("trabajos");setInsertPreview(null);}}>Cancelar</button><button style={S.btnG} onClick={saveJob}>{editando?"Guardar cambios":"Agregar trabajo"}</button></div>
    </div>}

    {/* MODALES */}
    {modal&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"1rem"}}>
      <div style={{background:"#ffffff",color:"#111",border:"1px solid #ddd",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
        {modal.tipo==="mover"&&<>
          <div style={{fontWeight:500,fontSize:16,marginBottom:4,color:"#111"}}>Mover inicio: {modal.job.nombre}</div>
          <div style={{fontSize:13,color:"#666",marginBottom:14}}>El resto de los trabajos se recalcula automáticamente.</div>
          <div style={{marginBottom:14}}><label style={{fontSize:13,color:"#666",display:"block",marginBottom:4}}>Nueva fecha de inicio</label><input type="date" defaultValue={modal.nuevaFecha} onChange={e=>onCambioFechaMover(e.target.value)} style={{width:"100%",boxSizing:"border-box",fontSize:14,padding:"8px",border:"1px solid #ccc",borderRadius:6}}/></div>
          <ImpactoPanel imp={modal.impacto} schedDes={modal.schedDes} dark/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}><button style={{background:"transparent",border:"1px solid #ccc",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#333"}} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnG} onClick={confirmarMover}>Confirmar</button></div>
        </>}
        {modal.tipo==="reorden"&&<>
          <div style={{fontWeight:500,fontSize:16,marginBottom:8,color:"#111"}}>Revisar impacto del reorden</div>
          <ImpactoPanel imp={modal.impacto} schedDes={modal.schedDes||simSchedule(modal.arr.filter(j=>!j.archivado),excepciones)} dark/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}><button style={{background:"transparent",border:"1px solid #ccc",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#333"}} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnG} onClick={confirmarReorden}>Aceptar de todos modos</button></div>
        </>}
      </div>
    </div>}
  </div>
  );
}