import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

import StudentTable from "./pages/StudentTable";
import StudentStats from "./pages/StudentStats";
import { ThemeProvider } from "@/components/theme-provider";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE}/api/students`);

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.students || [];

      setStudents(data);

    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <StudentTable
                students={students}
                loading={loading}
                fetchStudents={fetchStudents}
                setStudents={setStudents}
              />
            }
          />

          <Route
            path="/student/:handle"
            element={<StudentStats />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;