import { useState, useEffect, useRef, useCallback } from "react";
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
const db          = getDatabase(firebaseApp);

// --- App Component ---
function App() {
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const squadRef = ref(db, "squad");
    onValue(squadRef, (snap) => {
      setSquad(snap.val() || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{background:'#0a0a0a', color:'#f5f0e8', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading Bromley Squad...</div>;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img src="https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png" style={{ width: '60px' }} alt="Logo" />
        <h1 style={{ color: '#f5a800', fontSize: '24px', marginTop: '10px' }}>BROMLEY RFC TRACKER</h1>
      </div>

      <div style={{ background: 'rgba(20,20,20,0.97)', border: '1px solid rgba(245,168,0,0.18)', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid rgba(245,168,0,0.18)', paddingBottom: '10px' }}>Squad Availability</h2>
        {squad.length === 0 ? (
          <p style={{ color: '#7a7060' }}>Database connected. No players found.</p>
        ) : (
          squad.map(p => (
            <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
              <span>{p.name} ({p.pos})</span>
              <span style={{ color: '#4caf76' }}>✓ Available</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// THE CRITICAL LINE AT THE END:
export default App;