import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

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
  const [view, setView] = useState("dashboard"); // dashboard, match, injuries
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

  const toggleAvail = (id) => {
    const states = ["unknown", "available", "unavailable", "tentative"];
    const current = availability[id] || "unknown";
    const next = states[(states.indexOf(current) + 1) % states.length];
    set(ref(db, `availability/${id}`), next);
  };

  const addPlayer = () => {
    const name = prompt("Player Name:");
    if (!name) return;
    const newSquad = [...squad, { id: Date.now().toString(), name, pos: "Reserve" }];
    set(ref(db, "squad"), newSquad);
  };

  if (loading) return <div style={{background:C.black, color:C.chalk, height:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>Syncing Bromley RFC...</div>;

  return (
    <div style={{ 
      background: C.black, 
      minHeight: "100vh", 
      width: "100%",
      color: C.chalk, 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* HEADER */}
      <header style={{ padding: '40px 20px 20px', textAlign: 'center' }}>
        <img src="https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png" style={{ width: 50 }} alt="Logo" />
        <h1 style={{ color: C.amber, fontSize: 18, letterSpacing: 3, marginTop: 15, fontWeight: 900 }}>BROMLEY RFC</h1>
      </header>

      <main style={{ padding: '0 20px 100px', maxWidth: 500, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* NAV TABS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 25 }}>
          <button onClick={()=>setView("dashboard")} style={{ flex: 1, padding: 12, borderRadius: 8, background: view === "dashboard" ? C.amber : C.card, color: view === "dashboard" ? C.black : C.chalk, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>SQUAD</button>
          <button onClick={()=>setView("match")} style={{ flex: 1, padding: 12, borderRadius: 8, background: view === "match" ? C.amber : C.card, color: view === "match" ? C.black : C.chalk, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>MATCH</button>
        </div>

        {view === "dashboard" && (
          <div>
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: C.amber, fontWeight: 800 }}>SQUAD LIST</span>
                <button onClick={addPlayer} style={{ background: 'none', border: `1px solid ${C.amber}`, color: C.amber, padding: '4px 10px', borderRadius: 6, fontSize: 11 }}>+ ADD</button>
              </div>
              {squad.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #222' }}>
                  <span>{p.name}</span>
                  <span style={{ color: C.chalkDim, fontSize: 12 }}>{p.pos}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "match" && (
          <div>
             <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.amber}`, padding: 25, textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.amber, fontWeight: 800 }}>NEXT FIXTURE</div>
                <div style={{ fontSize: 24, fontWeight: 900, margin: '10px 0' }}>vs {match.opponent}</div>
                <div style={{ color: C.chalkDim }}>{match.date || "DATE TBC"}</div>
             </div>

             <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
                <div style={{ fontSize: 11, color: C.amber, fontWeight: 800, marginBottom: 15 }}>AVAILABILITY CHECK</div>
                {squad.map(p => {
                  const status = availability[p.id] || "unknown";
                  const icons = { available: "✅", unavailable: "❌", tentative: "⏳", unknown: "❓" };
                  const colors = { available: C.green, unavailable: C.red, tentative: C.amber, unknown: C.chalkDim };
                  return (
                    <div key={p.id} onClick={() => toggleAvail(p.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                      <span>{p.name}</span>
                      <span style={{ color: colors[status], fontWeight: 'bold' }}>{icons[status]} {status.toUpperCase()}</span>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </main>

      <footer style={{ padding: 20, textAlign: 'center', color: '#333', fontSize: 10 }}>
        BROMLEY RFC CLOUD SYNC v2.0
      </footer>
    </div>
  );
}

export default App;