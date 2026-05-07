import AddStudentDialog from "@/components/AddStudentDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import axios from "axios";
import {
  Trash2,
  RefreshCw,
  Search,
  Users,
  TrendingUp,
  Medal,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { useEffect, useState, useMemo, createElement } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Codeforces rank system ────────────────────────────────────────────────────
const getRankStyle = (rating) => {
  if (!rating || rating === 0) return { label: "Unrated", color: "#64748b" };
  if (rating < 1200) return { label: "Newbie", color: "#64748b" };
  if (rating < 1400) return { label: "Pupil", color: "#16a34a" };
  if (rating < 1600) return { label: "Specialist", color: "#0891b2" };
  if (rating < 1900) return { label: "Expert", color: "#2563eb" };
  if (rating < 2100) return { label: "Candidate Master", color: "#9333ea" };
  if (rating < 2300) return { label: "Master", color: "#ea580c" };
  if (rating < 2400) return { label: "International Master", color: "#ea580c" };
  if (rating < 2600) return { label: "Grandmaster", color: "#dc2626" };
  if (rating < 3000)
    return { label: "International Grandmaster", color: "#dc2626" };
  return { label: "Legendary Grandmaster", color: "#dc2626" };
};

// ── Components ────────────────────────────────────────────────────────────────

const RatingCell = ({ rating }) => {
  const { label, color } = getRankStyle(rating);
  return (
    <div className="rating-cell">
      <span className="rating-cell__value" style={{ color }}>
        {rating || "—"}
      </span>
      <span
        className="rating-cell__rank"
        style={{ color, background: color + "18" }}
      >
        {label}
      </span>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, tone }) => (
  <div className="stat-card">
    <div className="stat-card__top">
      <span>{label}</span>
      {createElement(Icon, {
        className: `metric-icon metric-icon--${tone}`,
        size: 17,
      })}
    </div>
    <div className="stat-card__value-row">
      <strong>{value ?? "—"}</strong>

      <span className="stat-card__trend">live</span>
    </div>

    <p className="stat-card__meta">Updated from latest synced data</p>
  </div>
);

const RowSyncButton = ({ handle, onDone }) => {
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);

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
      onClick={sync}
      disabled={syncing}
      title={syncing ? "Syncing…" : done ? "Synced!" : "Sync Codeforces data"}
      className={`row-action-btn${done ? " row-action-btn--done" : ""}`}
    >
      <RefreshCw size={13} className={syncing ? "spin" : ""} />
    </button>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudentTable({
  students = [],
  loading,
  fetchStudents,
  setStudents,
}) {
  const [editStudent, setEditStudent] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("currRating");
  const [sortDir, setSortDir] = useState("desc");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

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
      setStudents((prev) =>
        prev.map((s) =>
          s._id === id ? { ...s, emailRemindersDisabled: !currentDisabled } : s,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle email reminder:", err);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.codeforcesHandle?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      let av = a[sortKey],
        bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [students, search, sortKey, sortDir]);

  const avgRating = students.length
    ? Math.round(
        students.reduce((s, x) => s + (x.currRating || 0), 0) / students.length,
      )
    : 0;
  const topRating = students.length
    ? Math.max(...students.map((x) => x.currRating || 0))
    : 0;

  const SortIcon = ({ col }) => {
    if (sortKey !== col)
      return <ArrowUpDown size={11} style={{ opacity: 0.35 }} />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} style={{ color: "#2563eb" }} />
    ) : (
      <ChevronDown size={12} style={{ color: "#2563eb" }} />
    );
  };

  const Th = ({ col, children, center }) => (
    <th
      onClick={() => handleSort(col)}
      className={`sortable-th${center ? " sortable-th--center" : ""}`}
    >
      <span className="th-inner">
        {children} <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="table-page">
      {/* ── Navbar ── */}
      <header className="stats-header">
        <div className="stats-header__left">
          <div className="brand">
            <img
              src="/SkillSync-logo.png"
              alt="SkillSync"
              className="brand__logo"
            />
            <span className="brand__name">SkillSync</span>
            <span className="brand__path">/ dashboard</span>
          </div>
        </div>
        <div className="stats-header__actions">
          <ModeToggle />
          <AddStudentDialog
            onStudentAdded={() => fetchStudents(true)}
            editStudent={editStudent}
            setEditStudent={setEditStudent}
          />
        </div>
      </header>

      <div className="table-shell">
        {/* ── Summary cards ── */}
        <div className="metrics-grid" style={{ marginBottom: 24 }}>
          <SummaryCard
            icon={Users}
            label="Total Students"
            value={students.length}
            tone="blue"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Avg Rating"
            value={avgRating || "—"}
            tone="violet"
          />
          <SummaryCard
            icon={Medal}
            label="Top Rating"
            value={topRating || "—"}
            tone="orange"
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="toolbar__search">
            <Search size={14} className="toolbar__search-icon" />
            <Input
              placeholder="Search name, handle, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar__input"
            />
          </div>

          <button
            className="sync-button sync-button--primary"
            disabled={syncingAll}
            onClick={async () => {
              try {
                setSyncingAll(true);

                setSyncMessage("Background sync started...");

                await axios.post(`${API_BASE}/cron/sync-all`);

                setTimeout(async () => {
                  await fetchStudents(true);

                  setSyncMessage("Student data updated successfully");

                  setTimeout(() => {
                    setSyncMessage("");
                  }, 3000);
                }, 5000);
              } catch (err) {
                console.error(err);

                setSyncMessage("Failed to sync student data");

                setTimeout(() => {
                  setSyncMessage("");
                }, 3000);
              } finally {
                setTimeout(() => {
                  setSyncingAll(false);
                }, 1200);
              }
            }}
          >
            <RefreshCw size={14} className={syncingAll ? "spin" : ""} />

            {syncingAll ? "Syncing..." : "Sync All"}
          </button>

          <span className="toolbar__count">
            {filtered.length} / {students.length} students
          </span>
        </div>

        {syncMessage && (
          <div className="sync-banner">
            <span className="sync-banner__dot" />

            {syncMessage}
          </div>
        )}

        {/* ── Table ── */}
        <div className="panel table-panel" style={{ marginBottom: 0 }}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <Th col="name">Student</Th>
                  <Th col="codeforcesHandle">CF Handle</Th>
                  <Th col="currRating" center>
                    Current Rating
                  </Th>
                  <Th col="maxRating" center>
                    Max Rating
                  </Th>
                  <Th col="lastSyncedAt" center>
                    Last Synced
                  </Th>
                  <th className="th-plain th-plain--center">Reminders</th>
                  <th className="th-plain th-plain--center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      {[70, 50, 40, 40, 55, 30, 80].map((w, j) => (
                        <td key={j}>
                          <div
                            className="skeleton-line"
                            style={{ width: `${w}%`, height: 13 }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="td-empty">
                      {search
                        ? `No students matching "${search}"`
                        : "No students yet — add one to get started."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s._id}>
                      {/* Student name + email */}
                      <td>
                        <div className="student-row-main">
                          <div className="student-avatar">
                            {s.name?.charAt(0)}
                          </div>

                          <div>
                            <div className="student-name">{s.name}</div>

                            <div className="student-email">{s.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* CF handle — colored by rank */}
                      <td>
                        <a
                          href={`https://codeforces.com/profile/${s.codeforcesHandle}`}
                          target="_blank"
                          rel="noreferrer"
                          className="cf-handle"
                          style={{ color: getRankStyle(s.currRating).color }}
                        >
                          {s.codeforcesHandle}
                        </a>
                      </td>

                      {/* Ratings */}
                      <td className="td-center">
                        <RatingCell rating={s.currRating} />
                      </td>
                      <td className="td-center">
                        <RatingCell rating={s.maxRating} />
                      </td>

                      {/* Last synced */}
                      <td className="td-center">
                        <div className="sync-date">
                          {s.lastSyncedAt
                            ? new Date(s.lastSyncedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </div>
                        <div className="sync-time">
                          {s.lastSyncedAt
                            ? new Date(s.lastSyncedAt).toLocaleTimeString(
                                "en-IN",
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : ""}
                        </div>
                      </td>

                      {/* Email reminder toggle */}
                      <td className="td-center">
                        <Switch
                          checked={!s.emailRemindersDisabled}
                          onCheckedChange={() =>
                            toggleEmailReminder(s._id, s.emailRemindersDisabled)
                          }
                        />
                      </td>

                      {/* Actions */}
                      <td className="td-center">
                        <div className="row-actions">
                          <RowSyncButton
                            handle={s.codeforcesHandle}
                            onDone={fetchStudents}
                          />
                          <Link to={`/student/${s.codeforcesHandle}`}>
                            <button className="row-action-btn row-action-btn--text">
                              Stats
                            </button>
                          </Link>
                          <button
                            className="row-action-btn row-action-btn--text"
                            onClick={() => setEditStudent(s)}
                          >
                            Edit
                          </button>
                          <button
                            className="row-action-btn row-action-btn--danger"
                            onClick={() => deleteStudent(s._id)}
                            title="Delete student"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
