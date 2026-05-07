const axios = require("axios");
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TTL_USER_INFO = 60 * 60 * 6;
const TTL_CONTESTS = 60 * 60 * 6;
const TTL_SUBMISSIONS = 60 * 60 * 2;

const BASE_URL = "https://codeforces.com/api";

const cachedFetch = async (cacheKey, ttl, fetcher) => {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cached;
    }
  } catch (err) {
    console.warn(`[Cache] Redis GET failed for ${cacheKey}:`, err.message);
  }

  console.log(`[Cache MISS] ${cacheKey} — fetching live`);
  const data = await fetcher();

  try {
    await redis.set(cacheKey, data, { ex: ttl });
  } catch (err) {
    console.warn(`[Cache] Redis SET failed for ${cacheKey}:`, err.message);
  }

  return data;
};

exports.fetchUserInfo = async (handle) => {
  return cachedFetch(`cf:info:${handle}`, TTL_USER_INFO, async () => {
    const res = await axios.get(`${BASE_URL}/user.info?handles=${handle}`);
    return res.data.result[0];
  });
};

exports.fetchUserContest = async (handle) => {
  return cachedFetch(`cf:contest:${handle}`, TTL_CONTESTS, async () => {
    const res = await axios.get(`${BASE_URL}/user.rating?handle=${handle}`);
    return res.data.result;
  });
};

const fetchUserSubmission = async (handle) => {
  return cachedFetch(`cf:submissions:${handle}`, TTL_SUBMISSIONS, async () => {
    const res = await axios.get(
      `${BASE_URL}/user.status?handle=${handle}&from=1&count=10000`,
    );
    return res.data.result;
  });
};
exports.fetchUserSubmission = fetchUserSubmission;

exports.invalidateUserCache = async (handle) => {
  try {
    await Promise.all([
      redis.del(`cf:info:${handle}`),
      redis.del(`cf:contest:${handle}`),
      redis.del(`cf:submissions:${handle}`),
    ]);
    console.log(`[Cache] Invalidated all keys for ${handle}`);
  } catch (err) {
    console.warn(`[Cache] Invalidation failed for ${handle}:`, err.message);
  }
};

const filterByDate = (submissions, days) => {
  if (days === "all") return submissions;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return submissions.filter((sub) => sub.creationTimeSeconds * 1000 >= cutoff);
};

const groupByRating = (submissions) => {
  const ratingBuckets = {};
  submissions.forEach((sub) => {
    const rating = sub.problem.rating || 0;
    const bucket = Math.floor(rating / 100) * 100;
    if (!ratingBuckets[bucket]) ratingBuckets[bucket] = 0;
    ratingBuckets[bucket]++;
  });
  return ratingBuckets;
};

const mostDifficultProblem = (submissions) => {
  let hardest = null;
  for (const sub of submissions) {
    if (sub.verdict !== "OK" || !sub.problem.rating) continue;
    if (!hardest || sub.problem.rating > hardest.problem.rating) hardest = sub;
  }
  return hardest ? hardest.problem : null;
};

const countUniqueProblems = (submissions) => {
  const problems = new Set();
  submissions.forEach((sub) => {
    if (sub.verdict === "OK") {
      problems.add(`${sub.problem.contestId}-${sub.problem.index}`);
    }
  });
  return problems.size;
};

const generateHeatmap = (submissions) => {
  const heatmap = {};
  submissions.forEach((sub) => {
    const date = new Date(sub.creationTimeSeconds * 1000)
      .toISOString()
      .split("T")[0];
    if (!heatmap[date]) heatmap[date] = { total: 0, correct: 0 };
    heatmap[date].total += 1;
    if (sub.verdict === "OK") heatmap[date].correct += 1;
  });
  return heatmap;
};

// ── Compute tag stats from deduplicated solved problems ───────────────────────
// Input: solvedProblems array already built in computeUserStats
// Each entry: { name, rating, tags[] }
// Returns: [ { tag, solved, avgRating, maxRating } ] sorted by solved desc
const computeTagStats = (solvedProblems) => {
  const tagMap = {};
  solvedProblems.forEach((problem) => {
    (problem.tags || []).forEach((tag) => {
      if (!tagMap[tag])
        tagMap[tag] = { tag, solved: 0, totalRating: 0, maxRating: 0 };
      tagMap[tag].solved += 1;
      if (problem.rating) {
        tagMap[tag].totalRating += problem.rating;
        tagMap[tag].maxRating = Math.max(tagMap[tag].maxRating, problem.rating);
      }
    });
  });
  return Object.values(tagMap)
    .map((t) => ({
      tag: t.tag,
      solved: t.solved,
      avgRating: t.solved ? Math.round(t.totalRating / t.solved) : 0,
      maxRating: t.maxRating,
    }))
    .sort((a, b) => b.solved - a.solved);
};

const calculateConsistencyScore = (heatmap = {}) => {
  const entries = Object.entries(heatmap);

  if (!entries.length) return 0;

  const activeDays = entries.filter(([_, value]) => value.total > 0).length;

  const totalSubmissions = entries.reduce(
    (sum, [_, value]) => sum + value.total,
    0,
  );

  const avgPerDay = activeDays > 0 ? totalSubmissions / activeDays : 0;

  let streak = 0;
  let longestStreak = 0;

  const sortedDates = entries
    .map(([date]) => new Date(date))
    .sort((a, b) => a - b);

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  const score = Math.min(
    100,
    Math.round(activeDays * 0.45 + avgPerDay * 12 + longestStreak * 2),
  );
  return score;
};

const buildSkillProgression = (solved) => {
  const monthly = {};

  solved.forEach((sub) => {
    if (!sub.problem?.rating) return;

    const date = new Date(sub.creationTimeSeconds * 1000);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;

    if (!monthly[key]) {
      monthly[key] = {
        totalRating: 0,
        solved: 0,
      };
    }

    monthly[key].totalRating += sub.problem.rating;
    monthly[key].solved += 1;
  });

  return Object.entries(monthly)
    .map(([month, data]) => ({
      month,
      avgRating: Math.round(data.totalRating / data.solved),
      solved: data.solved,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

const generatePersona = ({ consistencyScore, hardestRating, totalSolved }) => {
  if (hardestRating >= 3000) {
    return "Legendary Problem Hunter";
  }

  if (hardestRating >= 2200) {
    return "High Difficulty Explorer";
  }

  if (consistencyScore >= 75) {
    return "Consistency Grinder";
  }

  if (totalSolved >= 500) {
    return "Dedicated Solver";
  }

  return "Casual Problem Solver";
};

const buildWeakTopics = (submissions) => {
  const topicStats = {};

  submissions.forEach((sub) => {
    if (!sub.problem?.tags) return;

    sub.problem.tags.forEach((tag) => {
      if (!topicStats[tag]) {
        topicStats[tag] = {
          attempts: 0,
          accepted: 0,
        };
      }

      topicStats[tag].attempts++;

      if (sub.verdict === "OK") {
        topicStats[tag].accepted++;
      }
    });
  });

  return Object.entries(topicStats)
    .map(([tag, stats]) => ({
      tag,
      acceptance:
        stats.attempts > 0
          ? Math.round((stats.accepted / stats.attempts) * 100)
          : 0,
      attempts: stats.attempts,
    }))
    .filter((t) => t.attempts >= 5)
    .sort((a, b) => a.acceptance - b.acceptance)
    .slice(0, 5);
};

const calculateLearningVelocity = (progression = []) => {
  if (progression.length < 2) return 0;

  const first = progression[0].avgRating;
  const last = progression[progression.length - 1].avgRating;

  return last - first;
};

const detectBurnoutRisk = (heatmap = {}) => {
  const entries = Object.entries(heatmap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([_, value]) => value.total);

  if (entries.length < 14) return false;

  const recent = entries.slice(-7).reduce((a, b) => a + b, 0);
  const previous = entries.slice(-14, -7).reduce((a, b) => a + b, 0);

  return previous > 0 && recent < previous * 0.5;
};

const predictRating = (currentRating, consistencyScore, learningVelocity) => {
  return Math.round(
    currentRating + consistencyScore * 0.8 + learningVelocity * 0.25,
  );
};

const buildContestInsights = (contests = []) => {
  if (!contests.length) {
    return null;
  }

  const bestGain = [...contests].sort(
    (a, b) => b.ratingChange - a.ratingChange,
  )[0];

  const worstDrop = [...contests].sort(
    (a, b) => a.ratingChange - b.ratingChange,
  )[0];

  const avgRank = Math.round(
    contests.reduce((s, c) => s + c.rank, 0) / contests.length,
  );

  return {
    bestGain,
    worstDrop,
    avgRank,
  };
};

exports.computeUserStats = async (handle, days = 30) => {
  const submissions = await fetchUserSubmission(handle);
  const filtered = filterByDate(submissions, days);
  const solved = filtered.filter((sub) => sub.verdict === "OK");

  // Deduplicate solved problems — your original logic, unchanged
  const solvedMap = new Map();
  solved.forEach((sub) => {
    const problem = sub.problem;
    if (!problem) return;
    const key = `${problem.contestId}-${problem.index}`;
    if (!solvedMap.has(key)) {
      solvedMap.set(key, {
        name: problem.name,
        rating: problem.rating || 0,
        tags: problem.tags || [],
      });
    }
  });

  const solvedProblems = Array.from(solvedMap.values());
  const tagStats = computeTagStats(solvedProblems);
  const totalSolved = countUniqueProblems(solved);
  const heatmap = generateHeatmap(filtered);

  const hardest = mostDifficultProblem(solved);

  const consistencyScore = calculateConsistencyScore(heatmap);

  const persona = generatePersona({
    consistencyScore,
    hardestRating: hardest?.rating || 0,
    totalSolved,
  });

  const skillProgression = buildSkillProgression(solved);

  const weakTopics = buildWeakTopics(filtered);

  const learningVelocity = calculateLearningVelocity(skillProgression);

  const burnoutRisk = detectBurnoutRisk(heatmap);

  const predictedRating = predictRating(
    hardest?.rating || 0,
    consistencyScore,
    learningVelocity,
  );

  const averageDays =
    days === "all"
      ? Math.max(
          1,
          Math.ceil(
            (Date.now() -
              Math.min(
                ...filtered.map((sub) => sub.creationTimeSeconds * 1000),
                Date.now(),
              )) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : Number(days);

  return {
    totalSolved,
    hardestProblem: hardest,
    ratingBuckets: groupByRating(solved),
    averagePerDay: (totalSolved / averageDays).toFixed(2),
    totalSubmissions: filtered.length,
    submissionHeatmap: heatmap,
    solvedProblems,
    tagStats,
    consistencyScore,
    persona,
    skillProgression,
    weakTopics,
    learningVelocity,
    burnoutRisk,
    predictedRating,
  };
};
