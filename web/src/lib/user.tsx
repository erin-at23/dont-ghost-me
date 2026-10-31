"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { USERS, type UserId } from "./types";

const UserContext = createContext<UserId>("partner");

export function UserProvider({ children }: { children: ReactNode }) {
  const raw = useSearchParams().get("as");
  const me: UserId = raw && (USERS as readonly string[]).includes(raw) ? raw : "partner";
  return <UserContext.Provider value={me}>{children}</UserContext.Provider>;
}

/** Current user, plus a helper that keeps ?as= on every link. */
export function useMe() {
  const me = useContext(UserContext);
  const href = (path: string) => `${path}${path.includes("?") ? "&" : "?"}as=${me}`;
  return { me, href };
}
