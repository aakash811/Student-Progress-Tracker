import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StudentTable from "./pages/studentTable";
import { ThemeProvider } from "@/components/theme-provider"
import StudentStats from "./pages/StudentStats";

function App(){
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<StudentTable/>} />
          <Route path="/student/:handle" element={<StudentStats />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App;