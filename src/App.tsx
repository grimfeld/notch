import { useState } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { LoginDialog } from "@/components/LoginDialog";
import { Dashboard } from "@/screens/Dashboard";
import { StatDetail } from "@/screens/StatDetail";
import { StatEditor } from "@/screens/StatEditor";
import { useQueueFlusher } from "@/lib/hooks";
import { isAuthed } from "@/lib/pb";

function Shell() {
  useQueueFlusher();
  const [authed, setAuthed] = useState(isAuthed);

  return (
    <>
      <LoginDialog open={!authed} onLoggedIn={() => setAuthed(true)} />
      {authed ? (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<StatEditor />} />
          <Route path="/stat/:id" element={<StatDetail />} />
          <Route path="/stat/:id/edit" element={<StatEditor />} />
        </Routes>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
