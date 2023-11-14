"use client";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import {
  User,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

export function UserNav() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const [menuOpened, setMenuOpened] = useState(false);
  const [user, setUser] = useState<User | undefined>();

  useEffect(() => {
    const fn = async () => {
      setUser((await supabase.auth.getSession()).data.session?.user);
    };
    fn();
  }, [supabase]);

  async function onSignout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <DropdownMenu onOpenChange={setMenuOpened}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center outline-none hover:outline-gray-400",
            { "outline-gray-400": menuOpened }
          )}
        >
          <Icons.person className="text-black " />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none break-words">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem disabled>Billing</DropdownMenuItem>

          <DropdownMenuItem disabled>Settings</DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onSignout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
