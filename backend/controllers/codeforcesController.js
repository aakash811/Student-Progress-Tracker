const Student = require("../models/Student");
const codeforcesService = require("../services/codeforcesService");
const axios = require("axios");
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const getLastActiveDate = (submissions) => {
  const last = submissions
    .filter((sub) => sub.verdict === "OK")
    .sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds)[0];
  return last ? new Date(last.creationTimeSeconds * 1000) : null;
};

// Contest problems never change once a contest ends — cache forever (7 days TTL)
const getProblemsInContest = async (contestId) => {
  const cacheKey = `cf:contest-problems:${contestId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
  } catch (err) {
    console.warn(`[Cache] Redis GET failed for ${cacheKey}:`, err.message);
  }

  try {
    const res = await axios.get(
      `https://codeforces.com/api/contest.standings`,
      {
        params: {
          contestId,
          from: 1,
          count: 1,
        },
      },
    );

    if (res.data.status !== "OK") {
      return 0;
    }
    const count = res.data.result?.problems?.length || 0;

    try {
      await redis.set(cacheKey, count, {
        ex: 60 * 60 * 24 * 7,
      });
    } catch (err) {
      console.warn(`[Cache] Redis SET failed for ${cacheKey}:`, err.message);
    }
    return count;
  } catch (err) {
    if (err.response?.status !== 400) {
      console.error(
        `Failed to fetch contest problems for ${contestId}:`,
        err.message,
      );
    }
    try {
      await redis.set(cacheKey, 0, {
        ex: 60 * 60 * 6,
      });
    } catch {}

    return 0;
  }
};

const getSolvedInContest = (submissions, contestId) => {
  const solvedSet = new Set();
  submissions.forEach((sub) => {
    if (sub.verdict === "OK" && sub.problem.contestId === contestId) {
      solvedSet.add(sub.problem.index);
    }
  });
  return solvedSet.size;
};

// ── Controllers ───────────────────────────────────────────────────────────────

exports.syncCodeforcesData = async (req, res) => {
  try {
    const handle = req.params.handle;

    // Invalidate cache so sync always fetches fresh data
    await codeforcesService.invalidateUserCache(handle);

    const [userInfo, userContest, userSubmission] = await Promise.all([
      codeforcesService.fetchUserInfo(handle),
      codeforcesService.fetchUserContest(handle),
      codeforcesService.fetchUserSubmission(handle),
    ]);

    const updatedStudent = await Student.findOneAndUpdate(
      { codeforcesHandle: handle },
      {
        currRating: userInfo.rating || 0,
        rank: userInfo.rank || "Newbie",
        maxRating: userInfo.maxRating || 0,
        lastSyncedAt: new Date(),
        contestData: userContest,
        submissions: userSubmission,
        lastActiveAt: getLastActiveDate(userSubmission),
      },
      { new: true },
    );

    if (!updatedStudent) {
      return res
        .status(404)
        .json({ error: "No student found with the given Codeforces handle" });
    }

    res.json({
      message: "Codeforces data synced successfully",
      student: updatedStudent,
    });
  } catch (err) {
    console.error("Error syncing Codeforces data:", err);
    res.status(500).json({ error: "Failed to sync Codeforces data" });
  }
};

exports.getCodeforcesStats = async (req, res) => {
  try {
    const handle = req.params.handle;
    const days = req.query.days === "all" ? "all" : parseInt(req.query.days) || 30;
    const userStats = await codeforcesService.computeUserStats(handle, days);
    res.json(userStats);
  } catch (err) {
    console.error("Error computing user stats:", err);
    res.status(500).json({ error: "Failed to compute user stats" });
  }
};

exports.getContestStats = async (req, res) => {
  try {
    const { handle } = req.params;
    const days = req.query.days || "all";

    // FULL RESPONSE CACHE
    const fullCacheKey = `cf:contest-history:${handle}:${days}`;

    try {
      const cached = await redis.get(fullCacheKey);

      if (cached) {
        console.log(`[Cache HIT] ${fullCacheKey}`);
        return res.json(cached);
      }

      console.log(`[Cache MISS] ${fullCacheKey}`);
    } catch (err) {
      console.warn(
        `[Cache] Redis GET failed for ${fullCacheKey}:`,
        err.message,
      );
    }

    const student = await Student.findOne({
      codeforcesHandle: handle,
    });

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    let filteredContests = student.contestData || [];

    if (days !== "all") {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      filteredContests = filteredContests.filter(
        (c) => new Date(c.ratingUpdateTimeSeconds * 1000) >= cutoffDate,
      );
    }

    const submissions = student.submissions || [];

    // PRECOMPUTE SOLVED COUNTS
    const solvedByContest = {};

    submissions.forEach((sub) => {
      if (sub.verdict === "OK" && sub.problem?.contestId) {
        const cid = sub.problem.contestId;

        if (!solvedByContest[cid]) {
          solvedByContest[cid] = new Set();
        }

        solvedByContest[cid].add(sub.problem.index);
      }
    });

    const contestStats = [];

    // Process sequentially but MUCH faster
    for (const c of filteredContests) {
      const date = new Date(c.ratingUpdateTimeSeconds * 1000)
        .toISOString()
        .split("T")[0];

      // contest problem count cache
      const totalProblems = await getProblemsInContest(c.contestId);

      const solved = solvedByContest[c.contestId]?.size || 0;

      contestStats.push({
        contestId: c.contestId,
        contestName: c.contestName,
        date,
        rank: c.rank,
        oldRating: c.oldRating,
        newRating: c.newRating,
        ratingChange: c.newRating - c.oldRating,
        solvedProblems: solved,
        totalProblems,
        unsolvedProblems: Math.max(totalProblems - solved, 0),
      });
    }

    const response = {
      contestStats,
    };

    // CACHE FINAL RESPONSE
    try {
      await redis.set(fullCacheKey, response, {
        ex: 60 * 60 * 12, // 12h
      });
    } catch (err) {
      console.warn(
        `[Cache] Redis SET failed for ${fullCacheKey}:`,
        err.message,
      );
    }

    return res.json(response);
  } catch (err) {
    console.error("Error in getContestStats:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
