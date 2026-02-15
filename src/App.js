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
  amber: "#f5a800",
  chalk: "#f5f0e8",
  chalkDim: "#7a7060",
  green: "#4caf76",
  red: "#d94f4f",
  border: "rgba(245,168,0,0.18)",
  cardBg: "rgba(20,20,20,0.97)",
};

function App() {
  const [squad, setSquad] = useState([]);
  const [match, setMatch] = useState({ opponent: "Next Match", date: "" });
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onValue(ref(db, "/"), (snap) => {
      const data = snap.val() || {};
      setSquad(data.squad || []);
      setMatch(data.match || { opponent: "No Match Set", date: "" });
      setAvailability(data.availability || {});
      setLoading(false);
    });
  }, []);

  const addPlayer = () => {
    const name = prompt("Player Name:");
    if (!name) return;
    const newSquad = [...squad, { id: Date.now().toString(), name }];
    set(ref(db, "squad"), newSquad);
  };

  const setNextMatch = () => {
    const opponent = prompt("Opponent Name:");
    const date = prompt("Date (e.g. Sat 21st Feb):");
    if (opponent) set(ref(db, "match"), { opponent, date });
  };

  const toggleAvail = (id) => {
    const states = ["unknown", "available", "unavailable", "tentative"];
    const current = availability[id] || "unknown";
    const next = states[(states.indexOf(current) + 1) % states.length];
    set(ref(db, `availability/${id}`), next);
  };

  const getStyle = (status) => {
    if (status === "available") return { color: C.green, icon: "✅" };
    if (status === "unavailable") return { color: C.red, icon: "❌" };
    if (status === "tentative") return { color: C.amber, icon: "⏳" };
    return { color: C.chalkDim, icon: "❓" };
  };

  if (loading) return <div style={{background:C.black, color:C.chalk, height:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>Syncing Bromley RFC...</div>;

  return (
    <div style={{ background: C.black, minHeight: "100vh", color: C.chalk, padding: "20px", fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto" }}>
      
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <img src="https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png" style={{ width: 60 }} alt="Logo" />
        <h1 style={{ color: C.amber, fontSize: 24, marginTop: 10 }}>BROMLEY RFC</h1>
      </header>

      {/* Match Header Card */}
      <div style={{ background: C.cardBg, border: `1px solid ${C.amber}`, borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 14, color: C.amber, textTransform: 'uppercase' }}>Next Fixture</h2>
        <div style={{ fontSize: 28, fontWeight: 900, margin: '10px 0' }}>vs {match.opponent}</div>
        <div style={{ color: C.chalkDim }}>{match.date || "Date TBC"}</div>
        <button onClick={setNextMatch} style={{ marginTop: 15, background: 'none', border: `1px solid ${C.chalkDim}`, color: C.chalkDim, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>EDIT FIXTURE</button>
      </div>

      {/* Squad List */}
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 12, color: C.amber, textTransform: 'uppercase' }}>Squad ({squad.length})</h3>
          <button onClick={addPlayer} style={{ background: C.amber, border: 'none', padding: '5px 12px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 11 }}>+ ADD PLAYER</button>
        </div>

        {squad.map(p => {
          const status = availability[p.id] || "unknown";
          const ui = getStyle(status);
          return (
            <div key={p.id} onClick={() => toggleAvail(p.id)} style={{ padding: "15px 0", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <span style={{ color: ui.color, fontWeight: 'bold', fontSize: 13 }}>{ui.icon} {status.toUpperCase()}</span>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 10, color: '#333', marginTop: 30 }}>LIVE CLOUD SYNC ACTIVE</p>
    </div>
  );
}

export default App;