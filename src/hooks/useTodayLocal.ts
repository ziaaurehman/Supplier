import { useSyncExternalStore } from "react";
import { todayLocalISO } from "@/lib/dates";

const subscribe = () => () => {};

/** Today's local date (YYYY-MM-DD) on the client; empty during server rendering. */
export function useTodayLocal(): string {
  return useSyncExternalStore(subscribe, todayLocalISO, () => "");
}
