import { useLocation } from "react-router-dom";

export function useQueryParam(name: string): string | null {
  const location = useLocation();
  return new URLSearchParams(location.search).get(name);
}
