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

function App() {
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const squadRef = ref(db, "squad");
    return onValue(squadRef, (snap) => {
      setSquad(snap.val() || []);
      setLoading(false);
    });
  }, []);

  const addPlayer = () => {
    const name = prompt("Enter Player Name:");
    if (!name) return;
    const newPlayer = { id: Date.now().toString(), name, pos: "Reserve" };
    const newSquad = [...squad, newPlayer];
    set(ref(db, "squad"), newSquad);
  };

  if (loading) return <div style={{background:'#0a0a0a', color:'#f5f0e8', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Connecting to Bromley RFC Database...</div>;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <img src="https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png" style={{ width: 80, marginBottom: 20 }} alt="Logo" />
      <h1 style={{ color: '#f5a800', letterSpacing: '2px' }}>BROMLEY RFC TRACKER</h1>
      
      <div style={{ maxWidth: 500, margin: '0 auto', background: '#161616', padding: 25, borderRadius: 16, border: '1px solid rgba(245,168,0,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <button onClick={addPlayer} style={{ background: '#f5a800', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: '900', cursor: 'pointer', marginBottom: 25, width: '100%', textTransform: 'uppercase' }}>
          + Add New Player
        </button>
        
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ color: '#7a7060', fontSize: 12, textTransform: 'uppercase', marginBottom: 15 }}>Current Squad ({squad.length})</h3>
          {squad.length === 0 ? (
            <p style={{ color: '#444', fontStyle: 'italic' }}>No players added yet.</p>
          ) : (
            squad.map(p => (
              <div key={p.id} style={{ padding: '15px 0', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                <span style={{ fontSize: 12, color: '#f5a800', background: 'rgba(245,168,0,0.1)', padding: '4px 8px', borderRadius: 4 }}>{p.pos}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;