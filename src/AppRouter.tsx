import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { App } from "./App";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ApiPage = lazy(() => import("./pages/ApiPage"));
const MergePdfPage = lazy(() => import("./pages/MergePdfPage"));
const CompressPdfPage = lazy(() => import("./pages/CompressPdfPage"));
const PdfToWordPage = lazy(() => import("./pages/PdfToWordPage"));

function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--white)" }}>
      <div style={{ width: 32, height: 32, border: "2px solid var(--gray-200)", borderTopColor: "var(--red)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/api" element={<ApiPage />} />
        <Route path="/merge-pdf" element={<MergePdfPage />} />
        <Route path="/compress-pdf" element={<CompressPdfPage />} />
        <Route path="/pdf-to-word" element={<PdfToWordPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </Suspense>
  );
}
