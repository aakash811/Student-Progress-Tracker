const codeforcesService = require('../services/codeforcesService');
const Student = require('../models/Student');

const getLastActiveDate = (submissions) => {
    const LastSubmission = submissions
        .filter(sub => sub.verdict == 'OK')
        .sort((a, b) => b.creationTimeSeconds * 1000 - a.creationTimeSeconds * 1000)[0];

    return LastSubmission ? new Date(LastSubmission.creationTimeSeconds * 1000) : null;
}

const syncStudentByHandle = async (handle) => {
  const userInfo = await codeforcesService.fetchUserInfo(handle);
  const userContest = await codeforcesService.fetchUserContest(handle);
  const userSubmission = await codeforcesService.fetchUserSubmission(handle);

  const updatedStudent = await Student.findOneAndUpdate(
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
    { new: true }
  );

  return updatedStudent;
};

module.exports = syncStudentByHandle;
