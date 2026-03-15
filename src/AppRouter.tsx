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
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0F0F0F]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
      </div>
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
