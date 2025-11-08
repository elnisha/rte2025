import { BrowserRouter as Router, Routes, Route, Form } from "react-router-dom";
import Home from "./pages/Home";
import Transcription from "./pages/Transcription";
import DashboardLayout from "./components/layout/DashboardLayout";
import Reports from "./pages/Reports";
import DashboardInfo from "./pages/DashboardInfo";
import Analytics from "./pages/Analytics";
import ListTemplates from "./pages/ListTemplates";
import FormTemplates from "./pages/FormTemplates";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transcription" element={<Transcription />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="" element={<DashboardInfo />} />
          <Route path="reports" element={<Reports />} />
          <Route path="form-templates" element={<ListTemplates />} />
          <Route path="form-templates/create" element={<FormTemplates />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
