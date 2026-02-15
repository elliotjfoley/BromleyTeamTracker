import React from "react";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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

function App() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <img src="https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png" style={{ width: '80px' }} alt="Logo" />
      <h1>BROMLEY RFC</h1>
      <p>System Online. Waiting for Squad Data.</p>
    </div>
  );
}

export default App;