"use client";

import {
  DupItemTypeType,
  DupStackCard,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { UserProvider } from "@/app/workspace/[workspaceId]/user-context";
import { WorkspaceProvider } from "@/app/workspace/[workspaceId]/workspace-context";
import { getCompanyRowInfos } from "@/lib/companies";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

function saveNewDemoDupType(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackId: string,
  itemId: string,
  newDupType: DupItemTypeType
) {}

export default function DemoStackComp() {
  return (
    <div className="p-3">
      <UserProvider
        value={{
          id: "",
          email: "",
          role: null,
        }}
      >
        <WorkspaceProvider
          value={{
            id: "azerty",
            created_at: "2023-10-17T19:49:45.033466+00:00",
            user_id: "",
            refresh_token: "",
            domain: "dummy.com",
            user_mail: "",
            display_name: "Demo workspace",
            hub_id: "",
            installation_status: "DONE",
            installation_fetched: true,
            installation_similarities_total_batches: 0,
            installation_similarities_done_batches: 0,
            contacts_operation_status: "NONE",
            companies_operation_status: "NONE",
            installation_items_count: 0,
            installation_items_total: 0,
            installation_dup_total: 0,
            installation_dup_done: 0,
          }}
        >
          <DupStackCard
            itemWordName={"companies"}
            dupStack={{
              id: "9f276bf7-432c-4677-9403-e9a0b28b8cc8",
              created_at: "2024-01-07T16:31:35.032105+00:00",
              workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
              item_type: "COMPANIES",
              dup_stack_items: [
                {
                  dupstack_id: "9f276bf7-432c-4677-9403-e9a0b28b8cc8",
                  item_id: "66aca5b5-cc68-4628-aaff-2ec4da39120c",
                  created_at: "2024-01-07T16:31:35.034925+00:00",
                  workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                  dup_type: "REFERENCE",
                  item: {
                    id: "66aca5b5-cc68-4628-aaff-2ec4da39120c",
                    created_at: "2024-01-07T16:28:38.933315+00:00",
                    workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                    distant_id: "8630894037",
                    item_type: "COMPANIES",
                    merged_in_distant_id: null,
                    merged_at: null,
                    value: {
                      name: "Yakidoo",
                      address: "544 Lien Crossing",
                      zip: "12247",
                      city: "Albany",
                      state: "New York",
                      country: "United States",
                      domain: "yakidoo.com",
                      website: "yakidoo.io",
                      owner_hs_id: 1372250310,
                      phone: "(518) 7171695",
                      facebook_company_page: "https://facebook.com/yakidoo",
                      linkedin_company_page:
                        "https://www.linkedin.com/company/yakidoo",
                      twitterhandle: "YakidooTeam",
                    },
                    similarity_checked: true,
                    dup_checked: true,
                    filled_score: 7,
                  },
                },
                {
                  dupstack_id: "9f276bf7-432c-4677-9403-e9a0b28b8cc8",
                  item_id: "2f22a02e-8665-439d-8f4b-1d042c9cc3a0",
                  created_at: "2024-01-07T16:31:35.034925+00:00",
                  workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                  dup_type: "CONFIDENT",
                  item: {
                    id: "2f22a02e-8665-439d-8f4b-1d042c9cc3a0",
                    created_at: "2024-01-07T16:28:38.933315+00:00",
                    workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                    distant_id: "8630923485",
                    item_type: "COMPANIES",
                    merged_in_distant_id: null,
                    merged_at: null,
                    value: {
                      name: "Yakidoo",
                      address: null,
                      zip: null,
                      city: null,
                      state: null,
                      country: null,
                      domain: null,
                      website: null,
                      owner_hs_id: null,
                      phone: null,
                      facebook_company_page: null,
                      linkedin_company_page: null,
                      twitterhandle: null,
                    },
                    similarity_checked: true,
                    dup_checked: true,
                    filled_score: 1,
                  },
                },
                {
                  dupstack_id: "9f276bf7-432c-4677-9403-e9a0b28b8cc8",
                  item_id: "14a339a2-ae65-4d75-9a5d-554bcfc67be7",
                  created_at: "2024-01-07T16:31:35.034925+00:00",
                  workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                  dup_type: "CONFIDENT",
                  item: {
                    id: "14a339a2-ae65-4d75-9a5d-554bcfc67be7",
                    created_at: "2024-01-07T16:28:38.933315+00:00",
                    workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                    distant_id: "8630936292",
                    item_type: "COMPANIES",
                    merged_in_distant_id: null,
                    merged_at: null,
                    value: {
                      name: "Yakidoo",
                      address: null,
                      zip: null,
                      city: null,
                      state: null,
                      country: null,
                      domain: null,
                      website: null,
                      owner_hs_id: null,
                      phone: null,
                      facebook_company_page: null,
                      linkedin_company_page: null,
                      twitterhandle: null,
                    },
                    similarity_checked: true,
                    dup_checked: true,
                    filled_score: 1,
                  },
                },
                {
                  dupstack_id: "9f276bf7-432c-4677-9403-e9a0b28b8cc8",
                  item_id: "c39169ac-60cd-402e-aed4-71bbdc6d8797",
                  created_at: "2024-01-07T16:31:35.034925+00:00",
                  workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                  dup_type: "POTENTIAL",
                  item: {
                    id: "c39169ac-60cd-402e-aed4-71bbdc6d8797",
                    created_at: "2024-01-07T16:28:39.125803+00:00",
                    workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                    distant_id: "8630947803",
                    item_type: "COMPANIES",
                    merged_in_distant_id: null,
                    merged_at: null,
                    value: {
                      name: "Yakidoo",
                      address: null,
                      zip: null,
                      city: null,
                      state: null,
                      country: null,
                      domain: null,
                      website: null,
                      owner_hs_id: null,
                      phone: null,
                      facebook_company_page: null,
                      linkedin_company_page: null,
                      twitterhandle: null,
                    },
                    similarity_checked: true,
                    dup_checked: true,
                    filled_score: 1,
                  },
                },
                {
                  dupstack_id: "9f276bf7-432c-4677-9403-e9a0b28b8cc8",
                  item_id: "da7d198d-1f4c-490f-86f1-0fb98cf38110",
                  created_at: "2024-01-07T16:31:35.034925+00:00",
                  workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                  dup_type: "POTENTIAL",
                  item: {
                    id: "da7d198d-1f4c-490f-86f1-0fb98cf38110",
                    created_at: "2024-01-07T16:28:39.125803+00:00",
                    workspace_id: "6a96d8e3-2fee-48c0-ac4d-8bcc7796f126",
                    distant_id: "8630947812",
                    item_type: "COMPANIES",
                    merged_in_distant_id: null,
                    merged_at: null,
                    value: {
                      name: "Yakidoo",
                      address: null,
                      zip: null,
                      city: null,
                      state: null,
                      country: null,
                      domain: null,
                      website: null,
                      owner_hs_id: null,
                      phone: null,
                      facebook_company_page: null,
                      linkedin_company_page: null,
                      twitterhandle: null,
                    },
                    similarity_checked: true,
                    dup_checked: true,
                    filled_score: 1,
                  },
                },
              ],
            }}
            getRowInfos={getCompanyRowInfos}
            isDemo={true}
          />
        </WorkspaceProvider>
      </UserProvider>
    </div>
  );
}
