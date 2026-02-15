import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAFqpLxTkBAVK0L35_93RUPdQASyK8u16Q",
  authDomain: "bromleyteamtracker.firebaseapp.com",
  databaseURL: "https://bromleyteamtracker-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bromleyteamtracker",
  storageBucket: "bromleyteamtracker.firebasestorage.app",
  messagingSenderId: "53638758399",
  appId: "1:53638758399:web:1b4150b4d545278bfe31ca",
  measurementId: "G-XQ5J4JJQ3K"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const C = {
  black: "#0a0a0a",
  card: "#141414",
  amber: "#f5a800",
  chalk: "#f5f0e8",
  chalkDim: "#7a7060",
  green: "#4caf76",
  red: "#d94f4f",
  border: "rgba(245,168,0,0.15)"
};

function App() {
  const [view, setView] = useState("match"); 
  const [squad, setSquad] = useState([]);
  const [match, setMatch] = useState({ opponent: "TBC", date: "" });
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onValue(ref(db, "/"), (snap) => {
      const data = snap.val() || {};
      setSquad(data.squad || []);
      setMatch(data.match || { opponent: "TBC", date: "" });
      setAvailability(data.availability || {});
      setLoading(false);
    });
  }, []);

  const updateAvail = (id, value) => {
    set(ref(db, `availability/${id}`), value);
  };

  const toggleInjury = (id) => {
    const newSquad = squad.map(p => p.id === id ? { ...p, injured: !p.injured } : p);
    set(ref(db, "squad"), newSquad);
  };

  const availCount = Object.values(availability).filter(v => v === "available").length;

  if (loading) return <div style={{background:C.black, color:C.chalk, height:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>Syncing Bromley RFC...</div>;

  return (
    <div style={{ background: C.black, minHeight: "100vh", width: "100%", color: C.chalk, fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
      
      <header style={{ padding: '30px 20px', textAlign: 'center' }}>
        <img src="https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png" style={{ width: 45 }} alt="Logo" />
        <h1 style={{ color: C.amber, fontSize: 16, letterSpacing: 4, marginTop: 10 }}>BROMLEY RFC</h1>
      </header>

      <nav style={{ display: 'flex', background: '#111', padding: '5px', borderRadius: 12, margin: '0 20px 20px', border: `1px solid ${C.border}` }}>
        {["dashboard", "match", "selection"].map(t => (
          <button key={t} onClick={() => setView(t)} style={{ 
            flex: 1, padding: '10px', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 800,
            background: view === t ? C.amber : 'transparent',
            color: view === t ? C.black : C.chalkDim,
            textTransform: 'uppercase'
          }}>{t}</button>
        ))}
      </nav>

      <main style={{ padding: '0 20px 100px', maxWidth: 500, margin: '0 auto' }}>

        {view === "match" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: `linear-gradient(135deg, ${C.card} 0%, #1a1a1a 100%)`, borderRadius: 16, padding: 25, border: `1px solid ${C.amber}`, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: C.amber, fontWeight: 800 }}>UPCOMING FIXTURE</div>
              <div style={{ fontSize: 24, fontWeight: 900, margin: '10px 0' }}>vs {match.opponent}</div>
              <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>{availCount} PLAYERS AVAILABLE</div>
            </div>

            <div style={{ background: C.card, borderRadius: 16, padding: "10px 20px", border: `1px solid ${C.border}` }}>
              {squad.filter(p => !p.injured).map(p => {
                const status = availability[p.id] || "unknown";
                const getStatusColor = () => {
                  if (status === "available") return C.green;
                  if (status === "unavailable") return C.red;
                  if (status === "tentative") return C.amber;
                  return C.chalkDim;
                };

                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "15px 0", borderBottom: '1px solid #222' }}>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    
                    <select 
                      value={status} 
                      onChange={(e) => updateAvail(p.id, e.target.value)}
                      style={{
                        background: '#1a1a1a',
                        color: getStatusColor(),
                        border: `1px solid ${getStatusColor()}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 800,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="unknown">UNKNOWN</option>
                      <option value="available">AVAILABLE</option>
                      <option value="unavailable">UNAVAILABLE</option>
                      <option value="tentative">TENTATIVE</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Keeping Dashboard & Selection Logic from previous version */}
        {view === "dashboard" && (
           <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
             <h3 style={{ fontSize: 12, color: C.amber, fontWeight: 800, marginBottom: 15 }}>FULL SQUAD</h3>
             {squad.map(p => (
               <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #222' }}>
                 <span style={{ color: p.injured ? C.red : C.chalk }}>{p.name} {p.injured ? "(Injured)" : ""}</span>
                 <button onClick={() => toggleInjury(p.id)} style={{ background: 'none', border: 'none', color: C.chalkDim, fontSize: 10 }}>TOGGLE INJURY</button>
               </div>
             ))}
           </div>
        )}
      </main>
    </div>
  );
}

export default App;