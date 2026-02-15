import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 VERIFIED FIREBASE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAFqpLxTkBAVK0L35_93RUPdQASyK8u16Q",
  authDomain: "bromleyteamtracker.firebaseapp.com",
  databaseURL: "https://bromleyteamtracker-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bromleyteamtracker",
  storageBucket: "bromleyteamtracker.firebasestorage.app",
  messagingSenderId: "53638758399",
  appId: "1:53638758399:web:1b4150b4d545278bfe31ca",
  measurementId: "G-XQ5J4JJQ3K"
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db          = getDatabase(firebaseApp);

const dbSet    = (path, val) => set(ref(db, path), val);
const dbUpdate = (path, val) => update(ref(db, path), val);

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
  cardBg:     "rgba(20,20,20,0.97)",
};

const LOGO = "https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png";

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
};

const POSITIONS = ["Loosehead Prop","Hooker","Tighthead Prop","Lock","Flanker","No. 8","Scrum-half","Fly-half","Centre","Wing","Fullback","Reserve"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);
function fmtDate(dateStr){ return new Date(dateStr+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}); }
function daysUntil(dateStr){ 
    const diff = new Date(dateStr+"T00:00:00") - new Date(today()+"T00:00:00");
    return Math.ceil(diff/(1000*60*60*24));
}

// ─── Responsive hook ─────────────────────────────────────────────────────────
function useIsMobile(){ const [m,setM]=useState(window.innerWidth<768); useEffect(()=>{ const h=()=>setM(window.innerWidth<768); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); },[]); return m; }

// ─── UI Components ──────────────────────────────────────────────────────────
const Label = ({children,color=C.amber})=>(<div style={{fontSize:10,color,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{children}</div>);
const Pill = ({color,children})=>(<span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:4,fontSize:11,fontWeight:700,background:color+"22",color,border:`1px solid ${color}44`,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>);
const Card = ({children,style={}})=>(<div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:12,...style}}>{children}</div>);
const Input = ({value,onChange,placeholder,type="text"})=>(<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"10px 13px",fontSize:14,width:"100%",outline:"none"}} />);
const Sel = ({value,onChange,options})=>(<select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.blackLight,border:`1px solid ${C.border}`,color:C.chalk,borderRadius:8,padding:"10px 13px",fontSize:14,cursor:"pointer",outline:"none",width:"100%"}}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>);

const Btn = ({onClick,children,variant="primary",small,full})=>{
  const v = { primary: {bg:C.amber, color:C.black}, ghost: {bg:"transparent", color:C.chalkDim, border:`1px solid ${C.border}`}, orange: {bg:C.orange+"22", color:C.orangeLight, border:`1px solid ${C.orange}44`} }[variant] || {bg:C.amber, color:C.black};
  return <button onClick={onClick} style={{background:v.bg, color:v.color, border:v.border||"none", borderRadius:8, padding:small?"7px 14px":"11px 20px", fontSize:small?11:13, fontWeight:800, cursor:"pointer", textTransform:"uppercase", width:full?"100%":"auto"}}>{children}</button>;
};

const Modal = ({open,onClose,title,children}) => {
  if(!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.blackMid,border:`1px solid ${C.border}`,borderRadius:12,padding:20,width:"100%",maxWidth:400}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><span style={{fontWeight:800,color:C.chalk}}>{title}</span><button onClick={onClose} style={{background:"none",border:"none",color:C.chalkDim,fontSize:20}}>✕</button></div>
        {children}
      </div>
    </div>
  );
};

// ─── Main Views ──────────────────────────────────────────────────────────────
function Dashboard({matches, squad, injuries, onGo}){
  const next = [...matches].filter(m=>m.date >= today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const s = (match) => {
    if(!match) return {available:0, total:0};
    const pl = squad.filter(p=>!injuries[p.id]).map(p=>(match.players||{})[p.id]?.availability || "unknown");
    return { available: pl.filter(v=>v==="available").length, total: squad.length };
  };
  const stats = s(next);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {next ? (
        <Card style={{padding:20, borderLeft:`4px solid ${C.amber}`, cursor:"pointer"}} onClick={()=>onGo("matches",next.id)}>
          <Label>NEXT MATCH</Label>
          <div style={{fontSize:24, fontWeight:900}}>vs {next.awayTeam}</div>
          <div style={{color:C.chalkDim, fontSize:13, marginTop:5}}>{fmtDate(next.date)} · KO {next.kickoff}</div>
          <div style={{marginTop:15, display:"flex", gap:10}}>
            <Pill color={C.green}>{stats.available} Available</Pill>
            <Pill color={C.orange}>{Object.keys(injuries).length} Injured</Pill>
          </div>
        </Card>
      ) : <Card style={{padding:40, textAlign:'center', color:C.chalkDim}}>No upcoming matches.</Card>}
      
      <Label>Season Schedule</Label>
      {matches.map(m => (
        <Card key={m.id} style={{padding:15, opacity:m.date < today() ? 0.5 : 1}} onClick={()=>onGo("matches", m.id)}>
            <div style={{fontWeight:800}}>{m.homeTeam} vs {m.awayTeam}</div>
            <div style={{fontSize:11, color:C.chalkDim}}>{fmtDate(m.date)}</div>
        </Card>
      ))}
    </div>
  );
}

function MatchView({match, squad, injuries, onUpdate, onBack}){
  const active = squad.filter(p=>!injuries[p.id]);
  const players = match.players || {};

  return (
    <div>
      <Btn variant="ghost" small onClick={onBack}>← Back</Btn>
      <h2 style={{margin:"15px 0 5px", color:C.amber}}>{match.homeTeam} vs {match.awayTeam}</h2>
      <div style={{fontSize:12, color:C.chalkDim, marginBottom:20}}>{fmtDate(match.date)}</div>

      <Card style={{padding:20}}>
        <Label>Squad Availability (Dropdowns)</Label>
        {active.map(p => {
            const md = players[p.id] || {};
            const status = md.availability || "unknown";
            const comm = md.commStatus || "not_contacted";
            const statusColor = AVAIL[status].color;

            return (
              <div key={p.id} style={{padding:"15px 0", borderBottom:`1px solid ${C.chalkFaint}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                    <div style={{fontWeight:700}}>{p.name}</div>
                    <div style={{fontSize:10, color:C.chalkDim}}>{p.pos}</div>
                </div>
                <div style={{display:"flex", gap:10}}>
                    {/* DROPDOWN 1: AVAILABILITY */}
                    <select 
                        value={status} 
                        onChange={(e)=>onUpdate(match.id, p.id, {availability: e.target.value})}
                        style={{background:'#000', color:statusColor, border:`1px solid ${statusColor}`, borderRadius:6, padding:5, fontSize:10, fontWeight:800}}
                    >
                        {Object.entries(AVAIL).map(([k,v])=><option key={k} value={k}>{v.label.toUpperCase()}</option>)}
                    </select>

                    {/* DROPDOWN 2: COMMS */}
                    <select 
                        value={comm} 
                        onChange={(e)=>onUpdate(match.id, p.id, {commStatus: e.target.value})}
                        style={{background:'#000', color:COMM[comm].color, border:`1px solid ${COMM[comm].color}`, borderRadius:6, padding:5, fontSize:10, fontWeight:800}}
                    >
                        {Object.entries(COMM).map(([k,v])=><option key={k} value={k}>{v.label.toUpperCase()}</option>)}
                    </select>
                </div>
              </div>
            );
        })}
      </Card>
    </div>
  );
}

// ─── App Engine ──────────────────────────────────────────────────────────────
export default function App(){
  const [tab, setTab] = useState("dashboard");
  const [matchId, setMatchId] = useState(null);
  const [squad, setSquad] = useState([]);
  const [matches, setMatches] = useState([]);
  const [injuries, setInjuries] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  
  // Form States
  const [newAway, setNewAway] = useState("");
  const [newDate, setNewDate] = useState(today());

  const isMobile = useIsMobile();

  useEffect(()=>{
    onValue(ref(db,"brfc/squad"), snap=>{setSquad(snap.val()||[]); setLoaded(true);});
    onValue(ref(db,"brfc/matches"), snap=>setMatches(snap.val()||[]));
    onValue(ref(db,"brfc/injuries"), snap=>setInjuries(snap.val()||{}));
  },[]);

  const addMatch = () => {
    const m = {id:uid(), homeTeam:"Bromley RFC", awayTeam:newAway, date:newDate, kickoff:"15:00", players:{}};
    const newList = [...matches, m];
    dbSet("brfc/matches", newList);
    setShowAddMatch(false);
  };

  const updatePlayer = (mId, pId, patch) => {
    const updated = matches.map(m => {
        if(m.id !== mId) return m;
        const pData = (m.players||{})[pId] || {};
        return { ...m, players: { ...(m.players||{}), [pId]: { ...pData, ...patch } } };
    });
    dbSet("brfc/matches", updated);
  };

  if(!loaded) return <div style={{height:"100vh", background:C.black, color:C.amber, display:"flex", alignItems:"center", justifyContent:"center"}}>LOADING BROMLEY RFC...</div>;

  const currentMatch = matches.find(m => m.id === matchId);

  return (
    <div style={{minHeight:"100vh", background:C.black, color:C.chalk, paddingBottom:80}}>
      <header style={{background:C.blackMid, padding:20, borderBottom:`3px solid ${C.amber}`, textAlign:"center", position:"sticky", top:0, zIndex:10}}>
        <img src={LOGO} style={{width:40}} alt="logo"/>
        <div style={{fontSize:12, fontWeight:900, color:C.amber, letterSpacing:2}}>BROMLEY RFC TRACKER</div>
      </header>

      <main style={{padding:20, maxWidth:600, margin:"0 auto"}}>
        {tab === "dashboard" && <Dashboard matches={matches} squad={squad} injuries={injuries} onGo={(t,id)=>{setTab(t); setMatchId(id);}} />}
        
        {tab === "matches" && !matchId && (
            <div>
                <Btn onClick={()=>setShowAddMatch(true)} full>+ Create New Match</Btn>
                <div style={{marginTop:20}}><Dashboard matches={matches} squad={squad} injuries={injuries} onGo={(t,id)=>{setTab(t); setMatchId(id);}} /></div>
            </div>
        )}

        {tab === "matches" && matchId && currentMatch && (
            <MatchView match={currentMatch} squad={squad} injuries={injuries} onBack={()=>setMatchId(null)} onUpdate={updatePlayer} />
        )}

        {tab === "squad" && (
            <Card style={{padding:20}}>
                <Label>Full Squad Management</Label>
                {squad.map(p => (
                    <div key={p.id} style={{padding:"10px 0", borderBottom:`1px solid ${C.chalkFaint}`, display:"flex", justifyContent:"space-between"}}>
                        <span>{p.name}</span>
                        <span style={{fontSize:10, color:C.chalkDim}}>{p.pos}</span>
                    </div>
                ))}
                <Btn variant="ghost" small onClick={()=>{
                    const n = prompt("Player Name:");
                    if(n) dbSet("brfc/squad", [...squad, {id:uid(), name:n, pos:"Reserve"}]);
                }} style={{marginTop:15}}>+ Add Player</Btn>
            </Card>
        )}
      </main>

      {/* MOBILE NAV */}
      <nav style={{position:"fixed", bottom:0, width:"100%", background:C.blackMid, borderTop:`1px solid ${C.border}`, display:"flex", padding:10, justifyContent:"space-around"}}>
        <button onClick={()=>{setTab("dashboard"); setMatchId(null);}} style={{background:"none", border:"none", color:tab==="dashboard"?C.amber:C.chalkDim, fontSize:10, fontWeight:800}}>HOME</button>
        <button onClick={()=>{setTab("matches"); setMatchId(null);}} style={{background:"none", border:"none", color:tab==="matches"?C.amber:C.chalkDim, fontSize:10, fontWeight:800}}>MATCHES</button>
        <button onClick={()=>{setTab("squad"); setMatchId(null);}} style={{background:"none", border:"none", color:tab==="squad"?C.amber:C.chalkDim, fontSize:10, fontWeight:800}}>SQUAD</button>
      </nav>

      <Modal open={showAddMatch} onClose={()=>setShowAddMatch(false)} title="New Match">
         <Label>Opponent</Label><Input value={newAway} onChange={setNewAway} placeholder="e.g. Sidcup" />
         <div style={{marginTop:15}}><Label>Date</Label><Input type="date" value={newDate} onChange={setNewDate} /></div>
         <div style={{marginTop:20}}><Btn onClick={addMatch} full>Create Match</Btn></div>
      </Modal>
    </div>
  );
}