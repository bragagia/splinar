import { BuyNowButton } from "@/app/workspace/[workspaceId]/billing/buy-now-button";
import { Icons } from "@/components/icons";
import { SpButton } from "@/components/sp-button";

export function SubscriptionOptions({
  workspaceUsage,
  currentPlan,
  onSelectFree,
}: {
  workspaceUsage: {
    contactsTotal: number;
    companiesTotal: number;
    usage: number;
    usagePrice: number;
    priceTotal: number;
  };
  currentPlan: "free" | "none";
  onSelectFree?: () => void;
}) {
  const { contactsTotal, companiesTotal, usage, usagePrice, priceTotal } =
    workspaceUsage;

  return (
    <div className="grid grid-cols-2 max-w-4xl items-center mx-auto">
      <div className="rounded-s-3xl p-10 ring-1 ring-gray-300 shadow-2xl bg-gray-50">
        <h3 id="tier-free" className="text-purple-800 text-md font-semibold">
          Free tier
        </h3>

        <p className="flex flex-row gap-2 mt-4 items-baseline">
          <span className="text-gray-900 font-bold text-5xl tracking-tight">
            Free
          </span>
        </p>

        <p className="text-gray-600 text-md mt-6">
          {"The perfect plan to try out our product. No time limit."}
        </p>

        <ul
          role="list"
          className="mt-10 text-gray-600 text-sm gap-y-3 flex flex-col"
        >
          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Limited to your 5000 last contacts and companies
          </li>

          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Manually merge groups of duplicates
          </li>

          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Mark items as false-positive
          </li>

          {/* <li className="flex flex-row gap-3">
                  <Icons.x className="text-gray-400 flex-none w-5 h-5" />
                  No contacts duplicates detection
                </li> */}
        </ul>

        {currentPlan === "free" ? (
          <SpButton
            variant="outline"
            disabled
            size="lg"
            className="mt-10 w-full"
          >
            Current plan
          </SpButton>
        ) : (
          <SpButton
            onClick={onSelectFree}
            variant="outline"
            size="lg"
            className="mt-10 w-full"
          >
            Select
          </SpButton>
        )}
      </div>

      <div className="p-10 ring-1 ring-gray-300 shadow-2xl bg-white rounded-3xl relative">
        <h3
          id="tier-personal"
          className="text-purple-800 text-md font-semibold"
        >
          Enterprise
        </h3>

        <p className="flex flex-row gap-2 mt-4 items-baseline">
          <span className="text-gray-900 font-bold text-5xl tracking-tight">
            €{priceTotal}
          </span>

          <span className="text-gray-500 text-md">/month</span>
          <span className="text-gray-400 text-xs">excluding taxes</span>
        </p>

        <p className="text-gray-400 text-sm font-medium mt-2">
          1€ per 1000 items per month
        </p>

        <p className="text-gray-600 text-md mt-6">
          {"Get the full power out of Splinar"}
        </p>

        <ul
          role="list"
          className="mt-10 text-gray-600 text-sm gap-y-3 flex flex-col"
        >
          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Unlimited contacts and companies
          </li>

          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Manually merge groups of duplicates
          </li>

          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Auto merge all detected duplicates
          </li>

          <li className="flex flex-row gap-3">
            <Icons.check className="text-purple-800 flex-none w-5 h-5" />
            Mark items as false-positive
          </li>

          <li className="flex flex-row gap-3">
            <span className="text-purple-800 flex justify-center w-5 h-5 text-sm font-semibold">
              soon
            </span>
            Custom rules
          </li>

          <li className="flex flex-row gap-3">
            <span className="text-purple-800 flex justify-center w-5 h-5 text-sm font-semibold">
              soon
            </span>
            24/7 instant synchronisation with HubSpot
          </li>
        </ul>

        <BuyNowButton />

        <div className="text-gray-400 text-xs mt-8">
          <div className="flex flex-row items-start gap-1">
            <span>*</span>

            <p>
              Calculated on current usage of :<br />
              {companiesTotal} companies + {contactsTotal} contacts ~= {usage}k
              items
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
