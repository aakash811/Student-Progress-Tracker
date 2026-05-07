const Student = require("../models/Student");
const codeforcesService = require("../services/codeforcesService");
const { sendInactivityEmail } = require("../utils/mailer");

const getLastActiveDate = (submissions) => {
  const last = submissions
    .filter((sub) => sub.verdict === "OK")
    .sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds)[0];
  return last ? new Date(last.creationTimeSeconds * 1000) : null;
};

const runCodeforcesSync = async () => {
  console.log(`\n[Sync] Started at ${new Date().toLocaleString()}`);

  const students = await Student.find({});
  let updatedCount = 0;
  let emailsSent = 0;

  for (const student of students) {
    const handle = student.codeforcesHandle;
    try {
      // Fetch fresh data from Codeforces (bypasses Redis for sync runs
      // by invalidating cache first, so students always get fresh data)
      await codeforcesService.invalidateUserCache(handle);

      const [userInfo, userContest, userSubmission] = await Promise.all([
        codeforcesService.fetchUserInfo(handle),
        codeforcesService.fetchUserContest(handle),
        codeforcesService.fetchUserSubmission(handle),
      ]);

      const lastActiveDate = getLastActiveDate(userSubmission);
      const inactiveDays = lastActiveDate
        ? (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

      await Student.findByIdAndUpdate(student._id, {
        currRating: userInfo.rating || 0,
        rank: userInfo.rank || "Newbie",
        maxRating: userInfo.maxRating || 0,
        lastSyncedAt: new Date(),
        contestData: userContest,
        submissions: userSubmission,
        lastActiveAt: lastActiveDate,
      });

      updatedCount++;

      // Send inactivity email once per streak of inactivity
      if (
        inactiveDays >= 7 &&
        student.emailRemindersSent === 0 &&
        !student.emailRemindersDisabled
      ) {
        const sent = await sendInactivityEmail(student.email, student.name);
        if (sent) {
          await Student.findByIdAndUpdate(student._id, {
            $inc: { emailRemindersSent: 1 },
          });
          emailsSent++;
          console.log(`[Sync] Inactivity email sent → ${student.name}`);
        }
      }

      // Reset email counter if student became active again
      if (inactiveDays < 7 && student.emailRemindersSent > 0) {
        await Student.findByIdAndUpdate(student._id, {
          emailRemindersSent: 0,
        });
      }

      console.log(
        `✅ Synced: ${handle} (inactive ${Math.floor(inactiveDays)}d)`,
      );
    } catch (err) {
      console.error(`❌ Error syncing ${handle}:`, err.message);
    }
  }

  console.log(
    `[Sync] Done — ${updatedCount} updated, ${emailsSent} emails sent.\n`,
  );
  return { updatedCount, emailsSent };
};

module.exports = { runCodeforcesSync };
