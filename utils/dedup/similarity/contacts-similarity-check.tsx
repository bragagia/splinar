import { uuid } from "@/lib/uuid";
import { ContactWithCompaniesType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import stringSimilarity from "string-similarity";

export function contactSimilarityCheck(
  workspaceId: string,
  contact: ContactWithCompaniesType,
  contactsBase: ContactWithCompaniesType[]
) {
  let contactA = contact;

  return contactsBase.reduce((acc, contactB) => {
    if (contactA.id === contactB.id) {
      return acc;
    }

    let similarities: Database["public"]["Tables"]["contact_similarities"]["Insert"][] =
      [];

    const similarityBase: Database["public"]["Tables"]["contact_similarities"]["Insert"] =
      {
        workspace_id: workspaceId,
        contact_a_id: contactA.id,
        contact_b_id: contactB.id,

        // Boiletplate, will be replaced later
        field_type: "fullname",
        contact_a_value: "",
        contact_b_value: "",
        similarity_score: "unlikely",
      };

    // Name
    let aFullName = [contactA.first_name, contactA.last_name]
      .filter((v) => v !== null && v !== undefined)
      .join(" ")
      .trim()
      .toLowerCase()
      .replaceAll("  ", " ");
    let bFullName = [contactB.first_name, contactB.last_name]
      .filter((v) => v !== null && v !== undefined)
      .join(" ")
      .trim()
      .toLowerCase()
      .replaceAll("  ", " ");

    if (aFullName !== "" && bFullName !== "") {
      const fullNameSimilarityBase: Database["public"]["Tables"]["contact_similarities"]["Insert"] =
        {
          ...similarityBase,
          id: uuid(),
          field_type: "fullname",
          contact_a_value: aFullName,
          contact_b_value: bFullName,
        };

      if (aFullName == bFullName) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "exact",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aFullName, bFullName) > 0.9
      ) {
        // TODO: This constant must be tested on real database
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "similar",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aFullName, bFullName) > 0.8
      ) {
        // TODO: This constant must be tested on real database
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "potential",
        });
      }
    }

    // Emails
    contactA.emails?.forEach((emailA) => {
      contactB.emails?.forEach((emailB) => {
        const emailSimilarityBase: Database["public"]["Tables"]["contact_similarities"]["Insert"] =
          {
            ...similarityBase,
            id: uuid(),
            field_type: "email",
            contact_a_value: emailA,
            contact_b_value: emailB,
          };

        let removeInfiniteAddr = (str: string) => str.replace(/\+[^@]*$/, "");
        let removeUselessDots = (str: string) => str.split(".").join("");
        let removeExt = (str: string) => str.split(".").slice(0, -1).join(".");

        const idA = removeUselessDots(emailA.split("@")[0]);
        const idB = removeUselessDots(emailB.split("@")[0]);

        const domainA = emailA.split("@")[1];
        const domainB = emailB.split("@")[1];

        if (emailA === emailB) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "exact",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            removeInfiniteAddr(idA),
            removeInfiniteAddr(idB)
          ) > 0.95 &&
          stringSimilarity.compareTwoStrings(domainA, domainB) > 0.95
        ) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "similar",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            removeInfiniteAddr(idA),
            removeInfiniteAddr(idB)
          ) > 0.9 &&
          stringSimilarity.compareTwoStrings(
            removeExt(domainA),
            removeExt(domainB)
          ) > 0.9
        ) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "potential",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            removeInfiniteAddr(idA),
            removeInfiniteAddr(idB)
          ) > 0.9
        ) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "unlikely",
          });
        }
      });
    });

    // Phones
    contactA.phones?.forEach((phoneA) => {
      contactB.phones?.forEach((phoneB) => {
        if (phoneA === phoneB) {
          similarities.push({
            ...similarityBase,
            id: uuid(),
            field_type: "phone",
            contact_a_value: phoneA,
            contact_b_value: phoneB,
            similarity_score: "exact",
          });
        }
      });
    });

    // Companies
    contactA.companies?.forEach((companyA) => {
      contactB.companies?.forEach((companyB) => {
        const emailSimilarityBase: Database["public"]["Tables"]["contact_similarities"]["Insert"] =
          {
            ...similarityBase,
            id: uuid(),
            field_type: "company",
            contact_a_value: companyA.name || companyA.id,
            contact_b_value: companyB.name || companyB.id,
          };

        if (companyA.id === companyB.id) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "exact",
          });
        } else if (companyA.name && companyB.name) {
          if (
            stringSimilarity.compareTwoStrings(companyA.name, companyB.name) >
            0.9
          ) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "similar",
            });
          }
        }
      });
    });

    const scoreRanking: { [key: string]: number } = {
      exact: 4,
      similar: 3,
      potential: 2,
      unlikely: 1,
    };

    let filtered: {
      [
        key: string
      ]: Database["public"]["Tables"]["contact_similarities"]["Insert"];
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

    const filteredValues: Database["public"]["Tables"]["contact_similarities"]["Insert"][] =
      Object.values(filtered);

    acc.push(...filteredValues);

    return acc;
  }, [] as Database["public"]["Tables"]["contact_similarities"]["Insert"][]);
}
