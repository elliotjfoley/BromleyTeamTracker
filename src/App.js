import { useState, useEffect, useRef } from "react";

// ─── Bromley RFC Colour Tokens ────────────────────────────────────────────────
const C = {
  black:       "#0a0a0a",
  blackMid:    "#111111",
  blackLight:  "#1c1c1c",
  blackCard:   "#161616",
  amber:       "#f5a800",
  amberLight:  "#ffc340",
  amberDark:   "#c98900",
  amberGlow:   "#f5a80033",
  chalk:       "#f5f0e8",
  chalkDim:    "#8a8070",
  chalkFaint:  "#2a2520",
  red:         "#d94f4f",
  redLight:    "#f07070",
  blue:        "#4a9eda",
  blueLight:   "#7ebff0",
  green:       "#4caf76",
  greenLight:  "#6fcf97",
  border:      "rgba(245,168,0,0.15)",
  borderHover: "rgba(245,168,0,0.4)",
  cardBg:      "rgba(22,22,22,0.95)",
};

const LOGO_URL = "https://bromleyrfc.org/wp-content/uploads/2021/10/cropped-siteicon.png";

// ─── Static Data ─────────────────────────────────────────────────────────────
const POSITIONS = [
  "Loosehead Prop","Hooker","Tighthead Prop",
  "Lock","Lock","Blindside Flanker","Openside Flanker","Number Eight",
  "Scrum-half","Fly-half","Left Wing","Inside Centre","Outside Centre",
  "Right Wing","Fullback",
  "Utility Forward","Utility Back","Reserve",
];

const AVAILABILITY = {
  unknown:    { label: "Unknown",     color: C.chalkDim, icon: "?" },
  available:  { label: "Available",   color: C.green,    icon: "✓" },
  unavailable:{ label: "Unavailable", color: C.red,      icon: "✗" },
  tentative:  { label: "Tentative",   color: C.amber,    icon: "~" },
};

const COMM_STATUS = {
  not_contacted: { label: "Not Contacted", color: C.chalkDim, icon: "○" },
  contacted:     { label: "Contacted",     color: C.blue,     icon: "◎" },
  responded:     { label: "Responded",     color: C.green,    icon: "●" },
  no_reply:      { label: "No Reply",      color: C.amber,    icon: "◌" },
};

const DEMO_SQUAD = [
  { name: "James O'Brien",   position: "Loosehead Prop",    number: 1 },
  { name: "Cian Murphy",     position: "Hooker",            number: 2 },
  { name: "Rory Walsh",      position: "Tighthead Prop",    number: 3 },
  { name: "Finn McCarthy",   position: "Lock",              number: 4 },
  { name: "David Brennan",   position: "Lock",              number: 5 },
  { name: "Shane Kelly",     position: "Blindside Flanker", number: 6 },
  { name: "Tom Byrne",       position: "Openside Flanker",  number: 7 },
  { name: "Liam Connolly",   position: "Number Eight",      number: 8 },
  { name: "Declan Foley",    position: "Scrum-half",        number: 9 },
  { name: "Patrick Ryan",    position: "Fly-half",          number: 10 },
  { name: "Aaron Gallagher", position: "Left Wing",         number: 11 },
  { name: "Niall Doyle",     position: "Inside Centre",     number: 12 },
  { name: "Kevin Quinn",     position: "Outside Centre",    number: 13 },
  { name: "Barry Dempsey",   position: "Right Wing",        number: 14 },
  { name: "Mark Sheridan",   position: "Fullback",          number: 15 },
  { name: "Eoin Moran",      position: "Utility Forward",   number: 16 },
  { name: "Ross Higgins",    position: "Utility Back",      number: 17 },
  { name: "Cormac Lynch",    position: "Reserve",           number: 18 },
];

// ─── Storage Helpers ──────────────────────────────────────────────────────────
async function storageGet(key) {
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(",").map(s => s.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(s => s.trim());
    const row = {};
    header.forEach((h, i) => row[h] = cols[i] || "");
    return {
      id: uid(),
      name: row.name || row["player name"] || row["full name"] || "",
      position: row.position || row.pos || "",
      number: parseInt(row.number || row["jersey"] || row["#"] || "0") || 0,
    };
  }).filter(p => p.name);
}

// ─── Reusable UI ─────────────────────────────────────────────────────────────
function Badge({ color, children, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 8px" : "3px 10px",
      borderRadius: 4, fontSize: small ? 11 : 12, fontWeight: 700,
      background: color + "22", color,
      border: `1px solid ${color}44`,
      letterSpacing: "0.04em", whiteSpace: "nowrap", textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.blackMid, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.amber}`, borderRadius: 12, padding: 28,
        width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto",
        boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 40px ${C.amberGlow}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: C.chalk, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.chalkDim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: C.blackLight, border: `1px solid ${C.border}`,
      color: C.chalk, borderRadius: 6, padding: "7px 12px",
      fontSize: 13, cursor: "pointer", outline: "none", ...style,
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Input({ value, onChange, placeholder, style, type = "text" }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.blackLight, border: `1px solid ${C.border}`,
        color: C.chalk, borderRadius: 6, padding: "8px 12px",
        fontSize: 13, outline: "none", width: "100%", ...style,
      }}
    />
  );
}

function Btn({ onClick, children, variant = "primary", small, disabled, style }) {
  const variants = {
    primary:   { background: C.amber,      color: C.black,    border: "none" },
    secondary: { background: C.blackLight, color: C.chalk,    border: `1px solid ${C.border}` },
    danger:    { background: C.red+"22",   color: C.redLight, border: `1px solid ${C.red}44` },
    ghost:     { background: "transparent",color: C.chalkDim, border: `1px solid ${C.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant], borderRadius: 6,
      padding: small ? "5px 12px" : "9px 18px",
      fontSize: small ? 12 : 13, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, transition: "all 0.15s",
      letterSpacing: "0.04em", whiteSpace: "nowrap", textTransform: "uppercase", ...style,
    }}>
      {children}
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ matches, squad, onSelectMatch }) {
  const upcoming = matches.filter(m => m.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];

  const stats = (match) => {
    if (!match) return {};
    const players = squad.map(p => {
      const ma = (match.players || {})[p.id] || {};
      return { avail: ma.availability || "unknown", comm: ma.commStatus || "not_contacted" };
    });
    const total        = players.length;
    const available    = players.filter(p => p.avail === "available").length;
    const unavailable  = players.filter(p => p.avail === "unavailable").length;
    const tentative    = players.filter(p => p.avail === "tentative").length;
    const contacted    = players.filter(p => p.comm !== "not_contacted").length;
    const responded    = players.filter(p => p.comm === "responded").length;
    const notContacted = players.filter(p => p.comm === "not_contacted").length;
    return { total, available, unavailable, tentative, contacted, responded, notContacted };
  };

  const s = stats(next);

  const StatCard = ({ label, value, color }) => (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.border}`,
      borderBottom: `3px solid ${color}`, borderRadius: 8, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 36, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.chalkDim, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {next ? (
        <div style={{
          background: C.blackCard, border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${C.amber}`, borderRadius: 10, padding: "24px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16, boxShadow: `0 0 30px ${C.amberGlow}`,
        }}>
          <div>
            <div style={{ fontSize: 11, color: C.amber, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>Next Match</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 30, fontWeight: 900, color: C.chalk }}>
              {next.homeTeam} <span style={{ color: C.amber }}>vs</span> {next.awayTeam}
            </div>
            <div style={{ color: C.chalkDim, fontSize: 13, marginTop: 4 }}>
              {new Date(next.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {next.venue && <> &nbsp;·&nbsp; {next.venue}</>}
              {next.kickoff && <> &nbsp;·&nbsp; KO {next.kickoff}</>}
            </div>
          </div>
          <Btn onClick={() => onSelectMatch(next.id)}>Manage Squad →</Btn>
        </div>
      ) : (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 28px", color: C.chalkDim, textAlign: "center" }}>
          No upcoming matches scheduled. Create one to get started.
        </div>
      )}

      {next && (
        <>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: C.amber, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
            Availability — {next.homeTeam} vs {next.awayTeam}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
            <StatCard label="Squad Size"    value={s.total}        color={C.chalk} />
            <StatCard label="Available"     value={s.available}    color={C.green} />
            <StatCard label="Unavailable"   value={s.unavailable}  color={C.red} />
            <StatCard label="Tentative"     value={s.tentative}    color={C.amber} />
            <StatCard label="Not Contacted" value={s.notContacted} color={C.chalkDim} />
            <StatCard label="Responded"     value={s.responded}    color={C.blue} />
          </div>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: C.chalkDim, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              Communication Progress — {s.contacted}/{s.total} contacted
            </div>
            <div style={{ background: C.blackLight, borderRadius: 99, height: 10, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                width: `${s.total ? (s.responded / s.total) * 100 : 0}%`,
                background: `linear-gradient(90deg, ${C.amberDark}, ${C.amberLight})`,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ fontSize: 11, color: C.chalkDim, marginTop: 8 }}>
              {s.responded} responded · {s.contacted - s.responded} awaiting reply · {s.notContacted} not yet contacted
            </div>
          </div>
        </>
      )}

      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: C.amber, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
        All Matches ({matches.length})
      </div>
      {matches.length === 0 && <div style={{ color: C.chalkDim, fontSize: 13 }}>No matches yet.</div>}
      {matches.sort((a, b) => a.date.localeCompare(b.date)).map(m => {
        const ms = stats(m);
        const isPast = m.date < today();
        return (
          <div key={m.id} onClick={() => onSelectMatch(m.id)} style={{
            background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 20px",
            cursor: "pointer", display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 12,
            opacity: isPast ? 0.55 : 1, transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.boxShadow = `0 0 20px ${C.amberGlow}`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.chalk }}>
                {m.homeTeam} <span style={{ color: C.amber }}>vs</span> {m.awayTeam}
                {isPast && <span style={{ color: C.chalkDim, fontSize: 12, marginLeft: 8, fontWeight: 400 }}>[Past]</span>}
              </div>
              <div style={{ fontSize: 12, color: C.chalkDim, marginTop: 2 }}>
                {new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {m.kickoff && ` · KO ${m.kickoff}`}
                {m.venue && ` · ${m.venue}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={C.green}    small>{ms.available} avail</Badge>
              <Badge color={C.red}      small>{ms.unavailable} unavail</Badge>
              <Badge color={C.chalkDim} small>{ms.notContacted} to contact</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Player Row ───────────────────────────────────────────────────────────────
function PlayerRow({ player, matchData, onUpdate }) {
  const md       = matchData || {};
  const avail    = md.availability || "unknown";
  const comm     = md.commStatus   || "not_contacted";
  const assignee = md.assignedTo   || "";
  const notes    = md.notes        || "";
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteVal, setNoteVal]           = useState(notes);
  const saveNote = () => { onUpdate({ notes: noteVal }); setEditingNotes(false); };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "36px 180px 1fr 1fr 1fr 140px 36px",
      gap: 8, alignItems: "center", padding: "10px 16px",
      borderBottom: `1px solid ${C.chalkFaint}`, transition: "background 0.1s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = C.blackLight}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, color: C.amber, textAlign: "center" }}>
        {player.number || "-"}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.chalk }}>{player.name}</div>
        <div style={{ fontSize: 11, color: C.chalkDim, marginTop: 1 }}>{player.position}</div>
      </div>
      <select value={avail} onChange={e => onUpdate({ availability: e.target.value })} style={{
        background: AVAILABILITY[avail].color + "18", color: AVAILABILITY[avail].color,
        border: `1px solid ${AVAILABILITY[avail].color}44`,
        borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700,
        cursor: "pointer", outline: "none", textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        {Object.entries(AVAILABILITY).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
      </select>
      <select value={comm} onChange={e => onUpdate({ commStatus: e.target.value })} style={{
        background: COMM_STATUS[comm].color + "18", color: COMM_STATUS[comm].color,
        border: `1px solid ${COMM_STATUS[comm].color}44`,
        borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700,
        cursor: "pointer", outline: "none", textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        {Object.entries(COMM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
      </select>
      <div>
        {editingNotes ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input value={noteVal} onChange={e => setNoteVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveNote()} autoFocus placeholder="Add note…"
              style={{ background: C.blackLight, border: `1px solid ${C.border}`, color: C.chalk, borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none", flex: 1, minWidth: 0 }}
            />
            <button onClick={saveNote} style={{ background: C.amber, border: "none", color: C.black, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
          </div>
        ) : (
          <div onClick={() => { setNoteVal(notes); setEditingNotes(true); }} style={{ fontSize: 11, color: notes ? C.chalk : C.chalkDim, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {notes || "Add note…"}
          </div>
        )}
      </div>
      <input value={assignee} onChange={e => onUpdate({ assignedTo: e.target.value })}
        placeholder="Who's calling?"
        style={{
          background: assignee ? C.blue + "18" : "transparent",
          border: `1px solid ${assignee ? C.blue + "55" : C.border}`,
          color: assignee ? C.blueLight : C.chalkDim,
          borderRadius: 6, padding: "5px 8px", fontSize: 11, outline: "none", width: "100%",
        }}
      />
      <button title="Reset player" onClick={() => onUpdate({ availability: "unknown", commStatus: "not_contacted", notes: "", assignedTo: "" })}
        style={{ background: "none", border: "none", color: C.chalkDim, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>↺</button>
    </div>
  );
}

// ─── Match View ───────────────────────────────────────────────────────────────
function MatchView({ match, squad, onUpdate, onBack }) {
  const [filterAvail, setFilterAvail] = useState("all");
  const [filterComm,  setFilterComm]  = useState("all");
  const [filterPos,   setFilterPos]   = useState("all");
  const [search,      setSearch]      = useState("");
  const players = match.players || {};
  const updatePlayer = (playerId, patch) => onUpdate(match.id, playerId, patch);
  const filtered = squad.filter(p => {
    const md = players[p.id] || {};
    if (filterAvail !== "all" && (md.availability || "unknown") !== filterAvail) return false;
    if (filterComm  !== "all" && (md.commStatus  || "not_contacted") !== filterComm) return false;
    if (filterPos   !== "all" && p.position !== filterPos) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const positions    = [...new Set(squad.map(p => p.position))];
  const available    = squad.filter(p => (players[p.id]?.availability || "unknown") === "available").length;
  const notContacted = squad.filter(p => (players[p.id]?.commStatus  || "not_contacted") === "not_contacted").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{
          background: C.blackLight, border: `1px solid ${C.border}`, color: C.chalkDim,
          borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>← Back</button>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 900, color: C.chalk }}>
            {match.homeTeam} <span style={{ color: C.amber }}>vs</span> {match.awayTeam}
          </div>
          <div style={{ fontSize: 12, color: C.chalkDim }}>
            {new Date(match.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {match.venue && ` · ${match.venue}`}
            {match.kickoff && ` · KO ${match.kickoff}`}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Badge color={C.green}    small>{available} available</Badge>
          <Badge color={C.chalkDim} small>{notContacted} to contact</Badge>
        </div>
      </div>

      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player…"
          style={{ background: C.blackLight, border: `1px solid ${C.border}`, color: C.chalk, borderRadius: 6, padding: "6px 12px", fontSize: 13, outline: "none" }}
        />
        <Select value={filterAvail} onChange={setFilterAvail} options={[{ value: "all", label: "All Availability" }, ...Object.entries(AVAILABILITY).map(([k, v]) => ({ value: k, label: v.label }))]} />
        <Select value={filterComm}  onChange={setFilterComm}  options={[{ value: "all", label: "All Comm Status"  }, ...Object.entries(COMM_STATUS ).map(([k, v]) => ({ value: k, label: v.label }))]} />
        <Select value={filterPos}   onChange={setFilterPos}   options={[{ value: "all", label: "All Positions"    }, ...positions.map(p => ({ value: p, label: p }))]} />
        <span style={{ fontSize: 11, color: C.chalkDim, marginLeft: "auto" }}>{filtered.length} of {squad.length} players</span>
      </div>

      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "36px 180px 1fr 1fr 1fr 140px 36px", gap: 8, padding: "8px 16px", background: C.blackLight, borderBottom: `1px solid ${C.border}` }}>
          {["#", "Player", "Availability", "Comm Status", "Notes", "Assigned To", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: C.amber, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 && <div style={{ padding: "24px 16px", textAlign: "center", color: C.chalkDim, fontSize: 13 }}>No players match filters.</div>}
        {filtered.map(p => (
          <PlayerRow key={p.id} player={p} matchData={players[p.id]} onUpdate={patch => updatePlayer(p.id, patch)} />
        ))}
      </div>
    </div>
  );
}

// ─── Squad Page ───────────────────────────────────────────────────────────────
function SquadPage({ squad, onSetSquad }) {
  const [showUpload, setShowUpload] = useState(false);
  const [csvText,    setCsvText]    = useState("");
  const [addName,    setAddName]    = useState("");
  const [addPos,     setAddPos]     = useState(POSITIONS[0]);
  const [addNum,     setAddNum]     = useState("");
  const [csvError,   setCsvError]   = useState("");
  const fileRef = useRef();

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target.result);
    reader.readAsText(file);
  };
  const importCSV = () => {
    const parsed = parseCSV(csvText);
    if (!parsed.length) { setCsvError("Could not parse CSV. Make sure it has a 'name' column."); return; }
    onSetSquad(parsed); setCsvText(""); setCsvError(""); setShowUpload(false);
  };
  const addPlayer = () => {
    if (!addName.trim()) return;
    onSetSquad([...squad, { id: uid(), name: addName.trim(), position: addPos, number: parseInt(addNum) || 0 }]);
    setAddName(""); setAddNum("");
  };
  const removePlayer = id => onSetSquad(squad.filter(p => p.id !== id));
  const loadDemo = () => onSetSquad(DEMO_SQUAD.map(p => ({ ...p, id: uid() })));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn onClick={() => setShowUpload(true)}>↑ Import CSV</Btn>
        <Btn variant="ghost" onClick={loadDemo}>Load Demo Squad</Btn>
        <span style={{ marginLeft: "auto", color: C.chalkDim, fontSize: 13, alignSelf: "center" }}>{squad.length} players in squad</span>
      </div>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: C.amber, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Player Name</div>
          <Input value={addName} onChange={setAddName} placeholder="Full name" />
        </div>
        <div style={{ flex: 2, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: C.amber, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Position</div>
          <Select value={addPos} onChange={setAddPos} options={POSITIONS.map(p => ({ value: p, label: p }))} style={{ width: "100%" }} />
        </div>
        <div style={{ flex: 1, minWidth: 80 }}>
          <div style={{ fontSize: 10, color: C.amber, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Jersey #</div>
          <Input value={addNum} onChange={setAddNum} placeholder="#" type="number" />
        </div>
        <Btn onClick={addPlayer}>+ Add Player</Btn>
      </div>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {squad.length === 0 && <div style={{ padding: 28, textAlign: "center", color: C.chalkDim }}>No players yet. Import a CSV or add players above.</div>}
        {squad.sort((a, b) => (a.number || 99) - (b.number || 99)).map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", borderBottom: i < squad.length - 1 ? `1px solid ${C.chalkFaint}` : "none", transition: "background 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.blackLight}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: C.amber, width: 30, textAlign: "center" }}>{p.number || "-"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.chalk }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.chalkDim }}>{p.position}</div>
            </div>
            <button onClick={() => removePlayer(p.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16, lineHeight: 1, opacity: 0.5 }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
            >✕</button>
          </div>
        ))}
      </div>
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Import CSV Roster">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, color: C.chalkDim, lineHeight: 1.7 }}>
            Upload a CSV with columns: <strong style={{ color: C.chalk }}>name</strong>, <strong style={{ color: C.chalk }}>position</strong>, <strong style={{ color: C.chalk }}>number</strong>.<br />
            First row should be the header: <code style={{ color: C.amber, background: C.blackLight, padding: "1px 5px", borderRadius: 3 }}>name,position,number</code>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ color: C.chalk, fontSize: 13 }} />
          {csvText && <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8} style={{ background: C.blackLight, border: `1px solid ${C.border}`, color: C.chalk, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", resize: "vertical", outline: "none" }} />}
          {csvError && <div style={{ color: C.redLight, fontSize: 12 }}>{csvError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={importCSV} disabled={!csvText}>Import Squad</Btn>
            <Btn variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Matches Page ─────────────────────────────────────────────────────────────
function MatchesPage({ matches, onAdd, onDelete, onSelect }) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [homeTeam, setHomeTeam] = useState("Bromley RFC");
  const [awayTeam, setAwayTeam] = useState("");
  const [date,     setDate]     = useState(today());
  const [venue,    setVenue]    = useState("");
  const [kickoff,  setKickoff]  = useState("15:00");

  const createMatch = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    onAdd({ id: uid(), homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), date, venue, kickoff, players: {} });
    setShowAdd(false); setAwayTeam(""); setVenue("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Btn onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start" }}>+ New Match</Btn>
      {matches.length === 0 && <div style={{ color: C.chalkDim, fontSize: 13, padding: "16px 0" }}>No matches yet. Create one above.</div>}
      {matches.sort((a, b) => a.date.localeCompare(b.date)).map(m => (
        <div key={m.id} style={{
          background: C.cardBg, border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${m.date >= today() ? C.amber : C.chalkFaint}`,
          borderRadius: 10, padding: "16px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
          opacity: m.date < today() ? 0.6 : 1,
        }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, color: C.chalk }}>
              {m.homeTeam} <span style={{ color: C.amber }}>vs</span> {m.awayTeam}
            </div>
            <div style={{ fontSize: 12, color: C.chalkDim, marginTop: 3 }}>
              {new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
              {m.kickoff && ` · KO ${m.kickoff}`}
              {m.venue && ` · ${m.venue}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => onSelect(m.id)}>Manage</Btn>
            <Btn small variant="danger" onClick={() => { if (confirm("Delete this match?")) onDelete(m.id); }}>Delete</Btn>
          </div>
        </div>
      ))}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Match">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Your Team *",  val: homeTeam, set: setHomeTeam, placeholder: "e.g. Bromley RFC" },
            { label: "Opponent *",   val: awayTeam, set: setAwayTeam, placeholder: "e.g. Beckenham RFC" },
            { label: "Venue",        val: venue,    set: setVenue,    placeholder: "e.g. Norman Park" },
            { label: "Kickoff Time", val: kickoff,  set: setKickoff,  placeholder: "15:00", type: "time" },
          ].map(({ label, val, set, placeholder, type }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: C.amber, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</div>
              <Input value={val} onChange={set} placeholder={placeholder} type={type} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, color: C.amber, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Date *</div>
            <Input value={date} onChange={setDate} type="date" />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn onClick={createMatch} disabled={!homeTeam.trim() || !awayTeam.trim()}>Create Match</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,             setTab]             = useState("dashboard");
  const [squad,           setSquad]           = useState([]);
  const [matches,         setMatches]         = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loaded,          setLoaded]          = useState(false);
  const [lastSync,        setLastSync]        = useState(null);
  const [syncing,         setSyncing]         = useState(false);
  const syncRef = useRef(null);

  const loadData = async () => {
    const s = await storageGet("brfc:squad");
    const m = await storageGet("brfc:matches");
    if (s) setSquad(s);
    if (m) setMatches(m);
    setLastSync(new Date());
    setLoaded(true);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    syncRef.current = setInterval(() => { setSyncing(true); loadData().then(() => setSyncing(false)); }, 15000);
    return () => clearInterval(syncRef.current);
  }, []);

  const saveSquad   = async s => { setSquad(s);   await storageSet("brfc:squad",   s); setLastSync(new Date()); };
  const saveMatches = async m => { setMatches(m); await storageSet("brfc:matches", m); setLastSync(new Date()); };
  const addMatch    = m  => saveMatches([...matches, m]);
  const deleteMatch = id => saveMatches(matches.filter(m => m.id !== id));

  const updatePlayerInMatch = async (matchId, playerId, patch) => {
    const updated = matches.map(m => {
      if (m.id !== matchId) return m;
      const prev = (m.players || {})[playerId] || {};
      return { ...m, players: { ...(m.players || {}), [playerId]: { ...prev, ...patch } } };
    });
    await saveMatches(updated);
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const isMatchView   = tab === "matches" && selectedMatchId && selectedMatch;
  const NAV = [{ id: "dashboard", label: "Dashboard" }, { id: "squad", label: "Squad" }, { id: "matches", label: "Matches" }];

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.black, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <img src={LOGO_URL} alt="Bromley RFC" style={{ width: 64, height: 64, objectFit: "contain", opacity: 0.85 }} />
      <div style={{ color: C.amber, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase" }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.black, fontFamily: "'DM Sans', sans-serif", color: C.chalk }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; }
        select option { background: #1c1c1c; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #f5a80033; border-radius: 99px; }
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator { filter: invert(0.6) sepia(1) hue-rotate(10deg) saturate(3); }
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes amberpulse { 0%,100%{box-shadow:0 0 0 0 #f5a80055} 70%{box-shadow:0 0 0 6px transparent} }
      `}</style>

      {/* Subtle amber diagonal stripe */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.025,
        backgroundImage: `repeating-linear-gradient(-45deg, ${C.amber} 0, ${C.amber} 1px, transparent 0, transparent 50%)`,
        backgroundSize: "14px 14px",
      }} />

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(5,5,5,0.97)", backdropFilter: "blur(12px)",
        borderBottom: `3px solid ${C.amber}`,
        boxShadow: `0 4px 24px rgba(245,168,0,0.12)`,
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 64, padding: "0 24px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 12 }}>
            <img src={LOGO_URL} alt="Bromley RFC" style={{ width: 42, height: 42, objectFit: "contain", filter: "drop-shadow(0 0 10px #f5a80077)" }} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, letterSpacing: "0.07em", color: C.chalk, lineHeight: 1.1, textTransform: "uppercase" }}>
                Bromley RFC
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.2em", color: C.amber, lineHeight: 1, textTransform: "uppercase" }}>
                Squad Tracker
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: "flex", gap: 4 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setSelectedMatchId(null); }} style={{
                background: tab === n.id ? C.amber : "transparent",
                border: `1px solid ${tab === n.id ? C.amber : C.border}`,
                color: tab === n.id ? C.black : C.chalkDim,
                borderRadius: 6, padding: "5px 18px", fontSize: 12, fontWeight: 800,
                cursor: "pointer", transition: "all 0.15s",
                letterSpacing: "0.07em", textTransform: "uppercase",
              }}>
                {n.label}
              </button>
            ))}
          </nav>

          {/* Sync status */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: syncing ? C.amber : C.green,
              animation: syncing ? "pulse 1s infinite" : "amberpulse 2.5s infinite",
            }} />
            <span style={{ fontSize: 11, color: C.chalkDim }}>
              {syncing ? "Syncing…" : lastSync ? `Synced ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 1 }}>
        {!isMatchView && (
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 44, fontWeight: 900, color: C.chalk, letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1 }}>
              {tab === "dashboard" ? "Dashboard" : tab === "squad" ? "Squad Roster" : "Matches"}
            </h1>
            <div style={{ width: 56, height: 4, background: C.amber, borderRadius: 99, marginTop: 10 }} />
          </div>
        )}

        {tab === "dashboard" && <Dashboard matches={matches} squad={squad} onSelectMatch={id => { setSelectedMatchId(id); setTab("matches"); }} />}
        {tab === "squad"     && <SquadPage squad={squad} onSetSquad={saveSquad} />}
        {tab === "matches" && !isMatchView && <MatchesPage matches={matches} onAdd={addMatch} onDelete={deleteMatch} onSelect={id => setSelectedMatchId(id)} />}
        {isMatchView && <MatchView match={selectedMatch} squad={squad} onUpdate={updatePlayerInMatch} onBack={() => setSelectedMatchId(null)} />}
      </main>
    </div>
  );
}
