import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
         signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 VERIFIED FIREBASE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAFqpLxTkBAVK0L35_93RUPdQASyK8u16Q",
  authDomain:        "bromleyteamtracker.firebaseapp.com",
  databaseURL:       "https://bromleyteamtracker-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "bromleyteamtracker",
  storageBucket:     "bromleyteamtracker.firebasestorage.app",
  messagingSenderId: "53638758399",
  appId:             "1:53638758399:web:1b4150b4d545278bfe31ca",
  measurementId:     "G-XQ5J4JJQ3K",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db   = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

const dbSet    = (path, val) => set(ref(db, path), val);
const dbUpdate = (path, val) => update(ref(db, path), val);
const dbListen = (path, cb)  => { const r = ref(db, path); onValue(r, snap => cb(snap.val())); return r; };

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  black:      "#0a0a0a",
  blackMid:   "#111111",
  blackLight: "#1e1e1e",
  blackCard:  "#161616",
  amber:      "#f5a800",
  amberLight: "#ffc340",
  amberDark:  "#c98900",
  amberGlow:  "#f5a80030",
  chalk:      "#f5f0e8",
  chalkDim:   "#7a7060",
  chalkFaint: "#252520",
  red:        "#d94f4f",
  redLight:   "#f07070",
  blue:       "#4a9eda",
  blueLight:  "#7ebff0",
  green:      "#4caf76",
  orange:     "#e07b2a",
  orangeLight:"#f0a060",
  border:     "rgba(245,168,0,0.18)",
  borderHit:  "rgba(245,168,0,0.45)",
  cardBg:     "rgba(20,20,20,0.97)",
};

const LOGO = "https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png";

// ─── Static data ──────────────────────────────────────────────────────────────
const POSITIONS = [
  "Front Row","2nd Row","Back Row",
  "Scrum Half","Fly Half","Centres","Back 3","Utility",
];

const AVAIL = {
  unknown:     { label:"Unknown",     color:C.chalkDim, icon:"??" },
  available:   { label:"Available",   color:C.green,    icon:"✓" },
  unavailable: { label:"Unavailable", color:C.red,      icon:"✗" },
  tentative:   { label:"Tentative",   color:C.amber,    icon:"~" },
};

const COMM = {
  not_contacted: { label:"Not Contacted",  color:C.chalkDim,   icon:"○" },
  contacted:     { label:"Contacted",      color:C.blue,       icon:"◎" },
  responded:     { label:"Responded",      color:C.green,      icon:"●" },
  no_reply:      { label:"No Reply",       color:C.amber,      icon:"◌" },
  on_spond:      { label:"On Spond",       color:"#6c63ff",    icon:"📋" },
  whatsapp_poll: { label:"WhatsApp Poll",  color:"#25d366",    icon:"📊" },
};

const DEMO_SQUAD = [
  {name:"James O'Brien",  pos:"Loosehead Prop",    num:1},
  {name:"Cian Murphy",    pos:"Hooker",            num:2},
  {name:"Rory Walsh",     pos:"Tighthead Prop",    num:3},
  {name:"Finn McCarthy",  pos:"Lock",              num:4},
  {name:"David Brennan",  pos:"Lock",              num:5},
  {name:"Shane Kelly",    pos:"Blindside Flanker", num:6},
  {name:"Tom Byrne",      pos:"Openside Flanker",  num:7},
  {name:"Liam Connolly",  pos:"Number Eight",      num:8},
  {name:"Declan Foley",   pos:"Scrum-half",        num:9},
  {name:"Patrick Ryan",   pos:"Fly-half",          num:10},
  {name:"Aaron Gallagher",pos:"Left Wing",         num:11},
  {name:"Niall Doyle",    pos:"Inside Centre",     num:12},
  {name:"Kevin Quinn",    pos:"Outside Centre",    num:13},
  {name:"Barry Dempsey",  pos:"Right Wing",        num:14},
  {name:"Mark Sheridan",  pos:"Fullback",          num:15},
  {name:"Eoin Moran",     pos:"Utility Forward",   num:16},
  {name:"Ross Higgins",   pos:"Utility Back",      num:17},
  {name:"Cormac Lynch",   pos:"Reserve",           num:18},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);

function parseCSV(text){
  const lines = text.trim().split("\n").filter(Boolean);
  if(!lines.length) return [];
  const hdr = lines[0].split(",").map(s=>s.trim().toLowerCase());
  return lines.slice(1).map(line=>{
    const cols=line.split(",").map(s=>s.trim()); const row={};
    hdr.forEach((h,i)=>row[h]=cols[i]||"");
    return { id:uid(), name:row.name||row["player name"]||"", pos:row.position||row.pos||"" };
  }).filter(p=>p.name);
}

function daysUntil(dateStr){
  const diff = new Date(dateStr+"T00:00:00") - new Date(today()+"T00:00:00");
  return Math.ceil(diff/(1000*60*60*24));
}

function fmtDate(dateStr){
  return new Date(dateStr+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
}

// ─── Responsive hook ─────────────────────────────────────────────────────────
function useIsMobile(){ const [m,setM]=useState(window.innerWidth<768); useEffect(()=>{ const h=()=>setM(window.innerWidth<768); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); },[]); return m; }

// ─── UI primitives ───────────────────────────────────────────────────────────
const Label = ({children,color=C.amber})=>(
  <div style={{fontSize:10,color,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{children}</div>
);

const Pill = ({color,children})=>(
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:4,fontSize:11,fontWeight:700,background:color+"22",color,border:`1px solid ${color}44`,letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
    {children}
  </span>
);

const Input = ({value,onChange,placeholder,type="text",style={}})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"10px 13px",fontSize:14,outline:"none",width:"100%",...style}}
  />
);

const Sel = ({value,onChange,options,style={}})=>(
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"10px 13px",fontSize:14,cursor:"pointer",outline:"none",...style}}>
    {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

const Btn = ({onClick,children,variant="primary",small,disabled,full,style={}})=>{
  const v={
    primary:  {bg:C.amber,       color:C.black,    border:"none"},
    ghost:    {bg:"transparent", color:C.chalkDim, border:`1px solid ${C.border}`},
    danger:   {bg:C.red+"22",   color:C.redLight,  border:`1px solid ${C.red}44`},
    orange:   {bg:C.orange+"22",color:C.orangeLight,border:`1px solid ${C.orange}44`},
  }[variant]||{};
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:v.bg,color:v.color,border:v.border,borderRadius:8,
      padding:small?"7px 14px":"11px 20px",fontSize:small?12:14,fontWeight:800,
      cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.45:1,
      letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap",
      width:full?"100%":"auto",transition:"opacity 0.15s",...style,
    }}>{children}</button>
  );
};

const Card = ({children,style={}})=>(
  <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:12,...style}}>
    {children}
  </div>
);

const Modal = ({open,onClose,title,children})=>{
  if(!open) return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(5px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.blackMid,border:`1px solid ${C.border}`,borderTop:`3px solid ${C.amber}`,borderRadius:"16px 16px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:`0 -8px 40px rgba(0,0,0,0.8)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:C.chalk,letterSpacing:"0.06em",textTransform:"uppercase"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.chalkDim,fontSize:24,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard=({label,value,color})=>(
  <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderBottom:`3px solid ${color}`,borderRadius:10,padding:"14px 16px",display:"flex",flexDirection:"column",gap:4}}>
    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:34,fontWeight:900,color,lineHeight:1}}>{value}</div>
    <div style={{fontSize:10,color:C.chalkDim,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700}}>{label}</div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({matches,squad,injuries,onGo}){
  const isMobile=useIsMobile();
  const active = squad.filter(p=>!injuries[p.id]);
  const upcoming = [...matches].filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  const next = upcoming[0];

  const stats=(match)=>{
    if(!match) return {total:0,available:0,unavailable:0,tentative:0,notContacted:0,responded:0,contacted:0};
    const pl=active.map(p=>{const ma=(match.players||{})[p.id]||{}; return{avail:ma.availability||"unknown",comm:ma.commStatus||"not_contacted"};});
    return{
      total:       pl.length,
      available:   pl.filter(p=>p.avail==="available").length,
      unavailable: pl.filter(p=>p.avail==="unavailable").length,
      tentative:   pl.filter(p=>p.avail==="tentative").length,
      notContacted:pl.filter(p=>p.comm==="not_contacted").length,
      responded:   pl.filter(p=>p.comm==="responded").length,
      contacted:   pl.filter(p=>p.comm!=="not_contacted").length,
    };
  };

  const s=stats(next);
  const injuredCount=Object.keys(injuries).length;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Next match banner */}
      {next?(
        <div onClick={()=>onGo("matches",next.id)} style={{background:C.blackCard,border:`1px solid ${C.border}`,borderLeft:`4px solid ${C.amber}`,borderRadius:12,padding:"20px 20px",cursor:"pointer",boxShadow:`0 0 24px ${C.amberGlow}`}}>
          <div style={{fontSize:10,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800,marginBottom:6}}>Next Match</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:isMobile?26:32,fontWeight:900,color:C.chalk,lineHeight:1.1}}>
            {next.homeTeam} <span style={{color:C.amber}}>vs</span> {next.awayTeam}
          </div>
          <div style={{color:C.chalkDim,fontSize:13,marginTop:6}}>
            {fmtDate(next.date)}{next.venue&&` · ${next.venue}`}{next.kickoff&&` · KO ${next.kickoff}`}
          </div>
          <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
            <Pill color={C.green}>{s.available} available</Pill>
            <Pill color={C.chalkDim}>{s.notContacted} to contact</Pill>
            {injuredCount>0&&<Pill color={C.orange}>{injuredCount} injured</Pill>}
          </div>
        </div>
      ):(
        <Card style={{padding:"24px 20px",textAlign:"center",color:C.chalkDim}}>
          No upcoming matches. Tap Matches to create one.
        </Card>
      )}

      {/* Stats grid */}
      {next&&(
        <>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
            Availability Overview
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            <StatCard label="Available"   value={s.available}    color={C.green}/>
            <StatCard label="Unavailable" value={s.unavailable}  color={C.red}/>
            <StatCard label="Tentative"   value={s.tentative}    color={C.amber}/>
            <StatCard label="Responded"   value={s.responded}    color={C.blue}/>
            <StatCard label="To Contact"  value={s.notContacted} color={C.chalkDim}/>
            <StatCard label="Injured"     value={injuredCount}   color={C.orange}/>
          </div>
          {/* Progress */}
          <Card style={{padding:"16px 18px"}}>
            <div style={{fontSize:11,color:C.chalkDim,marginBottom:8,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700}}>
              Comms — {s.contacted}/{s.total} contacted
            </div>
            <div style={{background:C.blackLight,borderRadius:99,height:10,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${s.total?(s.responded/s.total)*100:0}%`,background:`linear-gradient(90deg,${C.amberDark},${C.amberLight})`,transition:"width 0.4s"}}/>
            </div>
            <div style={{fontSize:11,color:C.chalkDim,marginTop:7}}>{s.responded} responded · {s.contacted-s.responded} awaiting · {s.notContacted} not yet contacted</div>
          </Card>
        </>
      )}

      {/* All matches list */}
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
        All Matches ({matches.length})
      </div>
      {matches.length===0&&<div style={{color:C.chalkDim,fontSize:13}}>No matches yet.</div>}
      {[...matches].sort((a,b)=>a.date.localeCompare(b.date)).map(m=>{
        const ms=stats(m); const isPast=m.date<today();
        return(
          <Card key={m.id} style={{padding:"14px 18px",cursor:"pointer",opacity:isPast?0.55:1}} onClick={()=>onGo("matches",m.id)}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:17,color:C.chalk}}>
              {m.homeTeam} <span style={{color:C.amber}}>vs</span> {m.awayTeam}
              {isPast&&<span style={{color:C.chalkDim,fontSize:12,marginLeft:8,fontWeight:400}}>[Past]</span>}
            </div>
            <div style={{fontSize:12,color:C.chalkDim,marginTop:3}}>
              {fmtDate(m.date)}{m.kickoff&&` · KO ${m.kickoff}`}{m.venue&&` · ${m.venue}`}
            </div>
            <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
              <Pill color={C.green}>{ms.available} avail</Pill>
              <Pill color={C.red}>{ms.unavailable} unavail</Pill>
              <Pill color={C.chalkDim}>{ms.notContacted} to contact</Pill>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Player card (mobile-friendly) ───────────────────────────────────────────
function PlayerCard({player,matchData,onUpdate,onInjure}){
  const md=matchData||{};
  const avail=md.availability||"unknown";
  const comm=md.commStatus||"not_contacted";
  const assignee=md.assignedTo||"";
  const notes=md.notes||"";
  const [editNote,setEditNote]=useState(false);
  const [noteVal,setNoteVal]=useState(notes);

  return(
    <Card style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
      {/* Name row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:C.chalk}}>{player.name}</span>
          </div>
          <div style={{fontSize:11,color:C.chalkDim,marginTop:1}}>{player.pos}</div>
        </div>
        <button onClick={onInjure} title="Mark as injured" style={{background:C.orange+"22",border:`1px solid ${C.orange}44`,color:C.orangeLight,borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.04em",textTransform:"uppercase"}}>
          🩹 Injure
        </button>
      </div>

      {/* Availability + Comm */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div>
          <Label>Availability</Label>
          <select value={avail} onChange={e=>onUpdate({availability:e.target.value})} style={{width:"100%",background:AVAIL[avail].color+"18",color:AVAIL[avail].color,border:`1px solid ${AVAIL[avail].color}44`,borderRadius:8,padding:"9px 10px",fontSize:13,fontWeight:700,cursor:"pointer",outline:"none",textTransform:"uppercase"}}>
            {Object.entries(AVAIL).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Comm Status</Label>
          <select value={comm} onChange={e=>onUpdate({commStatus:e.target.value})} style={{width:"100%",background:COMM[comm].color+"18",color:COMM[comm].color,border:`1px solid ${COMM[comm].color}44`,borderRadius:8,padding:"9px 10px",fontSize:13,fontWeight:700,cursor:"pointer",outline:"none",textTransform:"uppercase"}}>
            {Object.entries(COMM).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Assigned to — hidden once player is available */}
      {avail!=="available"&&(
        <div>
          <Label>Assigned To</Label>
          <input value={assignee} onChange={e=>onUpdate({assignedTo:e.target.value})} placeholder="Who's handling this player?"
            style={{width:"100%",background:assignee?C.blue+"18":"transparent",border:`1px solid ${assignee?C.blue+"55":C.border}`,color:assignee?C.blueLight:C.chalkDim,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none"}}
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        {editNote?(
          <div style={{display:"flex",gap:8}}>
            <input value={noteVal} onChange={e=>setNoteVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onUpdate({notes:noteVal});setEditNote(false);}}} autoFocus
              style={{flex:1,background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none"}}
            />
            <button onClick={()=>{onUpdate({notes:noteVal});setEditNote(false);}} style={{background:C.amber,border:"none",color:C.black,borderRadius:8,padding:"9px 14px",fontWeight:800,cursor:"pointer",fontSize:13}}>✓</button>
          </div>
        ):(
          <div onClick={()=>{setNoteVal(notes);setEditNote(true);}} style={{background:C.blackLight,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:notes?C.chalk:C.chalkDim,cursor:"text",minHeight:38}}>
            {notes||"Tap to add note…"}
          </div>
        )}
      </div>

      {/* Reset */}
      <button onClick={()=>onUpdate({availability:"unknown",commStatus:"not_contacted",notes:"",assignedTo:""})}
        style={{background:"none",border:`1px solid ${C.chalkFaint}`,color:C.chalkDim,borderRadius:8,padding:"6px",fontSize:12,cursor:"pointer",fontWeight:600}}>
        ↺ Reset
      </button>
    </Card>
  );
}

// ─── Shirt positions for Team Builder ────────────────────────────────────────
const SHIRT_SLOTS=[
  {num:1, pos:"Loosehead Prop"},  {num:2, pos:"Hooker"},
  {num:3, pos:"Tighthead Prop"},  {num:4, pos:"Lock"},
  {num:5, pos:"Lock"},            {num:6, pos:"Blindside Flanker"},
  {num:7, pos:"Openside Flanker"},{num:8, pos:"Number Eight"},
  {num:9, pos:"Scrum-half"},      {num:10,pos:"Fly-half"},
  {num:11,pos:"Left Wing"},       {num:12,pos:"Inside Centre"},
  {num:13,pos:"Outside Centre"},  {num:14,pos:"Right Wing"},
  {num:15,pos:"Fullback"},
];

// ─── Team Builder ─────────────────────────────────────────────────────────────
function TeamBuilder({match,squad,injuries,onUpdateTeam}){
  const isMobile=useIsMobile();
  const [copied,setCopied]=useState(false);
  const active=squad.filter(p=>!injuries[p.id]);
  const eligible=active.filter(p=>(match.players||{})[p.id]?.availability==="available");
  const team=match.team||{};
  const assignedIds=new Set(Object.values(team).filter(Boolean));

  const setSlot=(slotKey,playerId)=>{
    const updated={...team};
    Object.keys(updated).forEach(k=>{if(updated[k]===playerId) delete updated[k];});
    if(playerId) updated[slotKey]=playerId; else delete updated[slotKey];
    onUpdateTeam(match.id,updated);
  };

  const addReservistSlot=()=>{
    onUpdateTeam(match.id,{...team,[`res_${Date.now()}`]:""});
  };

  const removeReservistSlot=(key)=>{
    const updated={...team}; delete updated[key];
    onUpdateTeam(match.id,updated);
  };

  const reservistKeys=Object.keys(team).filter(k=>k.startsWith("res_")).sort();
  const startingCount=SHIRT_SLOTS.filter(s=>team[`shirt_${s.num}`]).length;
  const reservistCount=reservistKeys.filter(k=>team[k]).length;
  const unplaced=eligible.filter(p=>!assignedIds.has(p.id));

  const playerOpts=(currentPid)=>[
    {v:"",l:"— Select player —"},
    ...eligible.map(p=>({
      v:p.id,
      l:`${p.num||"?"}.  ${p.name}  (${p.pos})`,
      taken:assignedIds.has(p.id)&&p.id!==currentPid,
    })),
  ];

  const SlotRow=({slotKey,shirtNum,posLabel,isReservist=false,onRemove})=>{
    const pid=team[slotKey]||"";
    const opts=playerOpts(pid);
    const accent=isReservist?C.blue:C.amber;
    return(
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
        borderBottom:`1px solid ${C.chalkFaint}`,transition:"background 0.1s"}}
        onMouseEnter={e=>e.currentTarget.style.background=C.blackLight}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
      >
        <div style={{width:38,height:38,borderRadius:8,flexShrink:0,display:"flex",
          alignItems:"center",justifyContent:"center",
          background:pid?accent+"22":C.blackLight,border:`2px solid ${pid?accent:C.chalkFaint}`}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:900,
            color:pid?accent:C.chalkDim}}>{shirtNum}</span>
        </div>
        <div style={{fontSize:12,color:C.chalkDim,width:isMobile?80:130,flexShrink:0,lineHeight:1.3}}>{posLabel}</div>
        <select value={pid} onChange={e=>setSlot(slotKey,e.target.value)}
          style={{flex:1,minWidth:0,background:pid?accent+"14":C.blackLight,
            border:`1px solid ${pid?accent+"55":C.border}`,color:pid?C.chalk:C.chalkDim,
            borderRadius:8,padding:"9px 10px",fontSize:13,fontWeight:pid?700:400,
            cursor:"pointer",outline:"none"}}>
          {opts.map(o=>(
            <option key={o.v} value={o.v} disabled={o.taken} style={{color:o.taken?"#555":undefined}}>
              {o.l}{o.taken?" (picked)":""}
            </option>
          ))}
        </select>
        {onRemove&&(
          <button onClick={onRemove} style={{background:"none",border:"none",color:C.red,
            cursor:"pointer",fontSize:18,lineHeight:1,flexShrink:0,opacity:0.5}}
            onMouseEnter={e=>e.currentTarget.style.opacity=1}
            onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>✕</button>
        )}
      </div>
    );
  };

  const copyTeam=()=>{
    const lines=[];
    SHIRT_SLOTS.forEach(s=>{
      const pid=team[`shirt_${s.num}`];
      const pl=pid?active.find(p=>p.id===pid):null;
      lines.push(`${s.num}. ${pl?pl.name:"TBC"}`);
    });
    reservistKeys.forEach((k,i)=>{
      const pid=team[k];
      const pl=pid?active.find(p=>p.id===pid):null;
      lines.push(`${16+i}. ${pl?pl.name:"TBC"}`);
    });
    const matchTitle=`${match.homeTeam} vs ${match.awayTeam} — ${fmtDate(match.date)}`;
    const text=`🏉 ${matchTitle}\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text).then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false),2500);
    }).catch(()=>alert(text));
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {eligible.length===0&&(
        <Card style={{padding:"24px 20px",textAlign:"center",color:C.chalkDim}}>
          No players marked as <strong style={{color:C.green}}>Available</strong> yet.
          <span style={{fontSize:12,marginTop:6,display:"block"}}>
            Use the Comms Tracker tab to set availability first.
          </span>
        </Card>
      )}
      {eligible.length>0&&(
        <>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <Pill color={C.amber}>{startingCount}/15 starters</Pill>
            <Pill color={C.blue}>{reservistCount} reservists</Pill>
            <Pill color={C.green}>{eligible.length} available to pick</Pill>
            <button onClick={copyTeam} style={{marginLeft:"auto",
              background:copied?C.green+"22":C.blackLight,
              border:`1px solid ${copied?C.green+"55":C.border}`,
              color:copied?C.green:C.chalk,borderRadius:8,padding:"8px 14px",
              fontSize:12,fontWeight:800,cursor:"pointer",letterSpacing:"0.04em",
              textTransform:"uppercase",transition:"all 0.2s"}}>
              {copied?"✓ Copied!":"📋 Copy Team"}
            </button>
          </div>

          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,
            letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>Starting XV</div>
          <Card style={{overflow:"hidden"}}>
            {SHIRT_SLOTS.map(s=>(
              <SlotRow key={s.num} slotKey={`shirt_${s.num}`} shirtNum={s.num} posLabel={s.pos}/>
            ))}
          </Card>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.blue,
              letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>Reservists</div>
            <Btn small variant="ghost" onClick={addReservistSlot}>+ Add Slot</Btn>
          </div>

          {reservistKeys.length===0&&(
            <Card style={{padding:"18px 20px",textAlign:"center",color:C.chalkDim,fontSize:13}}>
              Tap "+ Add Slot" to add reservists (16, 17, 18…)
            </Card>
          )}
          {reservistKeys.length>0&&(
            <Card style={{overflow:"hidden"}}>
              {reservistKeys.map((k,i)=>(
                <SlotRow key={k} slotKey={k} shirtNum={16+i} posLabel="Reservist"
                  isReservist onRemove={()=>removeReservistSlot(k)}/>
              ))}
            </Card>
          )}

          {unplaced.length>0&&(
            <>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.chalkDim,
                letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
                Available — Not Yet Picked ({unplaced.length})
              </div>
              <Card style={{padding:"12px 14px",display:"flex",flexWrap:"wrap",gap:8}}>
                {unplaced.map(p=>(
                  <div key={p.id} style={{background:C.blackLight,border:`1px solid ${C.border}`,
                    borderRadius:8,padding:"6px 12px",fontSize:12,color:C.chalkDim}}>
                    <span style={{color:C.amber,fontWeight:800,marginRight:4}}>{p.num||"?"}</span>
                    {p.name}<span style={{fontSize:10,color:C.chalkDim,marginLeft:4}}>({p.pos})</span>
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Comms Tracker ────────────────────────────────────────────────────────────
function CommsTracker({match,squad,injuries,onUpdate,onInjure}){
  const [filterAvail,setFilterAvail]=useState("all");
  const [filterComm, setFilterComm] =useState("all");
  const [filterPos,  setFilterPos]  =useState("all");
  const [search,     setSearch]     =useState("");
  const active=squad.filter(p=>!injuries[p.id]);
  const players=match.players||{};
  const filtered=active.filter(p=>{
    const md=players[p.id]||{};
    if(filterAvail!=="all"&&(md.availability||"unknown")!==filterAvail) return false;
    if(filterComm !=="all"&&(md.commStatus||"not_contacted")!==filterComm) return false;
    if(filterPos  !=="all"&&p.pos!==filterPos) return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const positions=[...new Set(active.map(p=>p.pos))];
  const available=active.filter(p=>(players[p.id]?.availability||"unknown")==="available").length;
  const notContacted=active.filter(p=>(players[p.id]?.commStatus||"not_contacted")==="not_contacted").length;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Pill color={C.green}>{available} available</Pill>
        <Pill color={C.chalkDim}>{notContacted} to contact</Pill>
      </div>
      <Card style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player..."
          style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,
            borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",width:"100%"}}
        />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Sel value={filterAvail} onChange={setFilterAvail} options={[{v:"all",l:"All Availability"},...Object.entries(AVAIL).map(([k,v])=>({v:k,l:v.label}))]}/>
          <Sel value={filterComm}  onChange={setFilterComm}  options={[{v:"all",l:"All Comm Status"} ,...Object.entries(COMM).map(([k,v])=>({v:k,l:v.label}))]}/>
        </div>
        <Sel value={filterPos} onChange={setFilterPos} options={[{v:"all",l:"All Positions"},...positions.map(p=>({v:p,l:p}))]} style={{width:"100%"}}/>
        <div style={{fontSize:11,color:C.chalkDim,textAlign:"right"}}>{filtered.length} of {active.length} players</div>
      </Card>
      {filtered.length===0&&<div style={{color:C.chalkDim,fontSize:13,textAlign:"center",padding:"24px 0"}}>No players match filters.</div>}
      {filtered.map(p=>(
        <PlayerCard key={p.id} player={p} matchData={players[p.id]}
          onUpdate={patch=>onUpdate(match.id,p.id,patch)}
          onInjure={()=>onInjure(p)}
        />
      ))}
    </div>
  );
}

// ─── Match View — tabbed ──────────────────────────────────────────────────────
function MatchView({match,squad,injuries,onUpdate,onInjure,onUpdateTeam,onBack}){
  const [activeTab,setActiveTab]=useState("comms");
  const isMobile=useIsMobile();
  const active=squad.filter(p=>!injuries[p.id]);
  const players=match.players||{};
  const available=active.filter(p=>(players[p.id]?.availability||"unknown")==="available").length;
  const notContacted=active.filter(p=>(players[p.id]?.commStatus||"not_contacted")==="not_contacted").length;
  const teamSize=Object.values(match.team||{}).filter(Boolean).length;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:C.blackLight,border:`1px solid ${C.border}`,
          color:C.chalkDim,borderRadius:8,padding:"8px 14px",cursor:"pointer",
          fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>
          ← Back
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:isMobile?20:26,
            fontWeight:900,color:C.chalk,lineHeight:1.1}}>
            {match.homeTeam} <span style={{color:C.amber}}>vs</span> {match.awayTeam}
          </div>
          <div style={{fontSize:12,color:C.chalkDim,marginTop:2}}>
            {fmtDate(match.date)}{match.kickoff&&` · KO ${match.kickoff}`}{match.venue&&` · ${match.venue}`}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Pill color={C.green}>{available} available</Pill>
        <Pill color={C.chalkDim}>{notContacted} to contact</Pill>
        {teamSize>0&&<Pill color={C.amber}>{teamSize} selected</Pill>}
      </div>
      <div style={{display:"flex",background:C.blackLight,borderRadius:10,padding:4,gap:4,
        border:`1px solid ${C.border}`}}>
        {[{id:"comms",label:"Comms Tracker",icon:"📞"},{id:"team",label:"Team Builder",icon:"🏉"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            flex:1,padding:"11px 8px",borderRadius:8,border:"none",cursor:"pointer",
            fontWeight:800,fontSize:isMobile?12:13,letterSpacing:"0.04em",textTransform:"uppercase",
            transition:"all 0.15s",
            background:activeTab===t.id?C.amber:"transparent",
            color:activeTab===t.id?C.black:C.chalkDim,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      {activeTab==="comms"&&(
        <CommsTracker match={match} squad={squad} injuries={injuries}
          onUpdate={onUpdate} onInjure={onInjure}/>
      )}
      {activeTab==="team"&&(
        <TeamBuilder match={match} squad={squad} injuries={injuries}
          onUpdateTeam={onUpdateTeam}/>
      )}
    </div>
  );
}

// ─── Injury Pool ──────────────────────────────────────────────────────────────
function InjuryPool({squad,injuries,onClear,onAdd}){
  const [showAdd,setShowAdd]=useState(false);
  const [selId,setSelId]=useState("");
  const [returnDate,setReturnDate]=useState("");
  const [injuryNote,setInjuryNote]=useState("");

  const injured=squad.filter(p=>injuries[p.id]);
  const healthy=squad.filter(p=>!injuries[p.id]);

  const doAdd=()=>{
    if(!selId||!returnDate) return;
    onAdd(selId,{returnDate,note:injuryNote,since:today()});
    setShowAdd(false); setSelId(""); setReturnDate(""); setInjuryNote("");
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:C.orange,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
          🩹 Injury Pool ({injured.length})
        </div>
        <Btn variant="orange" small onClick={()=>setShowAdd(true)}>+ Add Injury</Btn>
      </div>

      {injured.length===0&&(
        <Card style={{padding:"28px 20px",textAlign:"center",color:C.chalkDim}}>
          No current injuries 💪
        </Card>
      )}

      {injured.map(p=>{
        const inj=injuries[p.id];
        const days=daysUntil(inj.returnDate);
        const daysColor=days<=7?C.red:days<=14?C.amber:C.green;
        return(
          <Card key={p.id} style={{padding:"16px 18px",borderLeft:`4px solid ${C.orange}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.amber}}>{p.num||"—"}</span>
                  <span style={{fontSize:15,fontWeight:700,color:C.chalk}}>{p.name}</span>
                </div>
                <div style={{fontSize:12,color:C.chalkDim}}>{p.pos}</div>
                {inj.note&&<div style={{fontSize:12,color:C.chalk,marginTop:6,background:C.blackLight,padding:"6px 10px",borderRadius:6}}>📋 {inj.note}</div>}
              </div>
              <button onClick={()=>onClear(p.id)} style={{background:C.green+"22",border:`1px solid ${C.green}44`,color:C.green,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                ✓ Fit
              </button>
            </div>
            <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <Pill color={C.orange}>Injured {inj.since}</Pill>
              <div style={{background:daysColor+"22",border:`1px solid ${daysColor}44`,color:daysColor,borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700}}>
                {days<=0?"Return overdue":`Return in ${days} day${days!==1?"s":""}`} — {fmtDate(inj.returnDate)}
              </div>
            </div>
          </Card>
        );
      })}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add to Injury Pool">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <Label>Player</Label>
            <Sel value={selId} onChange={setSelId} style={{width:"100%"}}
              options={[{v:"",l:"Select player…"},...healthy.map(p=>({v:p.id,l:`${p.num||"?"} — ${p.name}`}))]}/>
          </div>
          <div>
            <Label>Expected Return Date</Label>
            <Input value={returnDate} onChange={setReturnDate} type="date"/>
          </div>
          <div>
            <Label>Injury Note (optional)</Label>
            <Input value={injuryNote} onChange={setInjuryNote} placeholder="e.g. Hamstring, grade 2"/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={doAdd} disabled={!selId||!returnDate} full>Add to Injury Pool</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Squad Page ───────────────────────────────────────────────────────────────
function SquadPage({squad,injuries,onSetSquad,onInjure,onClearInjury}){
  const [showAdd,   setShowAdd]   =useState(false);
  const [showImport,setShowImport]=useState(false);
  const [editId,    setEditId]    =useState(null);
  const [addName,   setAddName]   =useState("");
  const [addPos,    setAddPos]    =useState(POSITIONS[0]);
  const [addRole,   setAddRole]   =useState("");
  const [csvText,   setCsvText]   =useState("");
  const [csvErr,    setCsvErr]    =useState("");
  const fileRef=useRef();

  const addPlayer=()=>{
    if(!addName.trim()) return;
    onSetSquad([...squad,{id:uid(),name:addName.trim(),pos:addPos,role:addRole.trim()}]);
    setAddName(""); setAddRole(""); setShowAdd(false);
  };
  const removePlayer=id=>onSetSquad(squad.filter(p=>p.id!==id));
  const loadDemo=()=>onSetSquad(DEMO_SQUAD.map(p=>({...p,id:uid()})));
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setCsvText(ev.target.result);r.readAsText(f);};
  const importCSV=()=>{
    const parsed=parseCSV(csvText);
    if(!parsed.length){setCsvErr("Could not parse. Ensure file has a 'name' column.");return;}
    onSetSquad(parsed); setCsvText(""); setCsvErr(""); setShowImport(false);
  };
  const saveEdit=(id,patch)=>onSetSquad(squad.map(p=>p.id===id?{...p,...patch}:p));

  // inline edit state
  const EditRow=({p})=>{
    const [name,setName]=useState(p.name);
    const [pos, setPos] =useState(p.pos||POSITIONS[0]);
    const [role,setRole]=useState(p.role||"");
    const save=()=>{saveEdit(p.id,{name:name.trim(),pos,role:role.trim()});setEditId(null);};
    return(
      <Card style={{padding:"14px 16px",borderLeft:`4px solid ${C.amber}`,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><Label>Name</Label>
            <input value={name} onChange={e=>setName(e.target.value)}
              style={{width:"100%",background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none"}}/>
          </div>
          <div><Label>Group</Label>
            <Sel value={pos} onChange={setPos} style={{width:"100%"}} options={POSITIONS.map(p=>({v:p,l:p}))}/>
          </div>
        </div>
        <div><Label>Specific Role (e.g. Hooker, Openside)</Label>
          <input value={role} onChange={e=>setRole(e.target.value)} placeholder="Optional detail…"
            style={{width:"100%",background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn small onClick={save}>Save</Btn>
          <Btn small variant="ghost" onClick={()=>setEditId(null)}>Cancel</Btn>
        </div>
      </Card>
    );
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Btn onClick={()=>setShowAdd(true)}>+ Add Player</Btn>
        <Btn variant="ghost" onClick={()=>setShowImport(true)}>↑ Import CSV</Btn>
        <Btn variant="ghost" onClick={loadDemo}>Demo Squad</Btn>
      </div>
      <div style={{fontSize:12,color:C.chalkDim}}>{squad.length} players · {Object.keys(injuries).length} injured</div>
      {squad.length===0&&<Card style={{padding:"28px 20px",textAlign:"center",color:C.chalkDim}}>No players yet.</Card>}
      {[...squad].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>{
        if(editId===p.id) return <EditRow key={p.id} p={p}/>;
        const inj=injuries[p.id];
        return(
          <Card key={p.id} style={{padding:"13px 16px",borderLeft:`4px solid ${inj?C.orange:C.chalkFaint}`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:inj?C.chalkDim:C.chalk}}>
                {p.name}{inj&&<span style={{fontSize:11,color:C.orange,marginLeft:8}}>🩹 Injured</span>}
              </div>
              <div style={{fontSize:12,color:C.chalkDim,marginTop:1}}>
                {p.pos}{p.role&&<span style={{color:C.amber,marginLeft:6}}>· {p.role}</span>}
                {inj&&<> · Back {fmtDate(inj.returnDate)}</>}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>setEditId(p.id)} style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalkDim,borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✏️</button>
              {inj
                ?<button onClick={()=>onClearInjury(p.id)} style={{background:C.green+"22",border:`1px solid ${C.green}44`,color:C.green,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer"}}>✓ Fit</button>
                :<button onClick={()=>onInjure(p)} style={{background:C.orange+"22",border:`1px solid ${C.orange}44`,color:C.orangeLight,borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>🩹</button>
              }
              <button onClick={()=>removePlayer(p.id)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:18,lineHeight:1,opacity:0.5}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>✕</button>
            </div>
          </Card>
        );
      })}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Player">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><Label>Full Name</Label><Input value={addName} onChange={setAddName} placeholder="e.g. John Smith"/></div>
          <div><Label>Position Group</Label><Sel value={addPos} onChange={setAddPos} style={{width:"100%"}} options={POSITIONS.map(p=>({v:p,l:p}))}/></div>
          <div><Label>Specific Role (optional)</Label><Input value={addRole} onChange={setAddRole} placeholder="e.g. Hooker, Openside Flanker"/></div>
          <Btn onClick={addPlayer} disabled={!addName.trim()} full>Add to Squad</Btn>
        </div>
      </Modal>
      <Modal open={showImport} onClose={()=>setShowImport(false)} title="Import CSV">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontSize:12,color:C.chalkDim,lineHeight:1.7}}>
            CSV columns: <strong style={{color:C.chalk}}>name</strong>, <strong style={{color:C.chalk}}>position</strong><br/>
            Header row: <code style={{color:C.amber,background:C.blackLight,padding:"1px 5px",borderRadius:4}}>name,position</code>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{color:C.chalk,fontSize:13}}/>
          {csvText&&<textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={6} style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:"monospace",resize:"vertical",outline:"none"}}/>}
          {csvErr&&<div style={{color:C.redLight,fontSize:12}}>{csvErr}</div>}
          <Btn onClick={importCSV} disabled={!csvText} full>Import Squad</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Matches Page ─────────────────────────────────────────────────────────────
function MatchesPage({matches,onAdd,onDelete,onSelect,onSetResult}){
  const [showAdd,    setShowAdd]    =useState(false);
  const [showPast,   setShowPast]   =useState(false);
  const [homeTeam,   setHomeTeam]   =useState("Bromley RFC");
  const [awayTeam,   setAwayTeam]   =useState("");
  const [date,       setDate]       =useState(today());
  const [venue,      setVenue]      =useState("");
  const [kickoff,    setKickoff]    =useState("15:00");

  const create=()=>{
    if(!homeTeam.trim()||!awayTeam.trim()) return;
    onAdd({id:uid(),homeTeam:homeTeam.trim(),awayTeam:awayTeam.trim(),date,venue,kickoff,players:{}});
    setShowAdd(false); setAwayTeam(""); setVenue("");
  };

  const upcoming=[...matches].filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  const past    =[...matches].filter(m=>m.date< today()).sort((a,b)=>b.date.localeCompare(a.date));

  const RESULTS=[
    {v:"",     l:"No Result"},
    {v:"win",  l:"Win"},
    {v:"loss", l:"Loss"},
    {v:"draw", l:"Draw"},
  ];
  const resultStyle={
    win: {color:C.green,  bg:C.green+"22",  border:C.green+"44",  label:"W"},
    loss:{color:C.red,    bg:C.red+"22",    border:C.red+"44",    label:"L"},
    draw:{color:C.amber,  bg:C.amber+"22",  border:C.amber+"44",  label:"D"},
  };

  const MatchCard=({m,isPast})=>{
    const rs=m.result&&resultStyle[m.result];
    return(
      <Card style={{padding:"15px 18px",borderLeft:`4px solid ${rs?resultStyle[m.result].color:isPast?C.chalkFaint:C.amber}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,fontWeight:800,color:C.chalk}}>
              {m.homeTeam} <span style={{color:C.amber}}>vs</span> {m.awayTeam}
            </div>
            <div style={{fontSize:12,color:C.chalkDim,marginTop:3}}>
              {fmtDate(m.date)}{m.kickoff&&` · KO ${m.kickoff}`}{m.venue&&` · ${m.venue}`}
            </div>
          </div>
          {rs&&(
            <div style={{background:rs.bg,border:`1px solid ${rs.border}`,color:rs.color,
              borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:900,
              fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.08em",flexShrink:0}}>
              {rs.label}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
          <Btn small onClick={()=>onSelect(m.id)}>Manage</Btn>
          {isPast&&(
            <select value={m.result||""} onChange={e=>onSetResult(m.id,e.target.value)}
              style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,
                borderRadius:6,padding:"6px 10px",fontSize:12,cursor:"pointer",outline:"none"}}>
              {RESULTS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          )}
          <Btn small variant="danger" onClick={()=>{if(confirm("Delete this match?"))onDelete(m.id);}}>Delete</Btn>
        </div>
      </Card>
    );
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Btn onClick={()=>setShowAdd(true)} style={{alignSelf:"flex-start"}}>+ New Match</Btn>

      {/* Upcoming */}
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,
        letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
        Upcoming ({upcoming.length})
      </div>
      {upcoming.length===0&&<Card style={{padding:"20px",textAlign:"center",color:C.chalkDim,fontSize:13}}>No upcoming matches.</Card>}
      {upcoming.map(m=><MatchCard key={m.id} m={m} isPast={false}/>)}

      {/* Past — collapsible */}
      {past.length>0&&(
        <>
          <button onClick={()=>setShowPast(p=>!p)} style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            background:C.blackLight,border:`1px solid ${C.border}`,
            borderRadius:10,padding:"12px 16px",cursor:"pointer",width:"100%",
          }}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.chalkDim,
              letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
              Past Matches ({past.length})
            </span>
            <span style={{color:C.chalkDim,fontSize:18,lineHeight:1}}>{showPast?"▲":"▼"}</span>
          </button>
          {showPast&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {past.map(m=><MatchCard key={m.id} m={m} isPast/>)}
            </div>
          )}
        </>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="New Match">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><Label>Your Team *</Label><Input value={homeTeam} onChange={setHomeTeam} placeholder="Bromley RFC"/></div>
          <div><Label>Opponent *</Label><Input value={awayTeam} onChange={setAwayTeam} placeholder="e.g. Beckenham RFC"/></div>
          <div><Label>Date *</Label><Input value={date} onChange={setDate} type="date"/></div>
          <div><Label>Kickoff Time</Label><Input value={kickoff} onChange={setKickoff} type="time"/></div>
          <div><Label>Venue</Label><Input value={venue} onChange={setVenue} placeholder="e.g. Norman Park"/></div>
          <Btn onClick={create} disabled={!homeTeam.trim()||!awayTeam.trim()} full>Create Match</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Injure helper modal (used from match view) ───────────────────────────────
function InjureModal({player,open,onClose,onConfirm}){
  const [returnDate,setReturnDate]=useState("");
  const [note,setNote]=useState("");
  if(!open||!player) return null;
  return(
    <Modal open={open} onClose={onClose} title={`Injure — ${player.name}`}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Label>Expected Return Date *</Label><Input value={returnDate} onChange={setReturnDate} type="date"/></div>
        <div><Label>Injury Note (optional)</Label><Input value={note} onChange={setNote} placeholder="e.g. Ankle sprain"/></div>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={()=>{onConfirm(player.id,{returnDate,note,since:today()});setReturnDate("");setNote("");}} disabled={!returnDate} full>Confirm</Btn>
          <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}


// ─── Simple Bar Chart ─────────────────────────────────────────────────────────
function BarChart({data,color=C.amber,maxVal,height=160,labelKey="label",valueKey="value"}){
  const max=maxVal||Math.max(...data.map(d=>d[valueKey]),1);
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:6,height,paddingTop:8}}>
      {data.map((d,i)=>{
        const pct=max>0?(d[valueKey]/max)*100:0;
        return(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
            <div style={{fontSize:10,color:C.chalk,fontWeight:700}}>{d[valueKey]||""}</div>
            <div style={{width:"100%",background:color,borderRadius:"4px 4px 0 0",
              height:`${pct}%`,minHeight:pct>0?4:0,transition:"height 0.4s ease",
              opacity:0.85+0.15*(pct/100)}}/>
            <div style={{fontSize:9,color:C.chalkDim,textAlign:"center",lineHeight:1.2,
              overflow:"hidden",textOverflow:"ellipsis",width:"100%",whiteSpace:"nowrap"}}>
              {d[labelKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats Page ───────────────────────────────────────────────────────────────
function StatsPage({matches,squad,injuries}){
  const [sortBy,setSortBy]=useState("played");
  const [posFilter,setPosFilter]=useState("all");

  const pastMatches=matches.filter(m=>m.date<today());
  const upcoming=matches.filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  const nextMatch=upcoming[0];

  // ── Per-player stats ──────────────────────────────────────────────────────
  const playerStats=squad.map(p=>{
    let played=0, totalAsked=0;
    matches.forEach(m=>{
      const mp=(m.players||{})[p.id];
      if(mp) totalAsked++;
      const team=m.team||{};
      if(Object.values(team).includes(p.id)) played++;
    });
    return{...p,played,totalAsked};
  });

  // ── Never played ──────────────────────────────────────────────────────────
  const neverPlayed=playerStats.filter(p=>p.played===0&&p.totalAsked>0);
  const neverAsked =playerStats.filter(p=>p.totalAsked===0);

  // ── Win/loss record ───────────────────────────────────────────────────────
  const wins  =pastMatches.filter(m=>m.result==="win").length;
  const losses=pastMatches.filter(m=>m.result==="loss").length;
  const draws =pastMatches.filter(m=>m.result==="draw").length;

  // ── Next match availability ───────────────────────────────────────────────
  const nextAvail=nextMatch
    ?squad.filter(p=>!injuries[p.id]&&(nextMatch.players||{})[p.id]?.availability==="available").length
    :null;
  const nextNotContacted=nextMatch
    ?squad.filter(p=>!injuries[p.id]&&!(nextMatch.players||{})[p.id]?.commStatus||(nextMatch.players||{})[p.id]?.commStatus==="not_contacted").length
    :null;

  // ── Filtered sorted player table ──────────────────────────────────────────
  const positions=[...new Set(squad.map(p=>p.pos))].sort();
  const filtered=[...playerStats]
    .filter(p=>posFilter==="all"||p.pos===posFilter)
    .sort((a,b)=>{
      if(sortBy==="played") return b.played-a.played;
      if(sortBy==="name")   return a.name.localeCompare(b.name);
      return 0;
    });

  const SummaryCard=({label,value,color=C.amber,sub})=>(
    <Card style={{padding:"16px 18px",borderBottom:`3px solid ${color}`}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:900,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:10,color:C.chalkDim,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginTop:4}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:C.chalkDim,marginTop:3}}>{sub}</div>}
    </Card>
  );

  const noData=pastMatches.length===0&&playerStats.every(p=>p.totalAsked===0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {noData&&(
        <Card style={{padding:"32px 20px",textAlign:"center",color:C.chalkDim}}>
          <div style={{fontSize:32,marginBottom:8}}>📊</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.chalk,marginBottom:8}}>
            No stats yet
          </div>
          <div style={{fontSize:13,lineHeight:1.6}}>
            Stats appear once you have past matches and have used the Comms Tracker or Team Builder.
          </div>
        </Card>
      )}

      {!noData&&(
        <>
          {/* ── Season overview ── */}
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,
            letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>Season Overview</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            <SummaryCard label="Matches Played" value={pastMatches.length} color={C.amber}/>
            <SummaryCard label="Squad Size" value={squad.length} color={C.blue}
              sub={`${Object.keys(injuries).length} injured`}/>
            {pastMatches.some(m=>m.result)
              ?<Card style={{padding:"16px 18px",borderBottom:`3px solid ${C.green}`}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.green}}>{wins}</span>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.amber}}>{draws}</span>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.red}}>{losses}</span>
                </div>
                <div style={{fontSize:10,color:C.chalkDim,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700}}>W · D · L</div>
              </Card>
              :<SummaryCard label="Results" value="—" color={C.chalkDim} sub="Add results in Matches tab"/>
            }
          </div>

          {/* ── Next match availability ── */}
          {nextMatch&&(
            <>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,
                letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
                Next Match — {nextMatch.homeTeam} vs {nextMatch.awayTeam}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <SummaryCard label="Confirmed Available" value={nextAvail??0} color={C.green}/>
                <SummaryCard label="Yet to Contact" value={nextNotContacted??0} color={C.chalkDim}/>
              </div>
            </>
          )}

          {/* ── Never played ── */}
          {neverPlayed.length>0&&(
            <>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.red,
                letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>
                0 Games Played ({neverPlayed.length})
              </div>
              <Card style={{padding:"12px 14px",display:"flex",flexWrap:"wrap",gap:8}}>
                {[...neverPlayed].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>(
                  <div key={p.id} style={{background:C.red+"18",border:`1px solid ${C.red}44`,
                    borderRadius:8,padding:"6px 12px",fontSize:12}}>
                    <span style={{color:C.chalk,fontWeight:700}}>{p.name}</span>
                    <span style={{color:C.chalkDim,fontSize:10,marginLeft:6}}>{p.pos}</span>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* ── Player stats table ── */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.amber,
              letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:800}}>Player Stats</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <select value={posFilter} onChange={e=>setPosFilter(e.target.value)}
                style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,
                  borderRadius:6,padding:"6px 10px",fontSize:12,cursor:"pointer",outline:"none"}}>
                <option value="all">All Positions</option>
                {positions.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,
                  borderRadius:6,padding:"6px 10px",fontSize:12,cursor:"pointer",outline:"none"}}>
                <option value="played">Sort: Games Played</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
            </div>
          </div>

          <Card style={{overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:8,
              padding:"8px 14px",background:C.blackLight,borderBottom:`1px solid ${C.border}`}}>
              {["Player","Played"].map((h,i)=>(
                <div key={h} style={{fontSize:9,color:C.amber,fontWeight:800,
                  letterSpacing:"0.1em",textTransform:"uppercase",
                  textAlign:i>0?"center":"left"}}>{h}</div>
              ))}
            </div>
            {filtered.length===0&&(
              <div style={{padding:"20px",textAlign:"center",color:C.chalkDim,fontSize:13}}>No data yet.</div>
            )}
            {filtered.map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:8,
                padding:"10px 14px",borderBottom:i<filtered.length-1?`1px solid ${C.chalkFaint}`:"none",
                transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.blackLight}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:p.played===0?C.chalkDim:C.chalk}}>{p.name}</div>
                  <div style={{fontSize:10,color:C.chalkDim}}>{p.pos}{p.role&&` · ${p.role}`}</div>
                </div>
                <div style={{textAlign:"center",fontSize:16,fontWeight:800,
                  color:p.played>0?C.amber:C.chalkDim,alignSelf:"center"}}>{p.played}</div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}



// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen(){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [resetSent,setResetSent]=useState(false);

  const handleAuth=async()=>{
    if(!email.trim()||!password.trim()){setError("Email and password required");return;}
    setError(""); setLoading(true);
    try{
      if(mode==="login"){
        await signInWithEmailAndPassword(auth,email.trim(),password);
      }else{
        await createUserWithEmailAndPassword(auth,email.trim(),password);
      }
    }catch(e){
      if(e.code==="auth/email-already-in-use") setError("Email already registered — try logging in");
      else if(e.code==="auth/invalid-email") setError("Invalid email address");
      else if(e.code==="auth/weak-password") setError("Password must be at least 6 characters");
      else if(e.code==="auth/user-not-found"||e.code==="auth/wrong-password") setError("Invalid email or password");
      else if(e.code==="auth/invalid-credential") setError("Invalid email or password");
      else setError(e.message);
    }
    setLoading(false);
  };

  const handleReset=async()=>{
    if(!email.trim()){setError("Enter your email first");return;}
    setError(""); setLoading(true);
    try{
      await sendPasswordResetEmail(auth,email.trim());
      setResetSent(true);
    }catch(e){
      setError("Failed to send reset email — check the address is correct");
    }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.black,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",position:"relative"}}>
      {/* Texture */}
      <div style={{position:"absolute",inset:0,opacity:0.022,
        backgroundImage:`repeating-linear-gradient(-45deg,${C.amber} 0,${C.amber} 1px,transparent 0,transparent 50%)`,
        backgroundSize:"14px 14px"}}/>
      
      <Card style={{padding:"32px 28px",maxWidth:420,width:"100%",position:"relative",zIndex:1,
        borderTop:`4px solid ${C.amber}`,boxShadow:`0 8px 40px rgba(0,0,0,0.6)`}}>
        {/* Logo + Title */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <img src={LOGO} alt="Bromley RFC" style={{width:56,height:56,objectFit:"contain",
            filter:"drop-shadow(0 0 12px #f5a80066)",marginBottom:12}}/>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,
            color:C.chalk,letterSpacing:"0.06em",textTransform:"uppercase"}}>Bromley RFC</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,
            letterSpacing:"0.18em",color:C.amber,textTransform:"uppercase"}}>Squad Tracker</div>
        </div>

        {resetSent?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>✉️</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,
              color:C.chalk,marginBottom:8}}>Check Your Email</div>
            <div style={{fontSize:13,color:C.chalkDim,lineHeight:1.6,marginBottom:20}}>
              Password reset link sent to <strong style={{color:C.chalk}}>{email}</strong>
            </div>
            <button onClick={()=>{setResetSent(false);setMode("login");}}
              style={{background:C.amber,border:"none",color:C.black,borderRadius:8,
                padding:"10px 24px",fontSize:13,fontWeight:800,cursor:"pointer",
                letterSpacing:"0.05em",textTransform:"uppercase"}}>
              Back to Login
            </button>
          </div>
        ):(
          <>
            {/* Tab switcher */}
            <div style={{display:"flex",background:C.blackLight,borderRadius:10,padding:4,gap:4,
              marginBottom:20,border:`1px solid ${C.border}`}}>
              {["login","signup"].map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError("");}}
                  style={{flex:1,padding:"10px",borderRadius:8,border:"none",cursor:"pointer",
                    fontWeight:800,fontSize:13,letterSpacing:"0.04em",textTransform:"uppercase",
                    transition:"all 0.15s",background:mode===m?C.amber:"transparent",
                    color:mode===m?C.black:C.chalkDim}}>
                  {m==="login"?"Log In":"Sign Up"}
                </button>
              ))}
            </div>

            {/* Form */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <Label>Email</Label>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")handleAuth();}}
                  type="email" placeholder="your.email@example.com" autoComplete="email"
                  style={{width:"100%",background:C.blackLight,border:`1px solid ${C.border}`,
                    color:C.chalk,borderRadius:8,padding:"11px 14px",fontSize:14,outline:"none"}}/>
              </div>
              <div>
                <Label>Password</Label>
                <input value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")handleAuth();}}
                  type="password" placeholder={mode==="signup"?"Min 6 characters":"••••••••"}
                  autoComplete={mode==="login"?"current-password":"new-password"}
                  style={{width:"100%",background:C.blackLight,border:`1px solid ${C.border}`,
                    color:C.chalk,borderRadius:8,padding:"11px 14px",fontSize:14,outline:"none"}}/>
              </div>

              {error&&(
                <div style={{background:C.red+"22",border:`1px solid ${C.red}44`,
                  borderRadius:8,padding:"10px 14px",fontSize:12,color:C.redLight}}>
                  {error}
                </div>
              )}

              <button onClick={handleAuth} disabled={loading}
                style={{width:"100%",background:C.amber,border:"none",color:C.black,
                  borderRadius:8,padding:"12px",fontSize:14,fontWeight:800,cursor:loading?"wait":"pointer",
                  letterSpacing:"0.05em",textTransform:"uppercase",opacity:loading?0.5:1}}>
                {loading?"Please wait...":(mode==="login"?"Log In":"Create Account")}
              </button>

              {mode==="login"&&(
                <button onClick={handleReset}
                  style={{background:"none",border:"none",color:C.chalkDim,fontSize:12,
                    cursor:"pointer",textAlign:"center",textDecoration:"underline"}}>
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function AppContent(){
  const [tab,    setTab]    =useState("dashboard");
  const [matchId,setMatchId]=useState(null);
  const [squad,  setSquadS] =useState([]);
  const [matches,setMatchesS]=useState([]);
  const [injuries,setInjuriesS]=useState({});
  const [loaded, setLoaded] =useState(false);
  const [online, setOnline] =useState(true);
  const [injureTarget,setInjureTarget]=useState(null);
  const isMobile=useIsMobile();

  // Firebase listeners
  useEffect(()=>{
    let unsub1,unsub2,unsub3;
    try{
      onValue(ref(db,"brfc/squad"),  snap=>{setSquadS(snap.val()||[]);   setLoaded(true);});
      onValue(ref(db,"brfc/matches"),snap=>{setMatchesS(snap.val()||[]);});
      onValue(ref(db,"brfc/injuries"),snap=>{setInjuriesS(snap.val()||{});});
      setOnline(true);
    }catch(e){console.error("Firebase error",e);setOnline(false);setLoaded(true);}
  },[]);

  const saveSquad   =s =>{setSquadS(s);  dbSet("brfc/squad",s);};
  const saveMatches =m =>{setMatchesS(m);dbSet("brfc/matches",m);};
  const addInjury   =(id,data)=>{const n={...injuries,[id]:data};setInjuriesS(n);dbUpdate("brfc/injuries",{[id]:data});};
  const clearInjury =id=>{const n={...injuries};delete n[id];setInjuriesS(n);dbUpdate("brfc/injuries",{[id]:null});};

  const addMatch  =m =>saveMatches([...matches,m]);
  const deleteMatch=id=>saveMatches(matches.filter(m=>m.id!==id));

  const updatePlayer=async(matchId,playerId,patch)=>{
    const updated=matches.map(m=>{
      if(m.id!==matchId) return m;
      const prev=(m.players||{})[playerId]||{};
      return{...m,players:{...(m.players||{}),[playerId]:{...prev,...patch}}};
    });
    saveMatches(updated);
  };

  const updateTeam=(matchId,team)=>{
    const updated=matches.map(m=>m.id===matchId?{...m,team}:m);
    saveMatches(updated);
  };

  const setResult=(matchId,result)=>{
    const updated=matches.map(m=>m.id===matchId?{...m,result}:m);
    saveMatches(updated);
  };

  const selectedMatch=matches.find(m=>m.id===matchId);
  const isMatchView=tab==="matches"&&matchId&&selectedMatch;

  const goTo=(page,id=null)=>{setTab(page);setMatchId(id);};

  const TABS=[
    {id:"dashboard",label:"Home",    icon:"⚑"},
    {id:"matches",  label:"Matches", icon:"📅"},
    {id:"squad",    label:"Squad",   icon:"👥"},
    {id:"injuries", label:"Injuries",icon:"🩹"},
    {id:"stats",    label:"Stats",   icon:"📊"},
  ];

  if(!loaded) return(
    <div style={{minHeight:"100vh",background:C.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <img src={LOGO} alt="Bromley RFC" style={{width:64,height:64,objectFit:"contain"}}/>
      <div style={{color:C.amber,fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,letterSpacing:"0.14em",textTransform:"uppercase"}}>Loading…</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.black,fontFamily:"'DM Sans',sans-serif",color:C.chalk,paddingBottom:isMobile?80:0}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;}
        select option{background:#1e1e1e;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:#f5a80033;border-radius:99px;}
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator{filter:invert(0.6) sepia(1) hue-rotate(10deg) saturate(3);}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      {/* Subtle texture */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.022,backgroundImage:`repeating-linear-gradient(-45deg,${C.amber} 0,${C.amber} 1px,transparent 0,transparent 50%)`,backgroundSize:"14px 14px"}}/>

      {/* ── Top Header (desktop) / compact (mobile) ── */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(5,5,5,0.97)",backdropFilter:"blur(12px)",borderBottom:`3px solid ${C.amber}`,boxShadow:`0 4px 24px ${C.amberGlow}`}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",gap:12,height:isMobile?54:64,padding:`0 ${isMobile?14:24}px`}}>
          <img src={LOGO} alt="Bromley RFC" style={{width:isMobile?34:42,height:isMobile?34:42,objectFit:"contain",filter:"drop-shadow(0 0 8px #f5a80066)",flexShrink:0}}/>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:isMobile?16:20,letterSpacing:"0.06em",color:C.chalk,lineHeight:1.1,textTransform:"uppercase"}}>Bromley RFC</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,letterSpacing:"0.2em",color:C.amber,lineHeight:1,textTransform:"uppercase"}}>Squad Tracker</div>
          </div>

          {/* Desktop nav */}
          {!isMobile&&(
            <nav style={{display:"flex",gap:4,marginLeft:16}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>goTo(t.id)} style={{background:tab===t.id?C.amber:"transparent",border:`1px solid ${tab===t.id?C.amber:C.border}`,color:tab===t.id?C.black:C.chalkDim,borderRadius:6,padding:"5px 16px",fontSize:12,fontWeight:800,cursor:"pointer",transition:"all 0.15s",letterSpacing:"0.07em",textTransform:"uppercase"}}>
                  {t.label}
                </button>
              ))}
            </nav>
          )}

          {/* Connection dot + logout */}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:online?C.green:C.red,boxShadow:`0 0 6px ${online?C.green:C.red}`}}/>
              {!isMobile&&<span style={{fontSize:11,color:C.chalkDim}}>{online?"Live":"Offline"}</span>}
            </div>
            {!isMobile&&(
              <button onClick={()=>signOut(auth)}
                style={{background:"none",border:`1px solid ${C.border}`,color:C.chalkDim,
                  borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:700,cursor:"pointer",
                  letterSpacing:"0.05em",textTransform:"uppercase"}}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{maxWidth:900,margin:"0 auto",padding:isMobile?"16px 14px 24px":"28px 24px",position:"relative",zIndex:1}}>
        {/* Page title */}
        {!isMatchView&&(
          <div style={{marginBottom:20}}>
            <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:isMobile?34:44,fontWeight:900,color:C.chalk,letterSpacing:"0.05em",textTransform:"uppercase",lineHeight:1}}>
              {tab==="dashboard"?"Dashboard":tab==="squad"?"Squad":tab==="matches"?"Matches":tab==="stats"?"Stats":"Injury Pool"}
            </h1>
            <div style={{width:48,height:4,background:C.amber,borderRadius:99,marginTop:8}}/>
          </div>
        )}

        {tab==="dashboard"&&<Dashboard matches={matches} squad={squad} injuries={injuries} onGo={goTo}/>}
        {tab==="squad"    &&<SquadPage squad={squad} injuries={injuries} onSetSquad={saveSquad} onInjure={p=>setInjureTarget(p)} onClearInjury={clearInjury}/>}
        {tab==="matches"&&!isMatchView&&<MatchesPage matches={matches} onAdd={addMatch} onDelete={deleteMatch} onSelect={id=>setMatchId(id)} onSetResult={setResult}/>}
        {isMatchView&&<MatchView match={selectedMatch} squad={squad} injuries={injuries} onUpdate={updatePlayer} onInjure={p=>setInjureTarget(p)} onUpdateTeam={updateTeam} onBack={()=>setMatchId(null)}/>}
        {tab==="injuries"&&<InjuryPool squad={squad} injuries={injuries} onClear={clearInjury} onAdd={addInjury}/>}
        {tab==="stats"&&<StatsPage matches={matches} squad={squad} injuries={injuries}/>}
      </main>

      {/* ── Mobile bottom nav ── */}
      {isMobile&&(
        <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"rgba(5,5,5,0.98)",borderTop:`2px solid ${C.amber}`,display:"flex",height:70,paddingBottom:"env(safe-area-inset-bottom)"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>goTo(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:tab===t.id?C.amber:C.chalkDim,transition:"color 0.15s",padding:"8px 0"}}>
              <span style={{fontSize:20,lineHeight:1}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase"}}>{t.label}</span>
              {tab===t.id&&<div style={{width:20,height:2,background:C.amber,borderRadius:99}}/>}
            </button>
          ))}
          <button onClick={()=>signOut(auth)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:C.chalkDim,transition:"color 0.15s",padding:"8px 0"}}>
            <span style={{fontSize:20,lineHeight:1}}>🚪</span>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase"}}>Logout</span>
          </button>
        </nav>
      )}

      {/* ── Injure player modal ── */}
      <InjureModal
        player={injureTarget}
        open={!!injureTarget}
        onClose={()=>setInjureTarget(null)}
        onConfirm={(id,data)=>{addInjury(id,data);setInjureTarget(null);}}
      />
    </div>
  );


// ─── Auth Wrapper ─────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>{
      setUser(u);
      setAuthLoading(false);
    });
    return ()=>unsub();
  },[]);

  if(authLoading){
    return(
      <div style={{minHeight:"100vh",background:C.black,display:"flex",alignItems:"center",
        justifyContent:"center"}}>
        <img src={LOGO} alt="Bromley RFC" style={{width:64,height:64,objectFit:"contain",
          filter:"drop-shadow(0 0 12px #f5a80066)"}}/>
      </div>
    );
  }

  if(!user) return <AuthScreen/>;
  return <AppContent/>;
}}
