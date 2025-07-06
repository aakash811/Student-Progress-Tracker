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

- Walkthrough Video: [![Watch the demo](/frontend/src/assets/Student-Table.png)](https://www.loom.com/share/ed551d3497504b9483b3f057c23e2362?sid=d0c5bdbc-3418-483e-b0f5-8f358cef05b2)
- Students Table: ![Student Table](/frontend/src/assets/Student-Table.png)
- Sample Student Dashboard: ![Student Dashboard](/frontend/src/assets/Student-Details.png)
- Contest Rating Chart: ![Student Graph](/frontend/src/assets/Student-Graph.png)

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
```

### 2. Setup the Backend
```bash
cd backend
```        

Create a .env file inside the backend/ directory with the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CODEFORCES_API_BASE=https://codeforces.com/api
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```
⚠️ Note: Never commit .env files to version control.

Install backend dependencies:

```bash
npm install
```

Start the backend server:
```bash
npx nodemon index.js
```

### 1. Setup the Frontend
```bash
cd ../frontend
```
Install frontend dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```

Now open your browser at http://localhost:5173 to view the app.
