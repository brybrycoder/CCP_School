import { useEffect, useRef, useState } from "react";
import { getJob } from "../lib/daasApi";
import type { JobObject } from "../contracts/daas.types";

const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED"]);

export function useJobPoll(jobId: string | null): {
  job: JobObject | null;
  error: string | null;
  isPolling: boolean;
} {
  const [job, setJob] = useState<JobObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      setIsPolling(false);
      return;
    }

    let isMounted = true;

    const poll = async () => {
      try {
        const data = await getJob(jobId);
        if (!isMounted) {
          return;
        }
        setJob(data);
        const terminal = TERMINAL_STATUSES.has(data.status);
        setIsPolling(!terminal);
        if (!terminal) {
          timerRef.current = window.setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch job.");
        setIsPolling(false);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [jobId]);

  return { job, error, isPolling };
}
