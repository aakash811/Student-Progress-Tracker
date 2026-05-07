import { createElement, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ReactCalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import "./heatmap.css";
import { subDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flame,
  Gauge,
  Hash,
  LineChart as LineChartIcon,
  RefreshCw,
  Target,
  Info,
  Brain,
  TrendingUp,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const DAY = 24 * 60 * 60 * 1000;

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
  return { label: "Legendary", color: "#dc2626" };
};

const formatFilterLabel = (value) => {
  if (value === "all") return "all time";
  if (value === "3m") return "the last 3 months";
  if (value === "6m") return "the last 6 months";
  if (value === "12m") return "the last 12 months";
  return String(value);
};

// ── Reusable components ───────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, tone = "blue", info }) => (
  <div className="stat-card">
    <div className="stat-card__top">
      <div className="stat-card__label">
        <span>{label}</span>

        {info && (
          <>
            <Info
              size={13}
              className="info-icon"
              data-tooltip-id={`tooltip-${label}`}
              data-tooltip-content={info}
            />

            <ReactTooltip id={`tooltip-${label}`} className="metric-tooltip" />
          </>
        )}
      </div>

      {createElement(Icon, {
        className: `metric-icon metric-icon--${tone}`,
        size: 17,
      })}
    </div>

    <strong>{value ?? "—"}</strong>

    {sub && <p>{sub}</p>}
  </div>
);

const HeaderRow = ({ title, children }) => (
  <div className="section-row">
    <h2>{title}</h2>
    {children}
  </div>
);

const MetricCardSkeleton = () => (
  <div className="stat-card skeleton-card">
    <div className="skeleton-line skeleton-line--title" />
    <div className="skeleton-line skeleton-line--value" />
    <div className="skeleton-line skeleton-line--sub" />
  </div>
);

const AnalyticsChipSkeleton = () => (
  <div className="analytics-chip analytics-chip--skeleton">
    <div className="chip-skeleton-icon" />
    <div className="chip-skeleton-text" />
  </div>
);

const SectionSkeleton = ({ height = 220 }) => (
  <div className="section-skeleton" style={{ height }} />
);

const EmptyState = ({ icon: Icon, title, message }) => (
  <div className="empty-state">
    {createElement(Icon, { size: 22 })}
    <strong>{title}</strong>
    <span>{message}</span>
  </div>
);

const RatingChangePill = ({ change = 0 }) => (
  <span className={change >= 0 ? "delta delta--up" : "delta delta--down"}>
    {change > 0 ? "+" : ""}
    {change}
  </span>
);

const CustomRatingTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.contestName}</strong>
      <span>{d.date}</span>
      <div>
        {d.oldRating} to <b>{d.newRating}</b>{" "}
        <RatingChangePill change={d.ratingChange} />
      </div>
      <span>Rank #{d.rank}</span>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getFilterStartDate = (filter) => {
  const now = new Date();
  if (filter === "3m") {
    const d = new Date();
    d.setMonth(now.getMonth() - 3);
    return d;
  }
  if (filter === "6m") {
    const d = new Date();
    d.setMonth(now.getMonth() - 6);
    return d;
  }
  if (filter === "12m") {
    const d = new Date();
    d.setFullYear(now.getFullYear() - 1);
    return d;
  }
  return null;
};

const getHeatmapRange = (filter) => {
  const now = new Date();
  if (["90", "180", "365"].includes(filter)) {
    return {
      startDate: subDays(now, Number(filter) - 1),
      endDate: now,
      label: `Last ${filter === "365" ? "12 months" : `${Number(filter) / 30} months`}`,
    };
  }
  const year = Number(filter);
  const endDate =
    year === now.getFullYear() ? now : new Date(`${year}-12-31T23:59:59`);
  return {
    startDate: new Date(`${year}-01-01T00:00:00`),
    endDate,
    label: String(year),
  };
};

const getActivitySummary = (heatmap = {}) => {
  const entries = Object.entries(heatmap)
    .map(([date, value]) => ({
      date,
      total: value.total || 0,
      correct: value.correct || 0,
    }))
    .filter((e) => e.total > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const activeDays = entries.length;
  const totalSubmissions = entries.reduce((s, e) => s + e.total, 0);
  const accepted = entries.reduce((s, e) => s + e.correct, 0);
  const activeSet = new Set(entries.map((e) => e.date));

  let currentStreak = 0;
  for (let date = new Date(); ; date = new Date(date.getTime() - DAY)) {
    const key = date.toISOString().split("T")[0];
    if (!activeSet.has(key)) break;
    currentStreak++;
  }

  let longestStreak = 0,
    streak = 0,
    previous = null;
  entries.forEach((entry) => {
    const current = new Date(entry.date);
    streak =
      previous && Math.round((current - previous) / DAY) === 1 ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
    previous = current;
  });

  return {
    activeDays,
    currentStreak,
    longestStreak,
    acceptanceRate: totalSubmissions
      ? Math.round((accepted / totalSubmissions) * 100)
      : 0,
  };
};

// ── Main component ────────────────────────────────────────────────────────────

export default function StudentStats() {
  const { theme } = useTheme();
  const { handle } = useParams();

  const [performanceStats, setPerformanceStats] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [contestData, setContestData] = useState([]);
  const [selectedDays, setSelectedDays] = useState("30");
  const [contestFilter, setContestFilter] = useState("3m");
  const [heatmapFilter, setHeatmapFilter] = useState("365");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [contestLoading, setContestLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isDark = theme === "dark";

  // Fetch performance stats (respects selectedDays filter)
  useEffect(() => {
    const fetch = async () => {
      setPerformanceLoading(true);
      setAnalyticsLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/codeforces/stats/${handle}?days=${selectedDays}`,
        );
        setPerformanceStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setPerformanceLoading(false);
        setTimeout(() => {
          setAnalyticsLoading(false);
        }, 250);
      }
    };
    fetch();
  }, [handle, selectedDays]);

  // Fetch all-time activity (for heatmap + streak — fetched once)
  useEffect(() => {
    const fetch = async () => {
      setActivityLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/codeforces/stats/${handle}?days=all`,
        );
        setActivityStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setActivityLoading(false);
      }
    };
    fetch();
  }, [handle]);

  // Fetch all-time contests (filtered client-side)
  useEffect(() => {
    const fetch = async () => {
      setContestLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/codeforces/contest/${handle}?days=all`,
        );
        setContestData(res.data.contestStats || []);
      } catch (err) {
        console.error(err);
      } finally {
        setContestLoading(false);
      }
    };
    fetch();
  }, [handle]);

  const contestYears = useMemo(
    () =>
      [...new Set(contestData.map((c) => new Date(c.date).getFullYear()))]
        .filter(Boolean)
        .sort((a, b) => b - a),
    [contestData],
  );

  const heatmapYears = useMemo(
    () =>
      [
        ...new Set(
          Object.keys(activityStats?.submissionHeatmap || {}).map((d) =>
            new Date(d).getFullYear(),
          ),
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => b - a),
    [activityStats],
  );

  const filteredContests = useMemo(() => {
    if (contestFilter === "all") return contestData;
    const startDate = getFilterStartDate(contestFilter);
    if (startDate)
      return contestData.filter((c) => new Date(c.date) >= startDate);
    return contestData.filter(
      (c) => new Date(c.date).getFullYear() === Number(contestFilter),
    );
  }, [contestData, contestFilter]);

  const heatmapRange = useMemo(
    () => getHeatmapRange(heatmapFilter),
    [heatmapFilter],
  );

  const heatmapValues = useMemo(() => {
    const start = heatmapRange.startDate.getTime();
    const end = heatmapRange.endDate.getTime();
    return Object.entries(activityStats?.submissionHeatmap || {})
      .map(([date, { total, correct }]) => ({ date, total, correct }))
      .filter((v) => {
        const t = new Date(v.date).getTime();
        return t >= start && t <= end;
      });
  }, [activityStats, heatmapRange]);

  const difficultyData = useMemo(
    () =>
      Object.entries(performanceStats?.ratingBuckets || {})
        .filter(([rating, count]) => Number(rating) > 0 && count > 0)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([rating, count]) => ({ rating, count })),
    [performanceStats],
  );

  // tagStats now comes from backend — real data derived from submissions
  const tagData = useMemo(
    () => (performanceStats?.tagStats || []).slice(0, 15),
    [performanceStats],
  );

  const activitySummary = useMemo(
    () => getActivitySummary(activityStats?.submissionHeatmap),
    [activityStats],
  );

  const rankStyle = getRankStyle(
    contestData.length ? contestData[contestData.length - 1]?.newRating : 0,
  );
  const hardestRating = performanceStats?.hardestProblem?.rating;
  const nextTarget = hardestRating
    ? `${Math.ceil((hardestRating + 1) / 100) * 100}`
    : "—";
  const hasHeatmapData = heatmapValues.some((v) => v.total > 0);
  const fullPageLoading =
    performanceLoading &&
    activityLoading &&
    contestLoading &&
    !performanceStats;

  const chartColors = {
    grid: isDark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.08)",
    axis: isDark ? "#94a3b8" : "#64748b",
    tooltip: {
      background: isDark ? "#0f172a" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      border: isDark ? "#334155" : "#e2e8f0",
    },
  };

  const manualSync = async () => {
    setSyncing(true);
    try {
      await axios.get(`${API_BASE}/api/codeforces/sync/${handle}`);
      const [perfRes, actRes, conRes] = await Promise.all([
        axios.get(
          `${API_BASE}/api/codeforces/stats/${handle}?days=${selectedDays}`,
        ),
        axios.get(`${API_BASE}/api/codeforces/stats/${handle}?days=all`),
        axios.get(`${API_BASE}/api/codeforces/contest/${handle}?days=all`),
      ]);
      setPerformanceStats(perfRes.data);
      setActivityStats(actRes.data);
      setContestData(conRes.data.contestStats || []);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (fullPageLoading)
    return (
      <div className="stats-loader">
        <div />
        <p>Fetching {handle}...</p>
      </div>
    );

  return (
    <div className="student-stats-page">
      {/* ── Header ── */}
      <header className="stats-header">
        <div className="stats-header__left">
          <Link to="/" className="back-link">
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <span className="divider">/</span>
          <div>
            <div className="handle-row">
              <span style={{ color: rankStyle.color }}>{handle}</span>
              <em
                style={{
                  color: rankStyle.color,
                  background: `${rankStyle.color}1a`,
                }}
              >
                {rankStyle.label}
              </em>
              <span className="divider">/</span>
              <div className="persona-badge">
                {performanceStats?.persona || "Solver"}
              </div>
            </div>
            <p>Student coding progress and Codeforces training signals</p>
          </div>
        </div>
        <div className="stats-header__actions">
          <button
            onClick={manualSync}
            disabled={syncing}
            className="sync-button"
          >
            <RefreshCw size={15} className={syncing ? "spin" : ""} />
            {syncing ? "Syncing" : "Sync"}
          </button>
          <ModeToggle />
        </div>
      </header>

      <main className="stats-shell">
        {/* ── Performance Overview ── */}
        <HeaderRow title="Performance Overview">
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="compact-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </HeaderRow>
        {performanceLoading ? (
          <div className="metrics-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="metrics-grid">
            <StatCard
              icon={CheckCircle2}
              label="Problems solved"
              value={performanceStats?.totalSolved}
              sub={`In the last ${selectedDays} days`}
              tone="green"
              info="Number of unique Codeforces problems solved successfully in the selected time range."
            />
            <StatCard
              icon={Gauge}
              label="Average pace"
              value={performanceStats?.averagePerDay}
              sub="Solved problems per day"
              tone="blue"
              info="Average number of problems solved per day during the selected period."
            />
            <StatCard
              icon={ClipboardList}
              label="Submissions"
              value={performanceStats?.totalSubmissions}
              sub="All attempts in this window"
              tone="orange"
              info="Total number of submissions made in the selected time range, including both accepted and rejected attempts."
            />
            <StatCard
              icon={Award}
              label="Hardest solved"
              value={hardestRating || "—"}
              sub={
                performanceStats?.hardestProblem?.name || "No rated solve yet"
              }
              tone="violet"
              info="Highest rated Codeforces problem solved successfully in the selected period."
            />
          </div>
        )}

        {analyticsLoading ? (
          <div className="analytics-ribbon">
            {Array.from({ length: 5 }).map((_, i) => (
              <AnalyticsChipSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Insight strip (all-time, not affected by selectedDays) ── */}
            <div className="analytics-ribbon">
              <div className="analytics-chip analytics-chip--orange">
                <Flame size={14} />
                <span>
                  <strong>{activitySummary.currentStreak}d</strong> streak
                </span>
              </div>

              <div className="analytics-chip analytics-chip--green">
                <Hash size={14} />
                <span>
                  <strong>{activitySummary.acceptanceRate}%</strong> acceptance
                </span>
              </div>

              <div className="analytics-chip analytics-chip--blue">
                <Target size={14} />
                <span>
                  consistency score{" "}
                  <strong>{performanceStats?.consistencyScore || 0}</strong>
                </span>
              </div>

              <div className="analytics-chip analytics-chip--violet">
                <Brain size={14} />
                <span>
                  predicted rating{" "}
                  <strong>{performanceStats?.predictedRating || "—"}</strong>
                </span>
              </div>

              <div className="analytics-chip analytics-chip--emerald">
                <TrendingUp size={14} />
                <span>
                  learning velocity{" "}
                  <strong>
                    {performanceStats?.learningVelocity > 0 ? "+" : ""}
                    {performanceStats?.learningVelocity || 0}
                  </strong>
                </span>
              </div>
            </div>
          </>
        )}
        {/* ── Analytics grid: stacked, full-width each panel ── */}
        <section className="analytics-grid">
          {/* Difficulty distribution */}
          <div className="panel">
            <HeaderRow title="Problems by Difficulty" />
            {performanceLoading ? (
              <SectionSkeleton height={276} />
            ) : difficultyData.length ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={difficultyData}
                    margin={{ top: 10, right: 8, bottom: 0, left: -18 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis
                      dataKey="rating"
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltip.background,
                        border: `1px solid ${chartColors.tooltip.border}`,
                        borderRadius: 8,
                        color: chartColors.tooltip.color,
                        fontSize: 12,
                      }}
                      cursor={{ fill: "rgba(37,99,235,0.06)" }}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="difficulty-breakdown">
                  <div className="difficulty-insight-card">
                    <span>Average Solved Rating</span>
                    <strong>
                      {difficultyData.length
                        ? Math.round(
                            difficultyData.reduce(
                              (sum, bucket) =>
                                sum + Number(bucket.rating) * bucket.count,
                              0,
                            ) /
                              difficultyData.reduce(
                                (sum, bucket) => sum + bucket.count,
                                0,
                              ),
                          )
                        : "-"}
                    </strong>
                  </div>

                  <div className="difficulty-insight-card">
                    <span>Peak Problem Rating</span>
                    <strong>{hardestRating || "-"}</strong>
                  </div>

                  <div className="difficulty-insight-card">
                    <span>Advanced Problems</span>
                    <strong>
                      {difficultyData
                        .filter((bucket) => Number(bucket.rating) >= 1800)
                        .reduce((sum, bucket) => sum + bucket.count, 0)}
                    </strong>
                  </div>

                  <div className="difficulty-insight-card">
                    <span>Rating Coverage</span>
                    <strong>
                      {difficultyData[0]?.rating || "-"}–
                      {[...difficultyData].sort(
                        (a, b) => Number(b.rating) - Number(a.rating),
                      )[0]?.rating || "-"}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No solved rated problems"
                message={`No difficulty data for the last ${selectedDays} days.`}
              />
            )}
          </div>

          {/* Topic breakdown — horizontal bar, real tagStats from backend */}
          <div className="panel">
            <HeaderRow title="Topic Breakdown" />
            {performanceLoading ? (
              <SectionSkeleton height={360} />
            ) : tagData.length ? (
              <>
                <div className="dna-top">
                  <div className="dna-stat">
                    <span>Most solved topic</span>
                    <strong>{tagData[0]?.tag}</strong>
                    <p>
                      {tagData[0]?.solved} solved · avg {tagData[0]?.avgRating}
                    </p>
                  </div>
                  <div className="dna-stat">
                    <span>Highest avg difficulty</span>
                    <strong>
                      {[...tagData].sort((a, b) => b.avgRating - a.avgRating)[0]
                        ?.tag || "—"}
                    </strong>
                    <p>
                      avg rating{" "}
                      {[...tagData].sort((a, b) => b.avgRating - a.avgRating)[0]
                        ?.avgRating || "—"}
                    </p>
                  </div>
                  <div className="dna-stat">
                    <span>Topic diversity</span>
                    <strong>{tagData.length} topics</strong>
                    <p>Unique problem-solving domains</p>
                  </div>
                </div>

                {/* Horizontal bar — solved count per tag, sorted descending */}
                <ResponsiveContainer
                  width="100%"
                  height={Math.min(tagData.length * 30 + 20, 420)}
                >
                  <BarChart
                    data={tagData}
                    layout="vertical"
                    margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid
                      stroke={chartColors.grid}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="tag"
                      width={130}
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltip.background,
                        border: `1px solid ${chartColors.tooltip.border}`,
                        borderRadius: 8,
                        color: chartColors.tooltip.color,
                        fontSize: 12,
                      }}
                      formatter={(value, _, props) => [
                        `${value} solved · avg ${props.payload.avgRating}`,
                        "Topic",
                      ]}
                      cursor={{ fill: "rgba(124,58,237,0.06)" }}
                    />
                    <Bar
                      dataKey="solved"
                      fill="#7c3aed"
                      radius={[0, 4, 4, 0]}
                      label={{
                        position: "right",
                        fontSize: 11,
                        fill: chartColors.axis,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <EmptyState
                icon={Hash}
                title="No topic data yet"
                message={`Solve tagged problems in the last ${selectedDays} days to see breakdown.`}
              />
            )}
          </div>
        </section>
        {/* ── Submission heatmap ── */}
        <section className="panel">
          <HeaderRow title="Submission Activity">
            <Select value={heatmapFilter} onValueChange={setHeatmapFilter}>
              <SelectTrigger className="wide-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
                {heatmapYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HeaderRow>

          {activityLoading ? (
            <SectionSkeleton height={156} />
          ) : hasHeatmapData ? (
            <div className="heatmap-wrap">
              <ReactCalendarHeatmap
                startDate={heatmapRange.startDate}
                endDate={heatmapRange.endDate}
                values={heatmapValues}
                classForValue={(value) => {
                  if (!value || value.total === 0) return "color-empty";
                  if (value.total < 2) return "color-github-1";
                  if (value.total < 4) return "color-github-2";
                  if (value.total < 6) return "color-github-3";
                  return "color-github-4";
                }}
                tooltipDataAttrs={(value) => {
                  if (!value?.date) return null;
                  return {
                    "data-tooltip-id": "heatmap-tooltip",
                    "data-tooltip-content": `${value.date} — ${value.total || 0} submissions, ${value.correct || 0} accepted`,
                  };
                }}
              />
              <ReactTooltip id="heatmap-tooltip" className="heatmap-tooltip" />
              <div className="heatmap-footer">
                <span>{heatmapRange.label}</span>
                <div className="legend">
                  <span>Less</span>
                  {[
                    "color-empty",
                    "color-github-1",
                    "color-github-2",
                    "color-github-3",
                    "color-github-4",
                  ].map((cls) => (
                    <i key={cls} className={`heatmap-legend-cell ${cls}`} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No submissions in this time frame"
              message={`No activity found for ${heatmapRange.label.toLowerCase()}.`}
            />
          )}
        </section>
        {/* ── Rating history chart ── */}
        <section className="panel">
          <HeaderRow title="Rating History">
            <Select value={contestFilter} onValueChange={setContestFilter}>
              <SelectTrigger className="compact-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                {contestYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HeaderRow>
          {contestLoading ? (
            <SectionSkeleton height={276} />
          ) : filteredContests.length ? (
            <ResponsiveContainer width="100%" height={276}>
              <LineChart
                data={filteredContests}
                margin={{ top: 10, right: 8, bottom: 0, left: -18 }}
              >
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<CustomRatingTooltip />} />
                <Line
                  type="monotone"
                  dataKey="newRating"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#7c3aed" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={LineChartIcon}
              title="No contests in this time frame"
              message={`No rated contests found in ${formatFilterLabel(contestFilter)}.`}
            />
          )}
        </section>
        {/* ── Contest history table ── */}
        <section className="panel table-panel">
          <HeaderRow
            title={`Contest History — ${formatFilterLabel(contestFilter)}`}
          />
          {contestLoading ? (
            <SectionSkeleton height={220} />
          ) : filteredContests.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {["Contest", "Date", "Rank", "Rating Change", "Solved"].map(
                      (h) => (
                        <th key={h}>{h}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredContests].reverse().map((contest) => (
                    <tr key={contest.contestId}>
                      <td>
                        <a
                          href={`https://codeforces.com/contest/${contest.contestId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {contest.contestName}
                        </a>
                      </td>
                      <td>{contest.date}</td>
                      <td>#{contest.rank}</td>
                      <td>
                        <span className="rating-flow">
                          {contest.oldRating} to <b>{contest.newRating}</b>
                          <RatingChangePill change={contest.ratingChange} />
                        </span>
                      </td>
                      {/* Solved column: shows X/Y format. totalProblems requires
                          codeforcesController.js to include it in contestStats.
                          If not present, shows the unsolved count as fallback. */}
                      <td>
                        {contest.totalProblems > 0 ? (
                          <span className="solved-pill">
                            {contest.solvedProblems}/{contest.totalProblems}
                          </span>
                        ) : contest.solvedProblems > 0 ? (
                          <span className="solved-pill solved-pill--clean">
                            {contest.solvedProblems} solved
                          </span>
                        ) : (
                          <span className="muted">Not tracked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={LineChartIcon}
              title="No contests in this time frame"
              message={`No contest rows for ${formatFilterLabel(contestFilter)}.`}
            />
          )}
        </section>
      </main>
    </div>
  );
}
