# Student Progress Management System 📊

A full-stack MERN application to track and analyze students' competitive programming progress on **Codeforces**, with daily sync, inactivity detection, rating statistics, submission heatmaps, and personalized dashboards.

---

## 🚀 Features

- **Student CRUD**: Add, edit, delete, and view students.
- **Codeforces Sync**: Automatically fetch Codeforces profile, contest, and submission data daily using a cron job.
- **Manual Sync**: Option to manually trigger sync from the UI.
- **Submission Heatmap**: Visualize submission activity over time.
- **Contest History**: Chart rating changes and contest performance.
- **Rating Buckets**: Distribution of solved problems by difficulty.
- **Dark/Light Mode**: Toggle UI theme.
- **Inactivity Detection**: Send reminder emails to inactive users.
- **Responsive UI**: Built with TailwindCSS, Shadcn/UI, and Recharts.
- **Editable Cron Settings**: Easily configure sync time and frequency.

---

## 🛠️ Tech Stack

**Frontend**:
- React + Vite
- TailwindCSS + Shadcn/UI
- Recharts (for charts)
- Axios

**Backend**:
- Node.js + Express
- MongoDB + Mongoose
- Node-cron (for scheduled tasks)
- Nodemailer (for email alerts)
- Codeforces Public API

---

## 📁 Folder Structure
```
root/
├── frontend/ # React UI
│ ├── src/
│ │ ├── components/ # UI components
│ │ └── pages/ # Pages and routing
│
├── backend/
│ ├── controllers/ # API logic
│ ├── routes/ # Express routes
│ ├── services/ # Codeforces API service
│ ├── cron/ # Codeforces sync cron job
│ └── models/ # MongoDB data models
```

---

## 📷 Demo Preview

- Walkthrough Video: [YouTube Link or Local Path]
- Sample Student Dashboard
- Submission Heatmap
- Contest Rating Chart

---

## ⚙️ Setup Instructions

### Prerequisites

- Node.js v18+
- MongoDB (local or cloud)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/student-progress-tracker.git
cd student-progress-tracker
