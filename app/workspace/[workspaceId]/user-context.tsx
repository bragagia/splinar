"use client";

import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserContextType = {
  id: string;
  email: string;
  role: "SUPERADMIN" | null;
};

export const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  let user = useContext(UserContext);

  if (!user) {
    throw new Error("Missing user context");
  }

  return user;
}

export function UserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: UserContextType;
}) {
  const supabase = createClientComponentClient<Database>();

  const [user, setUser] = useState<UserContextType>(value);

  useEffect(() => {
    setUser(value);
  }, [value, supabase]);

  if (user.role === "SUPERADMIN") {
    return (
      <div className="border-8 border-red-500 min-h-screen">
        <UserContext.Provider value={user}>{children}</UserContext.Provider>
      </div>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
