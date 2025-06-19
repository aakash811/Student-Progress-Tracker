const axios = require('axios');
const BASE_URL = "https://codeforces.com/api/";

exports.fetchUserInfo = async (handle) => {
    const res = await axios.get(`${BASE_URL}/user.info?handles=${handle}`);
    return res.data.result[0];
};

exports.fetchUserContest = async (handle) => {
    const res = await axios.get(`${BASE_URL}/user.rating?handle=${handle}`);
    return res.data.result;
};

const fetchUserSubmission = async (handle) => {
    const res = await axios.get(`${BASE_URL}/user.status?handle=${handle}&from=1&count=10000`);
    return res.data.result;
};
exports.fetchUserSubmission = fetchUserSubmission;

const filterByDate = (submissions, days) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return submissions.filter(sub => sub.creationTimeSeconds * 1000 >= cutoff);
};

const groupByRating = (submissions) => {
    const ratingBuckets = {};
    submissions.forEach(sub => {
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
        if (sub.verdict !== 'OK' || !sub.problem.rating) continue;
        if (!hardest || sub.problem.rating > hardest.problem.rating) {
            hardest = sub;
        }
    }
    return hardest ? hardest.problem : null;
};

const countUniqueProblems = (submissions) => {
    const problems = new Set();
    submissions.forEach(sub => {
        if (sub.verdict === 'OK') {
            const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
            problems.add(problemId);
        }
    });
    return problems.size;
};

const computeAveragePerDay = (total, days) => {
    return (total / days).toFixed(2);
};

const generateHeatmap = (submissions) => {
    const heatmap = {};

    submissions.forEach(sub => {
        const date = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0];
        if (!heatmap[date]) {
            heatmap[date] = { total: 0, correct: 0 };
        }
        heatmap[date].total += 1;
        if (sub.verdict === 'OK') {
            heatmap[date].correct += 1;
        }
    });

    return heatmap;
};

exports.computeUserStats = async (handle, days = 30) => {
    const submissions = await fetchUserSubmission(handle);
    const filtered = filterByDate(submissions, days);
    const solved = filtered.filter(sub => sub.verdict === 'OK');

    const totalSolved = countUniqueProblems(solved);
    const hardestProblem = mostDifficultProblem(solved);
    const ratingBuckets = groupByRating(solved);
    const avgPerDay = computeAveragePerDay(totalSolved, days);
    
    return {
        totalSolved,
        hardestProblem,
        ratingBuckets,
        averagePerDay: avgPerDay,
        totalSubmissions: filtered.length,
        submissionHeatmap: generateHeatmap(filtered)
    };
};