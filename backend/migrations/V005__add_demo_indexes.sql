CREATE INDEX idx_jobs_employer_created
    ON public.job_posts (employer_id, created_at DESC);

CREATE INDEX idx_jobs_category
    ON public.job_posts (category_id);

CREATE INDEX idx_jobs_status_created
    ON public.job_posts (status, created_at DESC);

CREATE INDEX idx_apps_job_status
    ON public.applications (job_id, status);

CREATE INDEX idx_apps_student_applied
    ON public.applications (student_id, applied_at DESC);

CREATE INDEX idx_reviews_reviewee
    ON public.reviews (reviewee_id);

CREATE INDEX idx_reviews_reviewer
    ON public.reviews (reviewer_id);
