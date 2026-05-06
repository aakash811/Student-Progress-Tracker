import AddStudentDialog from "@/components/AddStudentDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import axios from "axios";
import {
  Trash2, RefreshCw, Search, Users,
  TrendingUp, Activity, ChevronUp, ChevronDown
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const getRankStyle = (rating) => {
  if (!rating || rating === 0) return { label: "Unrated",  color: "#9ca3af", bg: "rgba(156,163,175,0.1)" };
  if (rating < 1200) return { label: "Newbie",             color: "#9ca3af", bg: "rgba(156,163,175,0.1)" };
  if (rating < 1400) return { label: "Pupil",              color: "#22c55e", bg: "rgba(34,197,94,0.1)"   };
  if (rating < 1600) return { label: "Specialist",         color: "#06b6d4", bg: "rgba(6,182,212,0.1)"   };
  if (rating < 1900) return { label: "Expert",             color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  };
  if (rating < 2100) return { label: "Candidate Master",   color: "#a855f7", bg: "rgba(168,85,247,0.1)"  };
  if (rating < 2300) return { label: "Master",             color: "#f97316", bg: "rgba(249,115,22,0.1)"  };
  if (rating < 2400) return { label: "International Master", color: "#f97316", bg: "rgba(249,115,22,0.1)" };
  if (rating < 2600) return { label: "Grandmaster",        color: "#ef4444", bg: "rgba(239,68,68,0.1)"   };
  if (rating < 3000) return { label: "International Grandmaster", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  return                     { label: "Legendary Grandmaster",    color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
};

const RatingBadge = ({ rating }) => {
  const { label, color, bg } = getRankStyle(rating);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "15px" }}>
        {rating || "—"}
      </span>
      <span style={{
        color, background: bg, fontSize: "9px", fontWeight: 600,
        letterSpacing: "0.08em", padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase"
      }}>{label}</span>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div style={{
    border: "1px solid var(--border)", borderRadius: "10px",
    padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px",
    background: "var(--card)",
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: "8px", background: accent + "18",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      <Icon size={18} style={{ color: accent }} />
    </div>
    <div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</p>
    </div>
  </div>
);

// Fix: route is GET /api/codeforces/sync/:handle — not POST
const SyncButton = ({ handle, onDone }) => {
  const [syncing, setSyncing] = useState(false);
  const [done, setDone]       = useState(false);

  const sync = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSyncing(true);
    setDone(false);
    try {
      await axios.get(`${API_BASE}/api/codeforces/sync/${handle}`);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      onDone(true);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={sync} disabled={syncing}
      title={syncing ? "Syncing…" : done ? "Synced!" : "Sync Codeforces data"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: "6px",
        border: "1px solid var(--border)",
        background: done ? "rgba(34,197,94,0.15)" : "transparent",
        cursor: syncing ? "not-allowed" : "pointer",
        color: done ? "#22c55e" : "var(--muted-foreground)",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { if (!syncing && !done) e.currentTarget.style.background = "var(--accent)"; }}
      onMouseLeave={e => { if (!syncing && !done) e.currentTarget.style.background = "transparent"; }}
    >
      <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
    </button>
  );
};

// State comes from App.jsx — survives navigation back from stats page
export default function StudentTable({ students = [], loading, fetchStudents, setStudents }) {
  const [editStudent, setEditStudent] = useState(null);
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState("currRating");
  const [sortDir, setSortDir]         = useState("desc");
  const [syncingAll, setSyncingAll]   = useState(false);

  // First mount: fetch if not already loaded (no-op if App already has data)
  useEffect(() => { fetchStudents(); }, []);

  const deleteStudent = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await axios.delete(`${API_BASE}/api/students/${id}`);
      fetchStudents(true);
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };

  const toggleEmailReminder = async (id, currentDisabled) => {
    try {
      await axios.put(`${API_BASE}/api/students/${id}/toggle-reminder`, {
        emailRemindersDisabled: !currentDisabled,
      });
      setStudents(prev =>
        prev.map(s => s._id === id ? { ...s, emailRemindersDisabled: !currentDisabled } : s)
      );
    } catch (err) {
      console.error("Failed to toggle email reminder:", err);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.codeforcesHandle?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [students, search, sortKey, sortDir]);

  const avgRating = students.length
    ? Math.round(students.reduce((s, x) => s + (x.currRating || 0), 0) / students.length) : 0;
  const topRating = students.length
    ? Math.max(...students.map(x => x.currRating || 0)) : 0;

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
    return sortDir === "asc"
      ? <ChevronUp size={12} style={{ color: "#3b82f6" }} />
      : <ChevronDown size={12} style={{ color: "#3b82f6" }} />;
  };

  const Th = ({ col, children, center }) => (
    <th onClick={() => handleSort(col)} style={{
      padding: "10px 14px", textAlign: center ? "center" : "left",
      fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em",
      textTransform: "uppercase", color: "var(--muted-foreground)",
      cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
      borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {children} <SortIcon col={col} />
      </span>
    </th>
  );
  
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{
        borderBottom: "1px solid var(--border)", padding: "14px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--background)", backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "15px" }}>SkillSync</span>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}> / dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ModeToggle />
          <AddStudentDialog
            onStudentAdded={() => fetchStudents(true)}
            editStudent={editStudent}
            setEditStudent={setEditStudent}
          />
        </div>
      </div>

      <div style={{ padding: "28px 28px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "28px" }}>
          <StatCard icon={Users}      label="Total Students" value={students.length} accent="#3b82f6" />
          <StatCard icon={TrendingUp} label="Avg Rating"     value={avgRating || "—"} accent="#a855f7" />
          <StatCard icon={Activity}   label="Top Rating"     value={topRating || "—"} accent="#f97316" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1", minWidth: "200px", maxWidth: "340px" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <Input
              placeholder="Search name, handle, email…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: "34px", height: "36px", fontSize: "13px" }}
            />
          </div>
          <Button variant="outline" size="sm" disabled={syncingAll}
            onClick={async () => { setSyncingAll(true); await fetchStudents(true); setSyncingAll(false); }}
            style={{ height: "36px", gap: 6, fontSize: "13px" }}
          >
            <RefreshCw size={13} style={{ animation: syncingAll ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </Button>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} / {students.length} students
          </span>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", background: "var(--card)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--muted)" }}>
                  <Th col="name">Name</Th>
                  <Th col="codeforcesHandle">Handle</Th>
                  <Th col="currRating" center>Current Rating</Th>
                  <Th col="maxRating" center>Max Rating</Th>
                  <Th col="lastSyncedAt" center>Last Synced</Th>
                  <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted-foreground)", textAlign: "center", borderBottom: "1px solid var(--border)" }}>Reminders</th>
                  <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted-foreground)", textAlign: "center", borderBottom: "1px solid var(--border)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: "14px" }}>
                          <div style={{ height: 14, borderRadius: 4, background: "var(--muted)", width: j === 0 ? "80%" : "65%", animation: "pulse 1.5s ease-in-out infinite", opacity: 0.6 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "48px", color: "var(--muted-foreground)", fontSize: "14px" }}>
                      {search ? `No students matching "${search}"` : "No students yet. Add one to get started."}
                    </td>
                  </tr>
                ) : filtered.map((s, idx) => (
                  <tr key={s._id}
                    style={{ borderTop: idx > 0 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 1 }}>{s.email}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <a href={`https://codeforces.com/profile/${s.codeforcesHandle}`} target="_blank" rel="noreferrer"
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: getRankStyle(s.currRating).color, textDecoration: "none", fontWeight: 600 }}>
                        {s.codeforcesHandle}
                      </a>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}><RatingBadge rating={s.currRating} /></td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}><RatingBadge rating={s.maxRating} /></td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
                        {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.7 }}>
                        {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <Switch checked={!s.emailRemindersDisabled} onCheckedChange={() => toggleEmailReminder(s._id, s.emailRemindersDisabled)} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                        <SyncButton handle={s.codeforcesHandle} onDone={fetchStudents} />
                        <Link to={`/student/${s.codeforcesHandle}`}>
                          <button style={{ height: 30, padding: "0 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "var(--foreground)", transition: "background 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--accent)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >Stats</button>
                        </Link>
                        <button onClick={() => setEditStudent(s)}
                          style={{ height: 30, padding: "0 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "var(--foreground)", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--accent)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >Edit</button>
                        <button onClick={() => deleteStudent(s._id)}
                          style={{ width: 30, height: 30, borderRadius: "6px", border: "1px solid transparent", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                        ><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}