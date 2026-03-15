import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { App } from "./App";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MergePdfPage = lazy(() => import("./pages/MergePdfPage"));
const CompressPdfPage = lazy(() => import("./pages/CompressPdfPage"));
const PdfToWordPage = lazy(() => import("./pages/PdfToWordPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/merge-pdf" element={<MergePdfPage />} />
        <Route path="/compress-pdf" element={<CompressPdfPage />} />
        <Route path="/pdf-to-word" element={<PdfToWordPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </Suspense>
  );
}
