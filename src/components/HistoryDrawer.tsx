import { useCallback, useEffect, useState } from "react";
import { type Job } from "../lib/jobs";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 20;

const statusBadge: Record<Job["status"], { label: string; classes: string }> = {
  pending:    { label: "Pending",    classes: "bg-yellow-100 text-yellow-700" },
  processing: { label: "Processing", classes: "bg-blue-100 text-blue-700" },
  done:       { label: "Done",       classes: "bg-green-100 text-green-700" },
  error:      { label: "Error",      classes: "bg-red-100 text-red-700" },
};

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

function toolLabel(toolId: string): string {
  return toolId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="w-14 h-5 bg-gray-100 rounded-full" />
    </div>
  );
}

export function HistoryDrawer({ isOpen, onClose }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchJobs = useCallback(async (startOffset = 0, replace = true) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setJobs([]);
        setHasMore(false);
        return;
      }

      // Fetch PAGE_SIZE + 1 rows to detect whether more pages exist.
      // .range() is inclusive: range(0, PAGE_SIZE) returns PAGE_SIZE+1 rows.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(startOffset, startOffset + PAGE_SIZE); // inclusive: returns up to PAGE_SIZE+1 rows

      const rows: Job[] = data ?? [];
      // If we got PAGE_SIZE+1 rows, there are more beyond this page
      const moreExists = rows.length > PAGE_SIZE;
      const display = moreExists ? rows.slice(0, PAGE_SIZE) : rows;

      setJobs((prev) => replace ? display : [...prev, ...display]);
      setHasMore(moreExists);
      setOffset(startOffset + display.length);
    } catch {
      setJobs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOffset(0);
      fetchJobs(0, true);
    }
  }, [isOpen, fetchJobs]);

  const handleLoadMore = () => {
    fetchJobs(offset, false);
  };

  const handleRedownload = (job: Job) => {
    if (!job.output_path) return;
    // Processed files are generated client-side and not persisted to storage.
    // Re-download is only possible within the same browser session via an object URL
    // stored in metadata.blobUrl at processing time.
    const blobUrl = job.metadata?.blobUrl as string | undefined;
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = job.output_path;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    alert("Re-download is only available for files processed in this browser session.");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[90] w-full max-w-sm bg-white shadow-2xl flex flex-col
          transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h2 className="font-bold text-gray-800">Job History</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setOffset(0); fetchJobs(0, true); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {loading && jobs.length === 0 ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
              <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="font-semibold text-sm">No jobs yet</p>
              <p className="text-xs text-center max-w-[180px]">
                Use any tool to start processing files. Your history will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.map((job) => {
                const badge = statusBadge[job.status];
                const fileNames = job.input_paths ?? [];
                return (
                  <div key={job.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition group">
                    {/* Tool icon placeholder */}
                    <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {toolLabel(job.tool)}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                      {fileNames.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {fileNames.slice(0, 2).join(", ")}
                          {fileNames.length > 2 && ` +${fileNames.length - 2} more`}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">{relativeTime(job.created_at)}</p>
                    </div>

                    {/* Re-download for done jobs */}
                    {job.status === "done" && job.output_path && (
                      <button
                        onClick={() => handleRedownload(job)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-green-50 text-green-500"
                        title="Re-download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLoadMore}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Load 20 more
            </button>
          </div>
        )}

        {loading && jobs.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
