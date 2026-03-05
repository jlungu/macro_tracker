import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/layout/BottomNav";
import DashboardPage from "@/pages/DashboardPage";
import LogPage from "@/pages/LogPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-full max-w-lg mx-auto relative">
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomNav />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
