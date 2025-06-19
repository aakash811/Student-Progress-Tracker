const cron = require('node-cron');
const Student = require('../models/Student');
const codeforcesService = require("../services/codeforcesService");
const {sendInactivityEmail} = require("../utils/mailer.js")

const getLastActiveDate = (submissions) => {
    const LastSubmission = submissions
        .filter(sub => sub.verdict == 'OK')
        .sort((a, b) => b.creationTimeSeconds * 1000 - a.creationTimeSeconds * 1000)[0];

    return LastSubmission ? new Date(LastSubmission.creationTimeSeconds * 1000) : null;
}

const scheduleCodeforcesSync = () => {
  const SCHEDULE = process.env.CF_CRON_SCHEDULE || '0 2 * * *';

  cron.schedule(SCHEDULE, async () => {
    console.log(`\n[Codeforces Sync] Started at ${new Date().toLocaleString()}`);

    const students = await Student.find({});
    let updatedCount = 0, emailsSent = 0;

    for (const student of students) {
      try {
        const handle = student.codeforcesHandle;

        const [userInfo, userContest, userSubmission] = await Promise.all([
          codeforcesService.fetchUserInfo(handle),
          codeforcesService.fetchUserContest(handle),
          codeforcesService.fetchUserSubmission(handle),
        ]);

        const lastActiveDate = getLastActiveDate(userSubmission);
        const inactiveDays = (Date.now() - lastActiveDate) / (1000 * 60 * 60 * 24);

        await Student.findByIdAndUpdate(student._id, {
          currRating: userInfo.rating || 0,
          rank: userInfo.rank || 'Newbie',
          maxRating: userInfo.maxRating || 0,
          lastSyncedAt: new Date(),
          contestData: userContest,
          submissions: userSubmission,
          lastActiveAt: lastActiveDate
        });

        updatedCount++;

        if (
          inactiveDays >= 7 &&
          student.emailRemindersSent === 0 &&
          !student.emailRemindersDisabled
        ) {
          await sendInactivityEmail(student.email, student.name);
          student.emailRemindersSent += 1;
          await student.save();
          emailsSent++;
          console.log(`Sent inactivity email to ${student.name} (${student.email})`);
        }

        console.log(`✅ Synced: ${handle}`);
      } catch (err) {
        console.error(`❌ Error syncing ${student.codeforcesHandle}:`, err.message);
      }
    }

    console.log(`[Codeforces Sync] Completed. ${updatedCount} updated, ${emailsSent} emails sent.`);
  });
};

module.exports = scheduleCodeforcesSync;