import { useState, useMemo, useEffect, useRef } from "react";

const HORAS_DIA=8, HORAS_SAB=4;
const COLORS=["#1D9E75","#378ADD","#D85A30","#BA7517","#7F77DD","#D4537E","#639922","#E24B4A"];
const CATS=["Materiales","Herramienta","Transporte","Mano de obra","Otro"];
const MATERIALES_BASE=["Madera MDF","Madera aglomerada","Madera pino","Madera roble","Madera cedro","Tablero melamínico","Triplay","Tablaroca","Herrajes","Bisagras","Correderas","Jaladores","Chapas y cerraduras","Tornillos y clavos","Pegamento/adhesivo","Lija","Sellador","Pintura","Barniz","Tinte","Vidrio","Espejo","Perfil metálico","Tubo cuadrado","Perfil de aluminio","Silicón","Masilla","Fibra de vidrio","Otro"];
const ETAPAS_DEF=["Medición y diseño","Compra de materiales","Corte","Ensamble","Acabado/pintura","Entrega"];
const STORAGE_KEY="taller_v2";

const DEMO=[
  {id:1,nombre:"Closet recámara principal",cliente:"Sra. García",telefono:"81 2345 6789",anticipo:"3500",total:"9000",fechaEntrega:"2026-06-06",startOverride:null,posicion:0,etapas:[{nombre:"Medición y diseño",horas:3},{nombre:"Compra de materiales",horas:2},{nombre:"Corte",horas:8},{nombre:"Ensamble",horas:10},{nombre:"Acabado/pintura",horas:5},{nombre:"Entrega",horas:2}],gastos:[{id:11,desc:"Madera MDF 18mm",monto:"2100",cat:"Materiales"},{id:12,desc:"Herrajes y correderas",monto:"680",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"Color blanco mate.",color:"#1D9E75"},
  {id:2,nombre:"Estante para sala",cliente:"Familia Rodríguez",telefono:"81 3456 7890",anticipo:"1200",total:"3200",fechaEntrega:"2026-06-13",startOverride:null,posicion:1,etapas:[{nombre:"Medición y diseño",horas:2},{nombre:"Compra de materiales",horas:1},{nombre:"Corte",horas:4},{nombre:"Ensamble",horas:5},{nombre:"Acabado/pintura",horas:3},{nombre:"Entrega",horas:1}],gastos:[{id:21,desc:"Tablón pino",monto:"850",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"Flotante, 3 niveles.",color:"#378ADD"},
  {id:3,nombre:"Puerta principal roble",cliente:"Ing. Martínez",telefono:"81 4567 8901",anticipo:"5000",total:"14000",fechaEntrega:"2026-06-27",startOverride:null,posicion:2,etapas:[{nombre:"Medición y diseño",horas:4},{nombre:"Compra de materiales",horas:3},{nombre:"Corte",horas:10},{nombre:"Ensamble",horas:12},{nombre:"Acabado/pintura",horas:8},{nombre:"Entrega e instalación",horas:4}],gastos:[{id:31,desc:"Roble macizo",monto:"4200",cat:"Materiales"},{id:32,desc:"Barniz y lija",monto:"430",cat:"Materiales"},{id:33,desc:"Herrajes premium",monto:"1100",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"Bisagras ocultas.",color:"#D85A30"},
  {id:4,nombre:"Zócalos sala-comedor",cliente:"Sra. López",telefono:"81 5678 9012",anticipo:"800",total:"2400",fechaEntrega:"2026-07-04",startOverride:null,posicion:3,etapas:[{nombre:"Medición",horas:1},{nombre:"Compra de materiales",horas:1},{nombre:"Corte y perfilado",horas:5},{nombre:"Instalación",horas:6},{nombre:"Acabado",horas:2}],gastos:[{id:41,desc:"MDF ranurado",monto:"560",cat:"Materiales"},{id:42,desc:"Adhesivo y fijaciones",monto:"180",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"18 metros lineales.",color:"#BA7517"},
  {id:5,nombre:"Escritorio home office",cliente:"Dr. Herrera",telefono:"81 6789 0123",anticipo:"2000",total:"5500",fechaEntrega:"2026-07-11",startOverride:null,posicion:4,etapas:[{nombre:"Diseño y medición",horas:3},{nombre:"Compra de materiales",horas:2},{nombre:"Corte",horas:6},{nombre:"Ensamble",horas:7},{nombre:"Acabado",horas:4},{nombre:"Entrega",horas:1}],gastos:[{id:51,desc:"Tablero nogal",monto:"1800",cat:"Materiales"},{id:52,desc:"Patas metálicas",monto:"650",cat:"Materiales"}],pagoFinalRecibido:false,archivado:false,notas:"160x80cm con cajón.",color:"#7F77DD"},
];

// ── Fecha helpers ─────────────────────────────────────────────────────
function parseDate(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function isoDate(d){const r=new Date(d);r.setHours(12);return r.toISOString().split("T")[0];}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function fmtShort(d){return d.toLocaleDateString("es-MX",{day:"numeric",month:"short"});}
function fmtLong(d){return d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"});}
// horasDelDia considera excepciones de días especiales
function horasDelDia(d, excepciones={}){
  const key=isoDate(d); if(excepciones[key]!==undefined) return excepciones[key];
  const w=d.getDay(); return w===0?0:w===6?HORAS_SAB:HORAS_DIA;
}
function nextWork(d,excepciones={}){let r=new Date(d);r.setHours(0,0,0,0);while(horasDelDia(r,excepciones)===0)r=addDays(r,1);return r;}
const num=v=>parseFloat(v)||0;
const money=n=>"$"+Math.round(n).toLocaleString("es-MX");

function calcFin(etapas,start,excepciones={}){
  let h=etapas.reduce((s,e)=>s+num(e.horas),0);
  if(h===0)return nextWork(new Date(start),excepciones);
  let cur=nextWork(new Date(start),excepciones);
  while(h>0.001){
    const c=horasDelDia(cur,excepciones);const u=Math.min(h,c);
    h=parseFloat((h-u).toFixed(2));
    if(h>0.001){cur=addDays(cur,1);while(horasDelDia(cur,excepciones)===0)cur=addDays(cur,1);}
  }
  return cur;
}

function simSchedule(activos,excepciones={}){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  let cursor=nextWork(new Date(hoy),excepciones);
  return activos.map(j=>{
    const inicio=j.startOverride?nextWork(parseDate(j.startOverride),excepciones):new Date(cursor);
    const fin=calcFin(j.etapas,inicio,excepciones);
    cursor=nextWork(addDays(fin,1),excepciones);
    const entrega=j.fechaEntrega?parseDate(j.fechaEntrega):null;
    return{...j,inicio,fin,totalH:j.etapas.reduce((s,e)=>s+num(e.horas),0),tarde:!!(entrega&&fin>entrega)};
  });
}

function calcImpacto(schedAnt,schedDes){
  const enRiesgoNuevo=schedDes.filter(j=>j.tarde&&!schedAnt.find(s=>s.id===j.id&&s.tarde));
  const retrasados=schedDes.filter(j=>{const o=schedAnt.find(s=>s.id===j.id);return o&&j.fin>o.fin;});
  const diasRetraso=j=>{const o=schedAnt.find(s=>s.id===j.id);return o?Math.round((j.fin-o.fin)/86400000):0;};
  return{enRiesgoNuevo,retrasados,diasRetraso,viable:enRiesgoNuevo.length===0};
}

const defaultJob=()=>({id:Date.now(),nombre:"",cliente:"",telefono:"",anticipo:"",total:"",fechaEntrega:"",startOverride:null,posicion:999,etapas:ETAPAS_DEF.map(e=>({nombre:e,horas:0})),gastos:[],pagoFinalRecibido:false,archivado:false,notas:"",color:COLORS[Math.floor(Math.random()*COLORS.length)]});

function exportarCSV(trabajos){
  const rows=[["Trabajo","Cliente","Teléfono","Precio","Anticipo","Gastos","Margen $","Margen %","Horas totales","$/hora","Pago final","Fecha entrega","Estado","Notas"]];
  trabajos.forEach(j=>{
    const g=j.gastos.reduce((s,x)=>s+num(x.monto),0);const mg=num(j.total)-g;
    const h=j.etapas.reduce((s,e)=>s+num(e.horas),0);
    rows.push([j.nombre,j.cliente,j.telefono,num(j.total),num(j.anticipo),g,mg,num(j.total)>0?Math.round((mg/num(j.total))*100)+"%":"",(h).toFixed(1),h>0?Math.round(num(j.total)/h):"",j.pagoFinalRecibido?"Cobrado":"Pendiente",j.fechaEntrega||"",j.archivado?"Archivado":"Activo",j.notas]);
  });
  const csv="\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  a.download="taller_"+isoDate(new Date())+".csv";a.click();
}

// ── App ───────────────────────────────────────────────────────────────
export default function App(){
  const [trabajos,setTrabajos]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY);if(s){const p=JSON.parse(s);if(p.length>0)return p;}}catch(e){}return DEMO;});
  // excepciones: {isoDate: horas} — override de horas para días específicos
  const [excepciones,setExcepciones]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY+"_exc");return s?JSON.parse(s):{}}catch(e){return {};}});
  const [tab,setTab]=useState("trabajos");
  const [editando,setEditando]=useState(null);
  const [form,setForm]=useState(defaultJob());
  const [insertPos,setInsertPos]=useState(999);
  const [gastoForm,setGastoForm]=useState({jobId:"",desc:"",monto:"",cat:"Materiales"});
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [editHoras,setEditHoras]=useState(null);
  const [materialesExtra,setMaterialesExtra]=useState(()=>{try{const s=localStorage.getItem(STORAGE_KEY+"_mat");return s?JSON.parse(s):[]}catch(e){return [];}});
  const materiales=useMemo(()=>[...MATERIALES_BASE,...materialesExtra],[materialesExtra]);
  const [nuevoMaterial,setNuevoMaterial]=useState("");
  const [mostrarNuevoMat,setMostrarNuevoMat]=useState(false);

  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY+"_mat",JSON.stringify(materialesExtra));}catch(e){}},[materialesExtra]);

  function agregarMaterial(){
    const m=nuevoMaterial.trim();
    if(!m)return;
    if(materiales.includes(m)){setGastoForm(f=>({...f,desc:m}));setMostrarNuevoMat(false);setNuevoMaterial("");return;}
    setMaterialesExtra(x=>[...x,m]);
    setGastoForm(f=>({...f,desc:m}));
    setMostrarNuevoMat(false);setNuevoMaterial("");
    showToast("Material agregado a la lista");
  }
  const dragIdx=useRef(null),dragOver=useRef(null);

  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(trabajos));}catch(e){};});
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY+"_exc",JSON.stringify(excepciones));}catch(e){};});

  const showToast=(msg,tipo="ok")=>{setToast({msg,tipo});setTimeout(()=>setToast(null),3000);};

  const activos=useMemo(()=>trabajos.filter(j=>!j.archivado).sort((a,b)=>(a.posicion||0)-(b.posicion||0)),[trabajos]);
  const archivados=useMemo(()=>trabajos.filter(j=>j.archivado),[trabajos]);
  const schedule=useMemo(()=>simSchedule(activos,excepciones),[activos,excepciones]);

  // ── Excepciones de días ───────────────────────────────────────────
  function setExcepcion(fecha,horas){
    setExcepciones(ex=>({...ex,[fecha]:horas}));
    showToast(`Día ${fecha} actualizado a ${horas}h`);
  }
  function resetExcepcion(fecha){
    setExcepciones(ex=>{const n={...ex};delete n[fecha];return n;});
    showToast("Día restablecido al valor normal");
  }

  // ── Agenda ────────────────────────────────────────────────────────
  const agendaDia=useMemo(()=>{
    const mapa={};
    schedule.forEach(j=>{
      let cur=new Date(j.inicio),restDia=horasDelDia(cur,excepciones);
      j.etapas.forEach(e=>{
        let h=num(e.horas);
        while(h>0.001){
          const key=isoDate(cur),usado=Math.min(h,restDia);
          if(!mapa[key])mapa[key]=[];
          const ex=mapa[key].find(x=>x.jobId===j.id&&x.etapa===e.nombre);
          if(ex)ex.horas=parseFloat((ex.horas+usado).toFixed(2));
          else mapa[key].push({jobId:j.id,jobNombre:j.nombre,cliente:j.cliente,etapa:e.nombre,horasEtapaTotal:num(e.horas),horas:parseFloat(usado.toFixed(2)),color:j.color,tarde:j.tarde});
          h=parseFloat((h-usado).toFixed(2));restDia=parseFloat((restDia-usado).toFixed(2));
          if(restDia<=0.001){cur=addDays(cur,1);while(horasDelDia(cur,excepciones)===0)cur=addDays(cur,1);restDia=horasDelDia(cur,excepciones);}
        }
      });
    });
    return mapa;
  },[schedule,excepciones]);
  const diasAgenda=useMemo(()=>Object.keys(agendaDia).sort(),[agendaDia]);

  // Gantt: rango completo incluyendo fines de semana y huecos
  const ganttStart=useMemo(()=>{if(schedule.length){const d=new Date(schedule[0].inicio);d.setHours(0,0,0,0);return d;}const h=new Date();h.setHours(0,0,0,0);return h;},[schedule]);
  const ganttEnd=useMemo(()=>schedule.length?schedule[schedule.length-1].fin:addDays(new Date(),30),[schedule]);
  const totalDiasG=useMemo(()=>Math.max(Math.ceil((ganttEnd-ganttStart)/86400000)+2,28),[ganttStart,ganttEnd]);

  // Mapa de qué días tienen trabajo (para pintar huecos en gantt)
  const diasOcupados=useMemo(()=>{
    const set=new Set();
    schedule.forEach(j=>{
      let cur=new Date(j.inicio);
      while(cur<=j.fin){set.add(isoDate(cur));cur=addDays(cur,1);}
    });
    return set;
  },[schedule]);

  // Finanzas
  const totalGastos=j=>j.gastos.reduce((s,g)=>s+num(g.monto),0);
  const totalHoras=j=>j.etapas.reduce((s,e)=>s+num(e.horas),0);
  const margen=j=>num(j.total)-totalGastos(j);
  const margenPct=j=>num(j.total)>0?Math.round((margen(j)/num(j.total))*100):0;
  const ingresosPorHora=j=>totalHoras(j)>0?Math.round(num(j.total)/totalHoras(j)):0;
  const cobrado=j=>num(j.anticipo)+(j.pagoFinalRecibido?(num(j.total)-num(j.anticipo)):0);
  const saldoJob=j=>cobrado(j)-totalGastos(j);

  const finGlobal=useMemo(()=>{
    const tA=trabajos.reduce((s,j)=>s+num(j.anticipo),0);
    const tF=trabajos.filter(j=>j.pagoFinalRecibido).reduce((s,j)=>s+(num(j.total)-num(j.anticipo)),0);
    const tG=trabajos.reduce((s,j)=>s+totalGastos(j),0);
    const pC=trabajos.filter(j=>!j.pagoFinalRecibido).reduce((s,j)=>s+(num(j.total)-num(j.anticipo)),0);
    const hT=trabajos.reduce((s,j)=>s+totalHoras(j),0);
    const iph=hT>0?Math.round((tA+tF)/hT):0;
    return{caja:tA+tF-tG,anticipos:tA,pagosF:tF,gastado:tG,porCobrar:pC,horasTotales:hT,iph,enRiesgo:activos.filter(j=>saldoJob(j)<0)};
  },[trabajos,activos]);

  // max iph para barra de referencia
  const maxIph=useMemo(()=>Math.max(...trabajos.map(j=>ingresosPorHora(j)),1),[trabajos]);

  // ── Inserción preview ─────────────────────────────────────────────
  useEffect(()=>{
    if(tab!=="form"||editando)return;
    if(!form.nombre.trim()){setInsertPreview(null);return;}
    const pos=Math.min(insertPos,activos.length);
    const lista=[...activos];lista.splice(pos,0,{...form,id:-1,posicion:pos});
    const s2=simSchedule(lista,excepciones);
    const imp=calcImpacto(schedule,s2.filter(j=>j.id!==-1));
    setInsertPreview({pos,imp,sched2:s2});
  },[insertPos,form.etapas,form.nombre,tab,editando]);

  // Edición inline horas
  function guardarHorasEtapa(jobId,etapaNombre,nuevasHoras){
    setTrabajos(t=>t.map(j=>j.id!==jobId?j:{...j,etapas:j.etapas.map(e=>e.nombre===etapaNombre?{...e,horas:parseFloat(nuevasHoras)||0}:e)}));
    setEditHoras(null);showToast("Horas actualizadas — agenda recalculada");
  }

  // Mover trabajo
  function pedirMover(jobId,fechaSug){
    const j=trabajos.find(x=>x.id===jobId);
    const nf=fechaSug?isoDate(fechaSug):isoDate(nextWork(new Date(),excepciones));
    const sim=activos.map(x=>x.id===jobId?{...x,startOverride:nf}:x);
    const s2=simSchedule(sim,excepciones);
    setModal({tipo:"mover",jobId,job:j,nuevaFecha:nf,impacto:calcImpacto(schedule,s2),schedDes:s2});
  }
  function onCambioFechaMover(nf){
    if(!nf)return;
    const sim=activos.map(x=>x.id===modal.jobId?{...x,startOverride:nf}:x);
    const s2=simSchedule(sim,excepciones);
    setModal(m=>({...m,nuevaFecha:nf,impacto:calcImpacto(schedule,s2),schedDes:s2}));
  }
  function confirmarMover(){setTrabajos(t=>t.map(j=>j.id===modal.jobId?{...j,startOverride:modal.nuevaFecha}:j));showToast("Fecha actualizada");setModal(null);}

  // Drag reorder
  function onDrop(){
    if(dragIdx.current===null||dragOver.current===null||dragIdx.current===dragOver.current){dragIdx.current=null;return;}
    const arr=[...activos];const[m]=arr.splice(dragIdx.current,1);arr.splice(dragOver.current,0,m);
    arr.forEach((j,i)=>j.posicion=i);
    const s2=simSchedule(arr,excepciones);
    const imp=calcImpacto(schedule,s2);
    const newAll=[...arr,...archivados];
    if(!imp.viable||imp.retrasados.length>0)setModal({tipo:"reorden",arr:newAll,impacto:imp,schedDes:s2});
    else{setTrabajos(newAll);showToast("Orden actualizado");}
    dragIdx.current=null;dragOver.current=null;
  }
  function confirmarReorden(){modal.arr.forEach((j,i)=>{if(!j.archivado)j.posicion=i;});setTrabajos([...modal.arr]);showToast("Orden actualizado");setModal(null);}

  // CRUD
  const openNew=()=>{setForm(defaultJob());setInsertPos(activos.length);setEditando(null);setTab("form");};
  const openEdit=j=>{setForm({...j,etapas:j.etapas.map(e=>({...e})),gastos:j.gastos.map(g=>({...g}))});setEditando(j.id);setInsertPos(j.posicion||0);setTab("form");};
  const saveJob=()=>{
    if(!form.nombre.trim())return alert("Agrega el nombre del trabajo.");
    if(editando){setTrabajos(t=>t.map(j=>j.id===editando?{...form}:j));showToast("Trabajo actualizado");}
    else{
      const pos=Math.min(insertPos,activos.length);
      const lista=[...activos];lista.splice(pos,0,{...form,id:Date.now(),archivado:false,posicion:pos});
      lista.forEach((j,i)=>j.posicion=i);
      setTrabajos([...lista,...archivados]);showToast("Trabajo agregado");
    }
    setTab("trabajos");setInsertPreview(null);
  };
  const archivar=id=>{setTrabajos(t=>t.map(j=>j.id===id?{...j,archivado:true,startOverride:null}:j));showToast("Archivado");};
  const restaurar=id=>{setTrabajos(t=>t.map(j=>j.id===id?{...j,archivado:false}:j));showToast("Restaurado");};
  const eliminar=id=>{if(confirm("¿Eliminar permanentemente?"))setTrabajos(t=>t.filter(j=>j.id!==id));};
  const updEtapa=(i,f,v)=>setForm(fm=>({...fm,etapas:fm.etapas.map((e,idx)=>idx===i?{...e,[f]:v}:e)}));
  const addEtapa=()=>setForm(f=>({...f,etapas:[...f.etapas,{nombre:"",horas:0}]}));
  const remEtapa=i=>setForm(f=>({...f,etapas:f.etapas.filter((_,idx)=>idx!==i)}));
  const addGasto=()=>{if(!gastoForm.jobId||!gastoForm.monto)return alert("Selecciona trabajo y monto.");setTrabajos(t=>t.map(j=>j.id===parseInt(gastoForm.jobId)?{...j,gastos:[...j.gastos,{id:Date.now(),desc:gastoForm.desc||gastoForm.cat,monto:gastoForm.monto,cat:gastoForm.cat}]}:j));setGastoForm(f=>({...f,desc:"",monto:""}));showToast("Gasto registrado");};
  const delGasto=(jid,gid)=>setTrabajos(t=>t.map(j=>j.id===jid?{...j,gastos:j.gastos.filter(g=>g.id!==gid)}:j));
  const togglePF=id=>{setTrabajos(t=>t.map(j=>j.id===id?{...j,pagoFinalRecibido:!j.pagoFinalRecibido}:j));showToast("Pago actualizado");};
  const totalHF=()=>form.etapas.reduce((s,e)=>s+num(e.horas),0);
  const borrarTodo=()=>{if(confirm("¿Borrar TODOS los datos?"))setTrabajos([]);};
  const alertasTiempo=schedule.filter(j=>j.tarde);

  // Estilos
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

  const ImpactoPanel=({imp,schedDes})=>{
    if(!imp)return null;
    const{viable,enRiesgoNuevo,retrasados,diasRetraso}=imp;
    if(retrasados.length===0&&enRiesgoNuevo.length===0)return <div style={S.ok}>✅ Sin impacto. Todos los trabajos se entregan a tiempo.</div>;
    return <div>
      {!viable&&<div style={S.peligro}><div style={{fontWeight:500,marginBottom:6}}>🚨 No es viable sin atrasar compromisos</div>
        {enRiesgoNuevo.map(j=><div key={j.id} style={{fontSize:12}}>· <strong>{j.nombre}</strong> quedaría tarde — comprometido {j.fechaEntrega?fmtShort(parseDate(j.fechaEntrega)):"sin fecha"}</div>)}</div>}
      {retrasados.length>0&&<div style={S.aviso}><div style={{fontWeight:500,marginBottom:6}}>⚠️ Trabajos que se retrasan:</div>
        {retrasados.map(j=>{const dr=diasRetraso(j);const sj=schedDes&&schedDes.find(s=>s.id===j.id);return <div key={j.id} style={{fontSize:12,marginTop:3}}>· <strong>{j.nombre}</strong> — <strong>{dr} día{dr!==1?"s":""}</strong> más tarde{sj&&<span> → terminaría {fmtShort(sj.fin)}</span>}{j.fechaEntrega&&<span style={{color:sj&&sj.tarde?"var(--color-text-danger)":"inherit"}}> (comprometido: {fmtShort(parseDate(j.fechaEntrega))})</span>}</div>;})}
      </div>}
    </div>;
  };

  // ── DíaExcepcionControl: toggle + horas ajustables ────────────────
  const DiaCtrl=({fecha,d})=>{
    const dow=d.getDay();
    const normal=dow===0?0:dow===6?HORAS_SAB:HORAS_DIA;
    const actual=excepciones[fecha]!==undefined?excepciones[fecha]:normal;
    const modificado=excepciones[fecha]!==undefined;
    const esFinde=dow===0||dow===6;
    const [editando,setEditando]=useState(false);
    const [val,setVal]=useState(actual);

    return(
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:12,flexWrap:"wrap"}}>
        {esFinde&&<span style={{color:"var(--color-text-secondary)",fontSize:11}}>{dow===0?"Dom":"Sáb tarde"} — normal: {normal}h</span>}
        {/* toggle rápido */}
        <button
          style={{...S.btn,padding:"2px 10px",fontSize:11,color:actual>0?"#1D9E75":"var(--color-text-secondary)",borderColor:actual>0?"#1D9E75":"var(--color-border-secondary)"}}
          onClick={()=>{
            if(actual===0){setExcepcion(fecha,dow===6?HORAS_DIA:HORAS_DIA);setVal(HORAS_DIA);}
            else if(actual>0&&dow===0){setExcepcion(fecha,0);}
            else if(actual===HORAS_DIA&&dow===6){resetExcepcion(fecha);}
            else resetExcepcion(fecha);
          }}
        >{actual>0?`✓ ${actual}h activo`:"+ Activar día"}</button>
        {/* ajuste fino */}
        {actual>0&&(editando?(
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <input type="number" min={0.5} max={12} step={0.5} value={val} onChange={e=>setVal(e.target.value)} style={{width:52,fontSize:12}} autoFocus onKeyDown={e=>{if(e.key==="Enter"){setExcepcion(fecha,parseFloat(val)||actual);setEditando(false);}if(e.key==="Escape")setEditando(false);}}/>
            <span style={{fontSize:11}}>h</span>
            <button style={{...S.btnG,padding:"2px 8px",fontSize:11}} onClick={()=>{setExcepcion(fecha,parseFloat(val)||actual);setEditando(false);}}>✓</button>
            <button style={{...S.btn,padding:"2px 8px",fontSize:11}} onClick={()=>setEditando(false)}>✕</button>
          </div>
        ):(
          <button style={{...S.btn,padding:"2px 8px",fontSize:11}} onClick={()=>{setVal(actual);setEditando(true);}}>✏️ {actual}h</button>
        ))}
        {modificado&&<button style={{fontSize:11,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)"}} onClick={()=>resetExcepcion(fecha)}>↩ restablecer</button>}
      </div>
    );
  };

  return(
  <div style={{fontFamily:"var(--font-sans)",color:"var(--color-text-primary)",maxWidth:780,margin:"0 auto",padding:"1rem"}}>
    {toast&&<div style={{position:"fixed",bottom:24,right:24,zIndex:300,background:toast.tipo==="warn"?"var(--color-background-warning)":"var(--color-background-success)",color:toast.tipo==="warn"?"var(--color-text-warning)":"var(--color-text-success)",border:"0.5px solid",borderColor:toast.tipo==="warn"?"var(--color-border-warning)":"var(--color-border-success)",borderRadius:"var(--border-radius-md)",padding:"10px 18px",fontSize:13,fontWeight:500}}>
      {toast.tipo==="warn"?"⚠️":"✅"} {toast.msg}
    </div>}

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
      <div><h2 style={{fontSize:18,fontWeight:500,margin:0}}>Planeación del taller</h2>
        <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"2px 0 0"}}>Lun–Vie 8h · Sáb 4h · Dom descanso · Guardado automático</p></div>
      <div style={{display:"flex",gap:8}}>
        <button style={S.btn} onClick={()=>exportarCSV(trabajos)}>📥 Exportar</button>
        <button style={S.btnR} onClick={borrarTodo}>🗑 Borrar todo</button>
      </div>
    </div>

    {alertasTiempo.length>0&&<div style={{...S.peligro,margin:"10px 0"}}>⚠️ Entrega en riesgo: {alertasTiempo.map(a=>a.nombre).join(", ")}</div>}
    {finGlobal.enRiesgo.length>0&&<div style={{...S.aviso,margin:"6px 0 10px"}}>⚠️ Dinero insuficiente en: {finGlobal.enRiesgo.map(j=>j.nombre).join(", ")}</div>}

    <nav style={{display:"flex",gap:8,margin:"1rem 0",borderBottom:"0.5px solid var(--color-border-tertiary)",paddingBottom:8,flexWrap:"wrap"}}>
      {[["trabajos","Trabajos"],["gantt","Gantt"],["agenda","Agenda"],["finanzas","💰 Finanzas"],["historial","📁 Historial"]].map(([k,v])=>(
        <button key={k} style={S.navBtn(tab===k)} onClick={()=>setTab(k)}>{v}</button>
      ))}
    </nav>

    {/* ── TRABAJOS ── */}
    {tab==="trabajos"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>⠿ Arrastra · {activos.length} activo(s)</span>
        <button style={S.btnG} onClick={openNew}>+ Nuevo trabajo</button>
      </div>
      {activos.length===0&&<div style={{...S.card,textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)"}}>🪚 Sin trabajos activos.</div>}
      {schedule.map((j,idx)=>(
        <div key={j.id} draggable onDragStart={()=>{dragIdx.current=idx;}} onDragEnter={()=>{dragOver.current=idx;}} onDragOver={e=>e.preventDefault()} onDrop={onDrop}
          style={{...S.card,borderLeft:`3px solid ${j.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{color:"var(--color-text-secondary)",fontSize:18,cursor:"grab",marginTop:2}}>⠿</span>
              <div><div style={{fontWeight:500,fontSize:15}}>{j.nombre}</div>
                <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{j.cliente}{j.telefono&&` · ${j.telefono}`}</div></div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button style={S.btn} onClick={()=>openEdit(j)}>Editar</button>
              <button style={S.btn} onClick={()=>archivar(j.id)}>Archivar</button>
              <button style={S.btnR} onClick={()=>eliminar(j.id)}>Eliminar</button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap",fontSize:13}}>
            <span>📅 {fmtShort(j.inicio)} → {fmtShort(j.fin)}</span>
            {j.fechaEntrega&&<span style={{color:j.tarde?"var(--color-text-danger)":"var(--color-text-success)"}}>{j.tarde?"⚠️":"✅"} {fmtShort(parseDate(j.fechaEntrega))}</span>}
            <span>⏱ {j.totalH.toFixed(0)}h</span>
            {num(j.total)>0&&<span>💰 {money(num(j.total))} · <span style={{color:margen(j)>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>{margenPct(j)}% margen</span></span>}
          </div>
          <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>togglePF(j.id)} style={{...S.btn,padding:"3px 10px",fontSize:12,color:j.pagoFinalRecibido?"var(--color-text-success)":"var(--color-text-secondary)"}}>
              {j.pagoFinalRecibido?"✅ Pago recibido":"⬜ Pago pendiente"}</button>
            <button style={{...S.btn,padding:"3px 10px",fontSize:12}} onClick={()=>pedirMover(j.id,j.inicio)}>📆 Mover fecha</button>
          </div>
        </div>
      ))}
    </div>}

    {/* ── GANTT ── */}
    {tab==="gantt"&&<div>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:4}}>Línea de tiempo completa — huecos = días libres disponibles</p>
      <div style={{display:"flex",gap:16,fontSize:11,color:"var(--color-text-secondary)",marginBottom:12,flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:10,height:10,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Finde / descanso</span>
        <span><span style={{display:"inline-block",width:10,height:10,background:"var(--color-background-primary)",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Día libre — hueco disponible</span>
        <span><span style={{display:"inline-block",width:10,height:10,background:"#1D9E7544",border:"0.5px solid #1D9E75",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Día extra activado</span>
      </div>
      {schedule.length===0&&<div style={{...S.card,textAlign:"center",color:"var(--color-text-secondary)",padding:"2rem"}}>Sin trabajos.</div>}
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth:Math.max(totalDiasG*24+180,400)}}>
          {/* header fechas */}
          <div style={{display:"flex",marginLeft:160,marginBottom:2}}>
            {Array.from({length:totalDiasG}).map((_,i)=>{
              const d=addDays(ganttStart,i);const key=isoDate(d);const dow=d.getDay();
              const esHoy=key===isoDate(new Date());const finde=dow===0||dow===6;
              const excActiva=excepciones[key]!==undefined&&excepciones[key]>0;
              return <div key={i} style={{width:24,flexShrink:0,fontSize:9,textAlign:"center",
                color:esHoy?"#1D9E75":finde?"var(--color-text-secondary)":"var(--color-text-secondary)",
                background:excActiva?"#1D9E7522":finde?"var(--color-background-secondary)":"transparent",
                fontWeight:esHoy?700:400,borderLeft:esHoy?"2px solid #1D9E75":"none",boxSizing:"border-box"}}>
                {d.getDate()}
              </div>;
            })}
          </div>
          {/* fila por trabajo */}
          {schedule.map(j=>{
            const offset=Math.round((j.inicio-ganttStart)/86400000);
            const dur=Math.round((j.fin-j.inicio)/86400000)+1;
            return(
              <div key={j.id} style={{display:"flex",alignItems:"center",marginBottom:4}}>
                <div style={{width:160,flexShrink:0,fontSize:12,paddingRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={j.nombre}>{j.nombre}</div>
                <div style={{position:"relative",flex:1,height:20,display:"flex"}}>
                  {Array.from({length:totalDiasG}).map((_,i)=>{
                    const d=addDays(ganttStart,i);const key=isoDate(d);const dow=d.getDay();
                    const finde=dow===0||dow===6;
                    const excActiva=excepciones[key]!==undefined&&excepciones[key]>0;
                    const enRango=i>=offset&&i<offset+dur;
                    const libre=!diasOcupados.has(key)&&!finde&&!excActiva;
                    let bg="transparent";
                    if(enRango) bg=j.color;
                    else if(excActiva&&!enRango) bg="#1D9E7522";
                    else if(finde) bg="var(--color-background-secondary)";
                    else if(libre) bg="transparent";
                    const border=libre?"0.5px dashed var(--color-border-tertiary)":"none";
                    return <div key={i} style={{width:24,flexShrink:0,height:20,background:bg,border,boxSizing:"border-box",
                      borderRadius:i===offset?4:i===offset+dur-1?4:0}}/>;
                  })}
                  {/* marcador de entrega */}
                  {j.fechaEntrega&&(()=>{
                    const eOff=Math.round((parseDate(j.fechaEntrega)-ganttStart)/86400000);
                    if(eOff<0||eOff>=totalDiasG)return null;
                    return <div style={{position:"absolute",left:eOff*24+11,top:0,width:2,height:20,background:j.tarde?"#E24B4A":"#1D9E75",zIndex:2}}/>;
                  })()}
                </div>
              </div>
            );
          })}
          {/* fila especial: días libres y extra (leyenda visual debajo) */}
          <div style={{display:"flex",alignItems:"center",marginTop:6}}>
            <div style={{width:160,flexShrink:0,fontSize:11,color:"var(--color-text-secondary)",paddingRight:8}}>Disponibilidad</div>
            <div style={{display:"flex"}}>
              {Array.from({length:totalDiasG}).map((_,i)=>{
                const d=addDays(ganttStart,i);const key=isoDate(d);const dow=d.getDay();
                const finde=dow===0||dow===6;const excActiva=excepciones[key]!==undefined&&excepciones[key]>0;
                const libre=!diasOcupados.has(key)&&!finde&&!excActiva;
                const cap=horasDelDia(d,excepciones);
                return <div key={i} title={`${key}: ${cap}h`} style={{width:24,flexShrink:0,height:8,borderRadius:2,background:excActiva?"#1D9E7566":finde?"var(--color-background-secondary)":libre?"#1D9E7522":"transparent",border:libre?"0.5px dashed #1D9E7566":"none",boxSizing:"border-box"}}/>;
              })}
            </div>
          </div>
          <div style={{marginTop:6,marginLeft:160,fontSize:11,color:"var(--color-text-secondary)"}}>
            <span style={{marginRight:12}}><span style={{color:"#1D9E75"}}>|</span> Entrega a tiempo</span>
            <span><span style={{color:"#E24B4A"}}>|</span> Entrega en riesgo</span>
          </div>
        </div>
      </div>
    </div>}

    {/* ── AGENDA ── */}
    {tab==="agenda"&&<div>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>Toca las horas para corregirlas · Activa días extra en fines de semana</p>
      {diasAgenda.length===0&&<div style={{...S.card,textAlign:"center",color:"var(--color-text-secondary)",padding:"2rem"}}>Sin trabajos.</div>}
      {(()=>{
        // Construir lista completa: días con trabajo + fines de semana en el rango
        const allDias=new Set(diasAgenda);
        if(diasAgenda.length>0){
          const dInicio=parseDate(diasAgenda[0]);
          const dFin=parseDate(diasAgenda[diasAgenda.length-1]);
          let cur=new Date(dInicio);
          while(cur<=dFin){
            const dow=cur.getDay();
            if(dow===0||dow===6) allDias.add(isoDate(cur));
            cur=addDays(cur,1);
          }
        }
        const diasOrdenados=[...allDias].sort();
        return diasOrdenados.map(dia=>{
        const items=agendaDia[dia]||[];const d=parseDate(dia);
        const esHoy=dia===isoDate(new Date());const dow=d.getDay();const esSab=dow===6;const esDom=dow===0;
        const capActual=horasDelDia(d,excepciones);const modificado=excepciones[dia]!==undefined;
        return(
          <div key={dia} style={{...S.card,borderLeft:esHoy?"3px solid #1D9E75":esSab||esDom?"3px solid #BA7517":"3px solid var(--color-border-tertiary)"}}>
            <div style={{fontWeight:500,fontSize:14,marginBottom:8,display:"flex",justifyContent:"space-between"}}>
              <div>
                {esHoy&&<span style={{background:"#1D9E7522",color:"#1D9E75",fontSize:11,padding:"2px 7px",borderRadius:4,marginRight:6}}>Hoy</span>}
                {esSab&&!modificado&&<span style={{background:"#BA751722",color:"#BA7517",fontSize:11,padding:"2px 7px",borderRadius:4,marginRight:6}}>Sáb · 4h</span>}
                {esDom&&!modificado&&<span style={{background:"#BA751722",color:"#BA7517",fontSize:11,padding:"2px 7px",borderRadius:4,marginRight:6}}>Dom · descanso</span>}
                {modificado&&<span style={{background:"#1D9E7522",color:"#1D9E75",fontSize:11,padding:"2px 7px",borderRadius:4,marginRight:6}}>⚡ {capActual}h (modificado)</span>}
                {fmtLong(d)}
              </div>
              <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{items.reduce((s,i)=>s+i.horas,0).toFixed(1)}h</span>
            </div>
            {items.map((it,i)=>{
              const editKey=`${it.jobId}-${it.etapa}`;const enEdic=editHoras&&editHoras.key===editKey;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:it.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontWeight:500,fontSize:13}}>{it.jobNombre}</span>
                    <span style={{fontSize:12,color:"var(--color-text-secondary)",marginLeft:6}}>({it.cliente})</span>
                  </div>
                  <span style={{fontSize:12,color:"var(--color-text-secondary)",flexShrink:0}}>{it.etapa}</span>
                  {enEdic?(
                    <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                      <input type="number" min={0.5} step={0.5} defaultValue={it.horasEtapaTotal} style={{width:58,fontSize:13,textAlign:"center"}} autoFocus id={`inp-${editKey}`}
                        onKeyDown={e=>{if(e.key==="Enter")guardarHorasEtapa(it.jobId,it.etapa,e.target.value);if(e.key==="Escape")setEditHoras(null);}}/>
                      <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>h total</span>
                      <button style={{...S.btnG,padding:"3px 8px",fontSize:12}} onClick={()=>{const v=document.getElementById(`inp-${editKey}`).value;guardarHorasEtapa(it.jobId,it.etapa,v);}}>✓</button>
                      <button style={{...S.btn,padding:"3px 8px",fontSize:12}} onClick={()=>setEditHoras(null)}>✕</button>
                    </div>
                  ):(
                    <button title="Tocar para editar horas totales de esta etapa" onClick={()=>setEditHoras({key:editKey,jobId:it.jobId,etapa:it.etapa})}
                      style={{fontSize:13,fontWeight:500,minWidth:42,textAlign:"right",flexShrink:0,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-primary)",borderBottom:"1px dashed var(--color-border-secondary)",padding:"0 2px"}}>
                      {it.horas}h{it.horasEtapaTotal>it.horas&&<span style={{fontSize:10,color:"var(--color-text-secondary)"}}> /{it.horasEtapaTotal}h</span>}
                    </button>
                  )}
                  <button style={{...S.btn,padding:"3px 10px",fontSize:12,flexShrink:0}} onClick={()=>pedirMover(it.jobId,d)}>Mover</button>
                  {it.tarde&&<span style={{fontSize:11,color:"var(--color-text-danger)"}}>⚠️</span>}
                </div>
              );
            })}
            {/* Control de horas del día — siempre visible en finde, solo si hay trabajo en días de semana */}
            {(esSab||esDom||items.length>0)&&<div style={{marginTop:8,paddingTop:6,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
              <DiaCtrl fecha={dia} d={d}/>
            </div>}
          </div>
        );
        });
      })()}
    </div>}

    {/* ── FINANZAS ── */}
    {tab==="finanzas"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
        {[
          ["Caja disponible",money(finGlobal.caja),finGlobal.caja>=0?"var(--color-background-success)":"var(--color-background-danger)",finGlobal.caja>=0?"var(--color-text-success)":"var(--color-text-danger)"],
          ["Anticipos",money(finGlobal.anticipos),null,null],
          ["Pagos finales",money(finGlobal.pagosF),null,null],
          ["Total gastado",money(finGlobal.gastado),null,null],
          ["Por cobrar",money(finGlobal.porCobrar),"var(--color-background-warning)","var(--color-text-warning)"],
          ["Horas totales",finGlobal.horasTotales.toFixed(0)+"h",null,null],
          ["Ingreso / hora",money(finGlobal.iph),null,"var(--color-text-success)"],
        ].map(([l,v,bg,tc])=>(
          <div key={l} style={{background:bg||"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.75rem",textAlign:"center"}}>
            <div style={{fontSize:11,color:tc||"var(--color-text-secondary)",marginBottom:4}}>{l}</div>
            <div style={{fontSize:16,fontWeight:500,color:tc||"var(--color-text-primary)"}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Registro gasto */}
      <div style={S.card}>
        <div style={{fontWeight:500,fontSize:14,marginBottom:10}}>Registrar gasto</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
          <div><label style={S.lbl}>Trabajo</label>
            <select value={gastoForm.jobId} onChange={e=>setGastoForm(f=>({...f,jobId:e.target.value}))} style={{width:"100%"}}>
              <option value="">Selecciona…</option>{trabajos.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select></div>
          <div><label style={S.lbl}>Categoría</label>
            <select value={gastoForm.cat} onChange={e=>setGastoForm(f=>({...f,cat:e.target.value,desc:""}))} style={{width:"100%"}}>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select></div>
          <div><label style={S.lbl}>Monto</label>
            <input type="number" value={gastoForm.monto} onChange={e=>setGastoForm(f=>({...f,monto:e.target.value}))} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div>
          <button style={{...S.btnG,padding:"8px 12px"}} onClick={addGasto}>+</button>
        </div>

        {/* Descripción: lista si es Materiales, texto libre si no */}
        <div style={{marginTop:10}}>
          {gastoForm.cat==="Materiales"?(
            <div>
              <label style={S.lbl}>Material</label>
              <select value={gastoForm.desc} onChange={e=>{if(e.target.value==="__nuevo__"){setMostrarNuevoMat(true);}else{setGastoForm(f=>({...f,desc:e.target.value}));setMostrarNuevoMat(false);}}} style={{width:"100%",marginBottom:mostrarNuevoMat?8:0}}>
                <option value="">Selecciona material…</option>
                {materiales.filter(m=>m!=="Otro").map(m=><option key={m} value={m}>{m}</option>)}
                <option value="__nuevo__">+ Agregar material nuevo…</option>
              </select>
              {mostrarNuevoMat&&(
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6}}>
                  <input value={nuevoMaterial} onChange={e=>setNuevoMaterial(e.target.value)} placeholder="Nombre del material nuevo" style={{flex:1}} autoFocus
                    onKeyDown={e=>{if(e.key==="Enter")agregarMaterial();if(e.key==="Escape"){setMostrarNuevoMat(false);setNuevoMaterial("");}}}/>
                  <button style={{...S.btnG,padding:"6px 12px",fontSize:13}} onClick={agregarMaterial}>Agregar</button>
                  <button style={{...S.btn,padding:"6px 10px",fontSize:13}} onClick={()=>{setMostrarNuevoMat(false);setNuevoMaterial("");}}>✕</button>
                </div>
              )}
              {/* Nota adicional opcional */}
              <input value={gastoForm.desc&&gastoForm.desc!=="__nuevo__"?"":(gastoForm.nota||"")} onChange={e=>setGastoForm(f=>({...f,nota:e.target.value}))} placeholder="Nota adicional (opcional)" style={{width:"100%",boxSizing:"border-box",marginTop:8,fontSize:13}}/>
            </div>
          ):(
            <div>
              <label style={S.lbl}>Descripción</label>
              <input value={gastoForm.desc} onChange={e=>setGastoForm(f=>({...f,desc:e.target.value}))} placeholder={gastoForm.cat==="Herramienta"?"Ej: Sierra circular, router…":gastoForm.cat==="Transporte"?"Ej: Flete, gasolina…":gastoForm.cat==="Mano de obra"?"Ej: Ayudante 1 día…":"Descripción del gasto"} style={{width:"100%",boxSizing:"border-box"}}/>
            </div>
          )}
        </div>
      </div>

      {/* Rentabilidad por trabajo con $/hora */}
      <div style={{fontWeight:500,fontSize:14,marginBottom:8}}>Rentabilidad por trabajo</div>
      {trabajos.length===0&&<div style={{...S.card,textAlign:"center",color:"var(--color-text-secondary)",padding:"1.5rem"}}>Sin trabajos.</div>}
      {trabajos.map(j=>{
        const gT=totalGastos(j);const mg=margen(j);const sb=saldoJob(j);
        const hT=totalHoras(j);const iph=ingresosPorHora(j);
        const pct=num(j.total)>0?Math.min(100,Math.round((gT/num(j.total))*100)):0;
        const iphPct=maxIph>0?Math.round((iph/maxIph)*100):0;
        return(
          <div key={j.id} style={{...S.card,borderLeft:`3px solid ${j.color}`,opacity:j.archivado?0.75:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div><div style={{fontWeight:500}}>{j.nombre}{j.archivado&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}> · archivado</span>}</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{j.cliente}</div></div>
              <div style={{textAlign:"right",fontSize:13}}>
                <div>Precio: <strong>{money(num(j.total))}</strong></div>
                <div style={{color:mg>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>Margen: <strong>{money(mg)} ({margenPct(j)}%)</strong></div>
              </div>
            </div>

            {/* barra gastos */}
            <div style={{height:4,background:"var(--color-background-secondary)",borderRadius:3,marginBottom:4,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",background:pct>90?"#E24B4A":pct>70?"#BA7517":"#1D9E75",borderRadius:3}}/>
            </div>
            <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:10}}>Gastos vs precio: {pct}%</div>

            {/* métricas de 5 */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10,fontSize:11}}>
              {[["Precio",money(num(j.total)),null],["Anticipo",money(num(j.anticipo)),null],["Gastado",money(gT),null],["Saldo",money(sb),sb<0?"var(--color-text-danger)":"var(--color-text-success)"],["Horas",hT.toFixed(1)+"h",null]].map(([l,v,c])=>(
                <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:6,padding:"5px 6px",textAlign:"center"}}>
                  <div style={{color:"var(--color-text-secondary)",marginBottom:2,fontSize:10}}>{l}</div>
                  <div style={{fontWeight:500,color:c||"var(--color-text-primary)",fontSize:12}}>{v}</div>
                </div>
              ))}
            </div>

            {/* ingreso por hora con barra comparativa */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:"var(--color-text-secondary)"}}>Ingreso por hora trabajada</span>
                <span style={{fontWeight:500,color:iphPct>=70?"var(--color-text-success)":iphPct>=40?"var(--color-text-warning)":"var(--color-text-danger)"}}>{money(iph)}/h</span>
              </div>
              <div style={{height:6,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                <div style={{width:iphPct+"%",height:"100%",background:iphPct>=70?"#1D9E75":iphPct>=40?"#BA7517":"#E24B4A",borderRadius:3,transition:"width 0.4s"}}/>
              </div>
            </div>

            {/* gastos */}
            {j.gastos.map(g=>(
              <div key={g.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                <span style={{color:"var(--color-text-secondary)",fontSize:11,minWidth:70}}>{g.cat}</span>
                <span style={{flex:1,marginLeft:6}}>{g.desc}</span>
                <span style={{fontWeight:500,marginRight:8}}>{money(num(g.monto))}</span>
                <button onClick={()=>delGasto(j.id,g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--color-text-danger)",fontSize:15,padding:0}}>×</button>
              </div>
            ))}
            {j.gastos.length===0&&<div style={{fontSize:12,color:"var(--color-text-secondary)"}}>Sin gastos registrados.</div>}
          </div>
        );
      })}
    </div>}

    {/* ── HISTORIAL ── */}
    {tab==="historial"&&<div>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>Registro histórico de trabajos terminados.</p>
      {archivados.length===0&&<div style={{...S.card,textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)"}}>📁 Sin trabajos archivados.</div>}
      {archivados.map(j=>(
        <div key={j.id} style={{...S.card,borderLeft:`3px solid ${j.color}`,opacity:0.8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontWeight:500}}>{j.nombre}</div><div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{j.cliente}{j.telefono&&` · ${j.telefono}`}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button style={S.btn} onClick={()=>restaurar(j.id)}>Restaurar</button>
              <button style={S.btnR} onClick={()=>eliminar(j.id)}>Eliminar</button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap",fontSize:13}}>
            {j.fechaEntrega&&<span>📅 {fmtShort(parseDate(j.fechaEntrega))}</span>}
            <span>💰 {money(num(j.total))}</span>
            <span style={{color:margen(j)>=0?"var(--color-text-success)":"var(--color-text-danger)"}}>Margen: {money(margen(j))} ({margenPct(j)}%)</span>
            <span>⏱ {totalHoras(j).toFixed(0)}h · {money(ingresosPorHora(j))}/h</span>
            <span style={{color:j.pagoFinalRecibido?"var(--color-text-success)":"var(--color-text-warning)"}}>{j.pagoFinalRecibido?"✅ Cobrado":"⚠️ Pago pendiente"}</span>
          </div>
        </div>
      ))}
      {archivados.length>0&&(
        <div style={{...S.card,background:"var(--color-background-secondary)"}}>
          <div style={{fontWeight:500,fontSize:13,marginBottom:8}}>Resumen histórico</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,fontSize:13}}>
            <div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>Trabajos</div><div style={{fontWeight:500}}>{archivados.length}</div></div>
            <div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>Total facturado</div><div style={{fontWeight:500}}>{money(archivados.reduce((s,j)=>s+num(j.total),0))}</div></div>
            <div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>Margen prom.</div><div style={{fontWeight:500,color:"var(--color-text-success)"}}>{Math.round(archivados.reduce((s,j)=>s+margenPct(j),0)/archivados.length)}%</div></div>
            <div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>$/hora prom.</div><div style={{fontWeight:500,color:"var(--color-text-success)"}}>{money(Math.round(archivados.reduce((s,j)=>s+ingresosPorHora(j),0)/archivados.length))}</div></div>
          </div>
        </div>
      )}
    </div>}

    {/* ── FORMULARIO ── */}
    {tab==="form"&&<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1rem"}}>
        <button style={S.btn} onClick={()=>{setTab("trabajos");setInsertPreview(null);}}>← Volver</button>
        <h3 style={{margin:0,fontSize:16,fontWeight:500}}>{editando?"Editar trabajo":"Nuevo trabajo"}</h3>
      </div>
      <div style={S.card}>
        <div style={S.row2}>
          <div><label style={S.lbl}>Nombre *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Closet recámara" style={{width:"100%",boxSizing:"border-box"}}/></div>
          <div><label style={S.lbl}>Cliente</label><input value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))} placeholder="Nombre" style={{width:"100%",boxSizing:"border-box"}}/></div>
        </div>
        <div style={S.row2}>
          <div><label style={S.lbl}>Teléfono</label><input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="81 1234 5678" style={{width:"100%",boxSizing:"border-box"}}/></div>
          <div><label style={S.lbl}>Fecha de entrega comprometida</label><input type="date" value={form.fechaEntrega} onChange={e=>setForm(f=>({...f,fechaEntrega:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}}/></div>
        </div>
        <div style={S.row2}>
          <div><label style={S.lbl}>Anticipo ($)</label><input type="number" value={form.anticipo} onChange={e=>setForm(f=>({...f,anticipo:e.target.value}))} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div>
          <div><label style={S.lbl}>Precio total ($)</label><input type="number" value={form.total} onChange={e=>setForm(f=>({...f,total:e.target.value}))} placeholder="0" style={{width:"100%",boxSizing:"border-box"}}/></div>
        </div>
        <div style={{marginBottom:12}}><label style={S.lbl}>Notas</label><textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} rows={2} style={{width:"100%",boxSizing:"border-box",resize:"vertical"}}/></div>
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:500,fontSize:14}}>Etapas</div>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{totalHF().toFixed(1)}h · ~{Math.ceil(totalHF()/HORAS_DIA)} día(s)</span>
        </div>
        {form.etapas.map((e,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={e.nombre} onChange={ev=>updEtapa(i,"nombre",ev.target.value)} placeholder="Etapa" style={{flex:2}}/>
            <input type="number" value={e.horas||""} onChange={ev=>updEtapa(i,"horas",parseFloat(ev.target.value)||0)} placeholder="h" min={0} step={0.5} style={{flex:1,maxWidth:72}}/>
            <button style={{...S.btn,padding:"4px 10px",color:"var(--color-text-danger)"}} onClick={()=>remEtapa(i)}>×</button>
          </div>
        ))}
        <button style={{...S.btn,marginTop:4}} onClick={addEtapa}>+ Etapa</button>
      </div>

      {!editando&&activos.length>0&&<div style={S.card}>
        <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>¿En qué posición va este trabajo?</div>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:0,marginBottom:12}}>El ícono muestra si afecta los compromisos existentes.</p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[...Array(activos.length+1)].map((_,pos)=>{
            const label=pos===0?"Al inicio (antes de todo)":pos===activos.length?"Al final (después de todo)":`Después de: ${activos[pos-1].nombre}`;
            const sel=insertPos===pos;
            const prev=form.nombre.trim()?(()=>{try{const l=[...activos];l.splice(pos,0,{...form,id:-1});const s2=simSchedule(l,excepciones);return calcImpacto(schedule,s2.filter(j=>j.id!==-1));}catch(e){return null;}})():null;
            const icon=!prev?"":(prev.viable&&prev.retrasados.length===0)?"✅":prev.viable?"⚠️":"🚨";
            return(
              <label key={pos} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:`1px solid ${sel?"#1D9E75":"var(--color-border-tertiary)"}`,background:sel?"#1D9E7511":"transparent",cursor:"pointer"}}>
                <input type="radio" name="insertPos" checked={sel} onChange={()=>setInsertPos(pos)} style={{accentColor:"#1D9E75"}}/>
                <span style={{flex:1,fontSize:13}}>{label}</span>
                <span style={{fontSize:14}}>{icon}</span>
              </label>
            );
          })}
        </div>
        {insertPreview&&form.nombre.trim()&&<div style={{marginTop:14}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:6,color:"var(--color-text-secondary)"}}>Detalle del impacto:</div>
          <ImpactoPanel imp={insertPreview.imp} schedDes={insertPreview.sched2}/>
        </div>}
      </div>}

      <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
        <button style={S.btn} onClick={()=>{setTab("trabajos");setInsertPreview(null);}}>Cancelar</button>
        <button style={S.btnG} onClick={saveJob}>{editando?"Guardar cambios":"Agregar trabajo"}</button>
      </div>
    </div>}

    {/* ── MODALES ── */}
    {modal&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"1rem"}}>
      <div style={{background:"#ffffff",color:"#111111",border:"1px solid #dddddd",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
        {modal.tipo==="mover"&&<>
          <div style={{fontWeight:500,fontSize:16,marginBottom:4,color:"#111"}}>Mover inicio: {modal.job.nombre}</div>
          <div style={{fontSize:13,color:"#666",marginBottom:14}}>El resto de los trabajos se recalcula automáticamente.</div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,color:"#666",display:"block",marginBottom:4}}>Nueva fecha de inicio</label>
            <input type="date" defaultValue={modal.nuevaFecha} onChange={e=>onCambioFechaMover(e.target.value)} style={{width:"100%",boxSizing:"border-box",fontSize:14,padding:"8px",border:"1px solid #ccc",borderRadius:6}}/>
          </div>
          <ImpactoPanel imp={modal.impacto} schedDes={modal.schedDes}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
            <button style={{...S.btn,color:"#333",borderColor:"#ccc"}} onClick={()=>setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={confirmarMover}>Confirmar</button>
          </div>
        </>}
        {modal.tipo==="reorden"&&<>
          <div style={{fontWeight:500,fontSize:16,marginBottom:8,color:"#111"}}>Revisar impacto del reorden</div>
          <ImpactoPanel imp={modal.impacto} schedDes={modal.schedDes||simSchedule(modal.arr.filter(j=>!j.archivado),excepciones)}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
            <button style={{...S.btn,color:"#333",borderColor:"#ccc"}} onClick={()=>setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={confirmarReorden}>Aceptar de todos modos</button>
          </div>
        </>}
      </div>
    </div>}
  </div>
  );
}