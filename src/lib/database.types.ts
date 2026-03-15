export type JobStatus = "pending" | "processing" | "done" | "error";
export type JobTool =
  | "merge"
  | "split"
  | "compress"
  | "rotate"
  | "reorder"
  | "add-pages"
  | "jpg-to-pdf"
  | "word-to-pdf"
  | "powerpoint-to-pdf"
  | "excel-to-pdf"
  | "html-to-pdf"
  | "pdf-to-jpg"
  | "pdf-to-word"
  | "pdf-to-ppt"
  | "pdf-to-excel"
  | "edit-pdf"
  | "watermark"
  | "sign"
  | "annotate"
  | "protect"
  | "unlock"
  | "ocr"
  | "page-numbers";

export interface Job {
  id: string;
  user_id: string | null;
  tool: JobTool;
  status: JobStatus;
  progress: number;
  input_paths: string[];
  output_path: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "premium" | "team";
  jobs_this_month: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Job, "id" | "created_at">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "stripe_customer_id" | "stripe_subscription_id" | "subscription_status" | "current_period_end">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_status: JobStatus;
    };
  };
}
