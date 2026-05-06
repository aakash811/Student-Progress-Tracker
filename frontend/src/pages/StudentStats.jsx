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
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
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
  GraduationCap,
  Hash,
  LineChart as LineChartIcon,
  RefreshCw,
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

const StatCard = ({ icon: Icon, label, value, sub, tone = "blue" }) => (
  <div className="stat-card">
    <div className="stat-card__top">
      <span>{label}</span>
      {createElement(Icon, {
        className: `metric-icon metric-icon--${tone}`,
        size: 17,
      })}
    </div>
    <strong>{value ?? "-"}</strong>
    {sub && <p>{sub}</p>}
  </div>
);

const HeaderRow = ({ title, children }) => (
  <div className="section-row">
    <h2>{title}</h2>
    {children}
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

const getFilterStartDate = (filter) => {
  const now = new Date();
  if (filter === "3m") {
    const date = new Date();
    date.setMonth(now.getMonth() - 3);
    return date;
  }
  if (filter === "6m") {
    const date = new Date();
    date.setMonth(now.getMonth() - 6);
    return date;
  }
  if (filter === "12m") {
    const date = new Date();
    date.setFullYear(now.getFullYear() - 1);
    return date;
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
    .filter((entry) => entry.total > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const activeDays = entries.length;
  const totalSubmissions = entries.reduce((sum, entry) => sum + entry.total, 0);
  const accepted = entries.reduce((sum, entry) => sum + entry.correct, 0);
  const activeSet = new Set(entries.map((entry) => entry.date));

  let currentStreak = 0;
  for (let date = new Date(); ; date = new Date(date.getTime() - DAY)) {
    const key = date.toISOString().split("T")[0];
    if (!activeSet.has(key)) break;
    currentStreak += 1;
  }

  let longestStreak = 0;
  let streak = 0;
  let previous = null;
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

export default function StudentStats() {
  const { theme } = useTheme();
  const { handle } = useParams();

  const [performanceStats, setPerformanceStats] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [contestData, setContestData] = useState([]);
  const [selectedDays, setSelectedDays] = useState("30");
  const [contestFilter, setContestFilter] = useState("3m");
  const [heatmapFilter, setHeatmapFilter] = useState("365");

  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [contestLoading, setContestLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    const fetchPerformance = async () => {
      setPerformanceLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/codeforces/stats/${handle}?days=${selectedDays}`,
        );
        setPerformanceStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setPerformanceLoading(false);
      }
    };
    fetchPerformance();
  }, [handle, selectedDays]);

  useEffect(() => {
    const fetchActivity = async () => {
      setActivityLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/codeforces/stats/${handle}?days=all`,
        );
        setActivityStats(res.data);
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivity();
  }, [handle]);

  useEffect(() => {
    const fetchContests = async () => {
      setContestLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/codeforces/contest/${handle}?days=all`,
        );
        setContestData(res.data.contestStats || []);
      } catch (err) {
        console.error("Error fetching contests:", err);
      } finally {
        setContestLoading(false);
      }
    };
    fetchContests();
  }, [handle]);

  const contestYears = useMemo(() => {
    return [...new Set(contestData.map((c) => new Date(c.date).getFullYear()))]
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [contestData]);

  const heatmapYears = useMemo(() => {
    return [
      ...new Set(
        Object.keys(activityStats?.submissionHeatmap || {}).map((date) =>
          new Date(date).getFullYear(),
        ),
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [activityStats]);

  const filteredContests = useMemo(() => {
    if (contestFilter === "all") return contestData;

    const startDate = getFilterStartDate(contestFilter);
    if (startDate) {
      return contestData.filter((c) => new Date(c.date) >= startDate);
    }

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
      .filter((value) => {
        const time = new Date(value.date).getTime();
        return time >= start && time <= end;
      });
  }, [activityStats, heatmapRange]);

  const difficultyData = useMemo(() => {
    return Object.entries(performanceStats?.ratingBuckets || {})
      .filter(([rating, count]) => Number(rating) > 0 && count > 0)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([rating, count]) => ({ rating, count }));
  }, [performanceStats]);

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
    : "-";
  const hasHeatmapData = heatmapValues.some((value) => value.total > 0);
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

  const tagAnalysis = useMemo(() => {
    const tagMap = {};

    const submissions = performanceStats?.solvedProblems || [];

    submissions.forEach((problem) => {
      if (!problem.tags) return;

      problem.tags.forEach((tag) => {
        if (!tagMap[tag]) {
          tagMap[tag] = {
            tag,
            solved: 0,
            totalRating: 0,
            maxRating: 0,
          };
        }

        tagMap[tag].solved += 1;

        if (problem.rating) {
          tagMap[tag].totalRating += problem.rating;
          tagMap[tag].maxRating = Math.max(
            tagMap[tag].maxRating,
            problem.rating,
          );
        }
      });
    });

    const tags = Object.values(tagMap)
      .map((tag) => ({
        ...tag,
        averageRating: tag.solved
          ? Math.round(tag.totalRating / tag.solved)
          : 0,
      }))
      .sort((a, b) => b.solved - a.solved);

    const strongestTag = tags[0];

    const weakestTag = [...tags]
      .filter((t) => t.solved >= 3)
      .sort((a, b) => a.averageRating - b.averageRating)[0];

    return {
      tags,
      strongestTag,
      weakestTag,
      diversityScore: tags.length,
    };
  }, [performanceStats]);

  const manualSync = async () => {
    setSyncing(true);
    try {
      await axios.get(`${API_BASE}/api/codeforces/sync/${handle}`);
      const [performanceRes, activityRes, contestRes] = await Promise.all([
        axios.get(
          `${API_BASE}/api/codeforces/stats/${handle}?days=${selectedDays}`,
        ),
        axios.get(`${API_BASE}/api/codeforces/stats/${handle}?days=all`),
        axios.get(`${API_BASE}/api/codeforces/contest/${handle}?days=all`),
      ]);
      setPerformanceStats(performanceRes.data);
      setActivityStats(activityRes.data);
      setContestData(contestRes.data.contestStats || []);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (fullPageLoading) {
    return (
      <div className="stats-loader">
        <div />
        <p>Fetching {handle}...</p>
      </div>
    );
  }

  return (
    <div className="student-stats-page">
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
            {Array.from({ length: 4 }).map((_, index) => (
              <SectionSkeleton key={index} height={116} />
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
            />
            <StatCard
              icon={Gauge}
              label="Average pace"
              value={performanceStats?.averagePerDay}
              sub="Solved problems per day"
              tone="blue"
            />
            <StatCard
              icon={ClipboardList}
              label="Submissions"
              value={performanceStats?.totalSubmissions}
              sub="All attempts in this window"
              tone="orange"
            />
            <StatCard
              icon={Award}
              label="Hardest solved"
              value={hardestRating || "-"}
              sub={
                performanceStats?.hardestProblem?.name || "No rated solve yet"
              }
              tone="violet"
            />
          </div>
        )}

        <div className="insight-strip">
          <StatCard
            icon={Flame}
            label="Current streak"
            value={`${activitySummary.currentStreak}d`}
            sub={`Best streak: ${activitySummary.longestStreak}d`}
            tone="orange"
          />
          <StatCard
            icon={CalendarDays}
            label="Active days"
            value={activitySummary.activeDays}
            sub="Days with at least one submission"
            tone="blue"
          />
          <StatCard
            icon={Hash}
            label="Acceptance rate"
            value={`${activitySummary.acceptanceRate}%`}
            sub="Accepted submissions over attempts"
            tone="green"
          />
          <StatCard
            icon={GraduationCap}
            label="Next practice target"
            value={nextTarget}
            sub="Try problems just above your hardest solve"
            tone="violet"
          />
        </div>

        <section className="analytics-grid">
          <div className="panel">
            <HeaderRow title="Problems by Difficulty" />
            {performanceLoading ? (
              <SectionSkeleton height={276} />
            ) : difficultyData.length ? (
              <>
                <ResponsiveContainer width="100%" height={276}>
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
                <div className="difficulty-insights">
                  <div className="difficulty-pill">
                    <span>Most Solved</span>
                    <strong>
                      {difficultyData.length
                        ? `${
                            difficultyData.reduce((a, b) =>
                              a.count > b.count ? a : b,
                            ).rating
                          }+`
                        : "-"}
                    </strong>
                  </div>

                  <div className="difficulty-pill">
                    <span>Peak Difficulty</span>
                    <strong>{hardestRating || "-"}</strong>
                  </div>

                  <div className="difficulty-pill">
                    <span>Difficulty Spread</span>
                    <strong>{difficultyData.length}</strong>
                  </div>
                </div>

                <div className="difficulty-summary">
                  <div className="difficulty-summary__row">
                    <span>Most Comfortable Range</span>
                    <strong>
                      {difficultyData.length
                        ? `${
                            difficultyData.reduce((a, b) =>
                              a.count > b.count ? a : b,
                            ).rating
                          }-${
                            Number(
                              difficultyData.reduce((a, b) =>
                                a.count > b.count ? a : b,
                              ).rating,
                            ) + 99
                          }`
                        : "-"}
                    </strong>
                  </div>

                  <div className="difficulty-summary__row">
                    <span>Estimated Skill Ceiling</span>
                    <strong>{hardestRating || "-"}</strong>
                  </div>

                  <div className="difficulty-summary__row">
                    <span>Problem Distribution</span>
                    <strong>
                      {difficultyData.length > 6
                        ? "Broad"
                        : difficultyData.length > 3
                          ? "Balanced"
                          : "Focused"}
                    </strong>
                  </div>

                  <div className="difficulty-summary__row">
                    <span>Practice Pattern</span>
                    <strong>
                      {activitySummary.currentStreak >= 10
                        ? "Consistent Grinder"
                        : activitySummary.currentStreak >= 4
                          ? "Regular Solver"
                          : "Occasional Practice"}
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

          <div className="panel">
            <HeaderRow title="Problem Solving DNA" />
            {performanceLoading ? (
              <SectionSkeleton height={520} />
            ) : tagAnalysis.tags.length ? (
              <>
                <div className="dna-top">
                  <div className="dna-stat">
                    <span>Strongest Topic</span>
                    <strong>{tagAnalysis.strongestTag?.tag}</strong>
                    <p>
                      {tagAnalysis.strongestTag?.solved} solved • Avg{" "}
                      {tagAnalysis.strongestTag?.averageRating}
                    </p>
                  </div>

                  <div className="dna-stat">
                    <span>Needs Improvement</span>
                    <strong>{tagAnalysis.weakestTag?.tag || "Balanced"}</strong>
                    <p>
                      Avg {tagAnalysis.weakestTag?.averageRating || "-"}{" "}
                      difficulty
                    </p>
                  </div>

                  <div className="dna-stat">
                    <span>Topic Diversity</span>
                    <strong>{tagAnalysis.diversityScore}</strong>
                    <p>Unique problem-solving domains</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 10, left: 0 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} />

                    <XAxis
                      type="number"
                      dataKey="averageRating"
                      name="Average Rating"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      type="category"
                      dataKey="tag"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />

                    <ZAxis type="number" dataKey="solved" range={[80, 900]} />

                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: chartColors.tooltip.background,
                        border: `1px solid ${chartColors.tooltip.border}`,
                        borderRadius: 10,
                        color: chartColors.tooltip.color,
                        fontSize: 12,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                      labelStyle={{
                        color: chartColors.tooltip.color,
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                      itemStyle={{
                        color: chartColors.tooltip.color,
                      }}
                      formatter={(value, name) => [value, name]}
                    />

                    <Scatter
                      data={tagAnalysis.tags.slice(0, 15)}
                      fill="#7c3aed"
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </ScatterChart>
                </ResponsiveContainer>

                <div className="tag-chips">
                  {tagAnalysis.tags.slice(0, 12).map((tag) => (
                    <div key={tag.tag} className="tag-chip">
                      <span>{tag.tag}</span>
                      <strong>{tag.solved}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Hash}
                title="No tag analytics available"
                message="Start solving tagged problems to unlock insights."
              />
            )}
          </div>
        </section>

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
                    "data-tooltip-content": `${value.date} - ${value.total || 0} submissions - ${value.correct || 0} accepted`,
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
              message={`No activity was found for ${heatmapRange.label.toLowerCase()}.`}
            />
          )}
        </section>

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
              message={`There are no rated contests in ${formatFilterLabel(contestFilter)}.`}
            />
          )}
        </section>

        <section className="panel table-panel">
          <HeaderRow
            title={`Contest History - ${formatFilterLabel(contestFilter)}`}
          />
          {contestLoading ? (
            <SectionSkeleton height={220} />
          ) : filteredContests.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {["Contest", "Date", "Rank", "Rating Change", "Solved"].map(
                      (heading) => (
                        <th key={heading}>{heading}</th>
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
                      <td>
                        {contest.totalProblems ? (
                          <span className="solved-pill">
                            {contest.solvedProblems}/{contest.totalProblems}
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
              message={`There are no contest rows for ${formatFilterLabel(contestFilter)}.`}
            />
          )}
        </section>
      </main>
    </div>
  );
}
