const { parse } = require("dotenv");
const Student = require("../models/Student");
const codeforcesService = require("../services/codeforcesService");
const { subDays } = require("date-fns");
const axios = require("axios");

const getLastActiveDate = (submissions) => {
    const LastSubmission = submissions
        .filter(sub => sub.verdict === 'OK')
        .sort((a, b) => b.creationTimeSeconds * 1000 - a.creationTimeSeconds * 1000)[0];

    return LastSubmission ? new Date(LastSubmission.creationTimeSeconds * 1000) : null;
}

const getProblemsInContest = async(contestId) => {
    try{
        const res = await axios.get(`https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1000`);
        // console.log(res.data.result.problems.length);
        return res.data.result.problems.length;
  } catch (err) {
    console.error("Failed to fetch contest problems:", err.message);
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

exports.syncCodeforcesData = async (req, res) => {
    try {
        const hour = new Date().getHours();
        if (hour >= 8 && hour < 22) {
            return res.status(429).json({ error: "Real-time sync not allowed during user hours (8 AM - 10 PM)." });
        }

        const handle = req.params.handle;
        const userInfo = await codeforcesService.fetchUserInfo(handle);
        const userContest = await codeforcesService.fetchUserContest(handle);
        const userSubmission = await codeforcesService.fetchUserSubmission(handle);

        // console.log(userInfo);

        const updateStudent = await Student.findOneAndUpdate(
            { codeforcesHandle: handle },
            {
                currRating: userInfo.rating || 0,
                rank: userInfo.rank || 'Newbie',
                maxRating: userInfo.maxRating || 0,
                lastSyncedAt: new Date(),
                contestData: userContest,
                submissions: userSubmission,
                lastActiveAt: getLastActiveDate(userSubmission)
            },
            {new: true}
        );

        if(!updateStudent) {
            return res.status(404).json({ error: "No student found with the given Codeforces handle" });
        }

        res.json({
            message: "Codeforces data synced successfully",
            student: updateStudent
        })
    } catch (err) {
        console.error("Error syncing Codeforces data:", err);
        res.status(500).json({ error: "Failed to sync Codeforces data" });
    }
};

exports.getCodeforcesStats = async (req, res) => {
    try {
        const handle = req.params.handle;
        const days = parseInt(req.query.days) || 30;

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
        const days = req.query.days;

        const student = await Student.findOne({ codeforcesHandle: handle });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        let filteredContests = student.contestData || [];

        if (days !== 'all') {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
            filteredContests = filteredContests.filter(c => {
                const date = new Date(c.ratingUpdateTimeSeconds * 1000);
                return date >= cutoffDate;
            });
        }

        const contestStats = await Promise.all(
            filteredContests.map(async (c) => {
                const date = new Date(c.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0];
                const totalProblems = await getProblemsInContest(c.contestId);
                const solved = getSolvedInContest(student.submissions || [], c.contestId);
                return {
                    contestId: c.contestId,
                    contestName: c.contestName,
                    date,
                    rank: c.rank,
                    oldRating: c.oldRating,
                    newRating: c.newRating,
                    ratingChange: c.newRating - c.oldRating,
                    unsolvedProblems: Math.max(totalProblems - solved, 0),
                };
            })
        );

        res.json({ contestStats });
    } catch (err) {
        console.error("Error in getContestStats:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
