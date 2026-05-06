const axios = require("axios");
const { Redis } = require("@upstash/redis");

// ── Upstash Redis client ──────────────────────────────────────────────────────
// Requires two env vars in Render:
//   UPSTASH_REDIS_REST_URL   → from Upstash console → REST API → URL
//   UPSTASH_REDIS_REST_TOKEN → from Upstash console → REST API → Token
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache TTL constants (seconds)
const TTL_USER_INFO = 60 * 60 * 6; // 6 hours  — rating/rank changes rarely
const TTL_CONTESTS = 60 * 60 * 6; // 6 hours
const TTL_SUBMISSIONS = 60 * 60 * 2; // 2 hours  — submissions change more often

// ── Fix: BASE_URL must NOT end with slash ────────────────────────────────────
// Previously was "https://codeforces.com/api/" which caused double-slash URLs
// like /api//user.info — Codeforces returns 404 for those intermittently.
const BASE_URL = "https://codeforces.com/api";

// ── Generic cached fetch helper ───────────────────────────────────────────────
// Checks Redis first. On miss, calls fetcher(), stores result, returns it.
const cachedFetch = async (cacheKey, ttl, fetcher) => {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      // Upstash REST returns already-parsed JSON
      return cached;
    }
  } catch (err) {
    // Redis failure should never break the app — fall through to live fetch
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

// ── Codeforces API fetchers ───────────────────────────────────────────────────

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

// ── Cache invalidation — call this after a manual sync ───────────────────────
// So the next page load reflects fresh data immediately.
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

// ── Stats computation (unchanged logic, no caching needed — computed locally) ─

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

exports.computeUserStats = async (handle, days = 30) => {
  const submissions = await fetchUserSubmission(handle);
  const filtered = filterByDate(submissions, days);
  const solved = filtered.filter((sub) => sub.verdict === "OK");

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

  const totalSolved = countUniqueProblems(solved);
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
      : days;

  return {
    totalSolved,
    hardestProblem: mostDifficultProblem(solved),
    ratingBuckets: groupByRating(solved),
    averagePerDay: (totalSolved / averageDays).toFixed(2),
    totalSubmissions: filtered.length,
    submissionHeatmap: generateHeatmap(filtered),
    solvedProblems,
  };
};
