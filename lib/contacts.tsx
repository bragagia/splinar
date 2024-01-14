import {
  DupStackRowInfos,
  LinkedinLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { ItemsListField } from "@/app/workspace/[workspaceId]/duplicates/items-list-field";
import { getCompanyColumns } from "@/lib/companies";
import { URLS } from "@/lib/urls";
import { uuid } from "@/lib/uuid";
import { DupStackItemWithItemT } from "@/types/dupstacks";
import { ItemLink } from "@/types/items";
import { Tables, TablesInsert } from "@/types/supabase";
import stringSimilarity from "string-similarity";

export type ColumnList = {
  [key: string]: any;
};

export function getContactColumns(item: Tables<"items">) {
  const value = item.value as any;

  const nameExist =
    (value.firstname && value.firstname.trim() !== "") ||
    (value.lastname && value.lastname.trim() !== "");

  return {
    name: nameExist
      ? {
          firstname: value.firstname as string | null,
          lastname: value.lastname as string | null,
          fullname: [value.firstname, value.lastname]
            .filter((v) => v !== null && v !== undefined)
            .join(" ")
            .trim()
            .replaceAll("  ", " "),
        }
      : null,

    emails: [value.email].filter(
      (v) => v !== null && v !== undefined
    ) as string[], // TODO: Add additional emails

    phones: [value.mobilephone, value.phone].filter(
      (v) => v !== null && v !== undefined
    ) as string[],

    companies: (value.companies || []) as ItemLink[],

    hs_linkedinid: value.hs_linkedinid as string | null,
  };
}

export function getContactRowInfos(
  workspaceHubId: string,
  dupStackItem: DupStackItemWithItemT
): DupStackRowInfos {
  const item = dupStackItem.item;
  if (!item) {
    throw new Error("missing contact");
  }

  const itemColumns = getContactColumns(item);

  return {
    dup_type: dupStackItem.dup_type,
    columns: [
      {
        value: itemColumns.name?.fullname,
        style: "text-black font-medium",
        tips: "Full name",
        hubspotLink: URLS.external.hubspotContact(
          workspaceHubId,
          item.distant_id
        ),
      },
      {
        value: itemColumns.emails,
        style: "text-gray-700",
        tips: "Emails",
      },
      {
        value: itemColumns.phones,
        style: "text-gray-700",
        tips: "Phone numbers",
      },
      {
        value: itemColumns.hs_linkedinid ? (
          <LinkedinLinkButton href={itemColumns.hs_linkedinid}>
            {itemColumns.hs_linkedinid
              ?.replace(/.*linkedin\.com(\/company)?(\/in)?\//, "")
              .replace(/\/$/, "")}
          </LinkedinLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Linkedin page",
      },
      {
        value: () => (
          <ItemsListField
            itemsDistantIds={
              itemColumns.companies?.map((link) => link.id) as string[] | null
            }
            nameFn={(item: Tables<"items">) =>
              getCompanyColumns(item).name || "#" + item.distant_id
            }
            linkFn={(item: Tables<"items">) =>
              URLS.external.hubspotCompany(workspaceHubId, item.distant_id)
            }
          />
        ),
        style: "text-gray-700",
        tips: "Companies",
      },
    ],
  };
}

export const contactScoring = {
  fullname: {
    exact: 40,
    similar: 30,
    potential: 5,

    notMatchingMalus: -80,

    emptyBonusMultiplier: 1.2,
  },

  email: {
    exact: 180,
    similar: 140,
    potential: 70,
    unlikely: 5,
    unlikelyMultiplier: 1.1,

    notMatchingMalus: -30,

    emptyBonusMultiplier: 1.2,
  },

  phone: {
    exact: 70, // phones can be shared like a company, but can also be unique

    notMatchingMalus: -30,

    emptyBonusMultiplier: 1.2,
  },

  company: {
    exactMultiplier: 1.4,

    notMatchingMalus: -10,
    notMatchingMalusMultiplier: 0.7,

    emptyBonusMultiplier: 1,
  },
};

export function contactSimilarityCheck(
  workspaceId: string,
  contactA: Tables<"items">,
  contactB: Tables<"items">
) {
  if (contactA.id === contactB.id) {
    return undefined;
  }

  let similarities: TablesInsert<"similarities">[] = [];

  const similarityBase: TablesInsert<"similarities"> = {
    workspace_id: workspaceId,
    item_a_id: contactA.id,
    item_b_id: contactB.id,

    // Boilerplate, will be replaced later
    field_type: "fullname",
    item_a_value: "",
    item_b_value: "",
    similarity_score: "unlikely",
  };

  const A = getContactColumns(contactA);
  const B = getContactColumns(contactB);

  // Name
  let aFullName = A.name?.fullname.toLowerCase();
  let bFullName = B.name?.fullname.toLowerCase();

  if (aFullName && bFullName && aFullName.length > 2 && bFullName.length > 2) {
    const fullNameSimilarityBase: TablesInsert<"similarities"> = {
      ...similarityBase,
      id: uuid(),
      field_type: "fullname",
      item_a_value: aFullName,
      item_b_value: bFullName,
    };

    let aStrictFullName = [
      B.name?.firstname ? A.name?.firstname : null,
      B.name?.lastname ? A.name?.lastname : null,
    ]
      .filter((v) => v !== null && v !== undefined)
      .join(" ")
      .trim()
      .toLowerCase()
      .replaceAll("  ", " ");
    let bStrictFullName = [
      A.name?.firstname ? B.name?.firstname : null,
      A.name?.lastname ? B.name?.lastname : null,
    ]
      .filter((v) => v !== null && v !== undefined)
      .join(" ")
      .trim()
      .toLowerCase()
      .replaceAll("  ", " ");

    if (aFullName == bFullName) {
      similarities.push({
        ...fullNameSimilarityBase,
        similarity_score: "exact",
      });
    } else {
      const compareScore = stringSimilarity.compareTwoStrings(
        aFullName,
        bFullName
      );

      if (compareScore > 0.9) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "similar",
        });
      } else if (compareScore > 0.85) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "potential",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aStrictFullName, bStrictFullName) >
        0.9
      ) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "potential",
        });
      }
    }
  }

  // Emails
  const emailsFilteredA = A.emails?.filter(
    (email: string) => email.length > 4 && email.includes("@")
  );
  const emailsFilteredB = B.emails?.filter(
    (email: string) => email.length > 4 && email.includes("@")
  );

  emailsFilteredA?.forEach((emailA: string) => {
    emailsFilteredB?.forEach((emailB: string) => {
      const emailSimilarityBase: TablesInsert<"similarities"> = {
        ...similarityBase,
        id: uuid(),
        field_type: "email",
        item_a_value: emailA,
        item_b_value: emailB,
      };

      emailA = emailA.trim();
      emailB = emailB.trim();

      if (!emailA || !emailB) {
        // We need to do this because for some ungodly reason hubspot accept " " as a valid email
        return;
      }

      if (emailA === emailB) {
        similarities.push({
          ...emailSimilarityBase,
          similarity_score: "exact",
        });
      } else {
        let removeInfiniteAddr = (str: string) => str.replace(/\+[^@]*$/, "");
        let removeUselessDots = (str: string) => str.split(".").join("");
        let removeExt = (str: string) => str.split(".").slice(0, -1).join(".");

        const idA = removeInfiniteAddr(removeUselessDots(emailA.split("@")[0]));
        const idB = removeInfiniteAddr(removeUselessDots(emailB.split("@")[0]));

        const idSimScore = stringSimilarity.compareTwoStrings(idA, idB);

        // If we met the unlikely score, we check for the rest, else with just skip
        if (idSimScore > 0.9) {
          const domainA = emailA.split("@")[1];
          const domainB = emailB.split("@")[1];

          const domainWithoutExtA = removeExt(domainA);
          const domainWithoutExtB = removeExt(domainB);

          const domainSimScore = stringSimilarity.compareTwoStrings(
            domainWithoutExtA,
            domainWithoutExtB
          );

          if (idA === idB && domainA === domainB) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "exact",
            });
          } else if (idSimScore > 0.95 && domainSimScore > 0.95) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "similar",
            });
          } else if (idSimScore > 0.95 && domainSimScore > 0.9) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "potential",
            });
          } else if (idSimScore > 0.9) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "unlikely",
            });
          }
        }
      }
    });
  });

  // Phones

  const phonesA = A.phones;
  const phonesB = B.phones;

  const phonesFilteredA = phonesA?.filter((phone) => phone.length > 4);
  const phonesFilteredB = phonesB?.filter((phone) => phone.length > 4);

  phonesFilteredA?.forEach((phoneA) => {
    phonesFilteredB?.forEach((phoneB) => {
      if (phoneA === phoneB) {
        similarities.push({
          ...similarityBase,
          id: uuid(),
          field_type: "phone",
          item_a_value: phoneA,
          item_b_value: phoneB,
          similarity_score: "exact",
        });
      }
    });
  });

  // If there is no similarities or only unlikely ones, we skip, it will greatly reduce similarities db size
  // !!!
  // Note : Comapnies check is after, because it only acts as a multiplier for the dup score, so if there is only unlikely similarities,
  // we can skip companies check too.
  // There is a loooot of contacts that share the same company so dup_stack check will be much much faster
  if (
    similarities.length === 0 ||
    !similarities.find(
      (similarity) => similarity.similarity_score !== "unlikely"
    )
  ) {
    return undefined;
  }

  // Companies
  A.companies.forEach((companyA: ItemLink) => {
    B.companies.forEach((companyB: ItemLink) => {
      const companySimilarityBase: TablesInsert<"similarities"> = {
        ...similarityBase,
        id: uuid(),
        field_type: "company",
        item_a_value: companyA.id,
        item_b_value: companyB.id,
      };

      if (companyA.id === companyB.id) {
        similarities.push({
          ...companySimilarityBase,
          similarity_score: "exact",
        });
      }
      // } else if (companyA.name && companyB.name) {
      //   if (
      //     stringSimilarity.compareTwoStrings(companyA.name, companyB.name) >
      //     0.97
      //   ) {
      //     similarities.push({
      //       ...companySimilarityBase,
      //       similarity_score: "similar",
      //     });
      //   }
      // }
    });
  });

  const scoreRanking: { [key: string]: number } = {
    exact: 4,
    similar: 3,
    potential: 2,
    unlikely: 1,
  };

  let filtered: {
    [key: string]: TablesInsert<"similarities">;
  } = {};

  for (let entry of similarities) {
    if (
      !filtered[entry.field_type] ||
      scoreRanking[entry.similarity_score] >
        scoreRanking[filtered[entry.field_type].similarity_score]
    ) {
      filtered[entry.field_type] = entry;
    }
  }

  const filteredValues: TablesInsert<"similarities">[] =
    Object.values(filtered);

  return filteredValues;
}
