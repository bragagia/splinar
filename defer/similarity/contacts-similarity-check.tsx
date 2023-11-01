import {
  HsContactSimilarityType,
  HsContactWithCompaniesType,
} from "@/utils/database-types";
import { nanoid } from "nanoid";

var stringSimilarity = require("string-similarity");

export function contactSimilarityCheck(
  workspaceId: string,
  contact: HsContactWithCompaniesType,
  contactsBase: HsContactWithCompaniesType[]
) {
  let contactA = contact;

  return contactsBase.reduce((acc, contactB) => {
    if (contactA.id === contactB.id) {
      return acc;
    }

    let similarities: HsContactSimilarityType[] = [];

    const similarityBase = {
      workspace_id: workspaceId,
      contact_a_id: contactA.id,
      contact_b_id: contactB.id,
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
      const fullNameSimilarityBase: Omit<
        HsContactSimilarityType,
        "similarity_score"
      > = {
        ...similarityBase,
        id: nanoid(),
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
        stringSimilarity.compareTwoStrings(aFullName, bFullName) > 0.8
      ) {
        // TODO: This constant must be tested on real database
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "similar",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aFullName, bFullName) > 0.7
      ) {
        // TODO: This constant must be tested on real database
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "unlikely",
        });
      }
    }

    // Emails
    contactA.emails?.forEach((emailA) => {
      contactB.emails?.forEach((emailB) => {
        const emailSimilarityBase: Omit<
          HsContactSimilarityType,
          "similarity_score"
        > = {
          ...similarityBase,
          id: nanoid(),
          field_type: "email",
          contact_a_value: emailA,
          contact_b_value: emailB,
        };

        let removeExt = (str: string) => str.split(".").slice(0, -1).join(".");
        let removeInfiniteAddr = (str: string) =>
          str.split(/\+[^@]*@/).join("@");
        let removeUselessDots = (str: string) => str.split(".").join("");
        let normalizeMail = (str: string) =>
          removeUselessDots(removeInfiniteAddr(removeExt(str)));

        let removeDomain = (str: string) => str.split("@")[0];

        if (emailA === emailB) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "exact",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            normalizeMail(emailA),
            normalizeMail(emailB)
          ) > 0.9
        ) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "similar",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            removeDomain(normalizeMail(emailA)),
            removeDomain(normalizeMail(emailB))
          ) > 0.9
        ) {
          similarities.push({
            ...emailSimilarityBase,
            similarity_score: "potential",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            removeDomain(normalizeMail(emailA)),
            removeDomain(normalizeMail(emailB))
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
            id: nanoid(),
            field_type: "phone",
            contact_a_value: phoneA,
            contact_b_value: phoneB,
            similarity_score: "exact",
          });
        }
      });
    });

    // Companies
    contactA.hs_companies?.forEach((companyA) => {
      contactB.hs_companies?.forEach((companyB) => {
        const emailSimilarityBase: Omit<
          HsContactSimilarityType,
          "similarity_score"
        > = {
          ...similarityBase,
          id: nanoid(),
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
            companyA.name.toLowerCase().trim() ===
            companyB.name.toLowerCase().trim()
          ) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "similar",
            });
          } else if (
            stringSimilarity.compareTwoStrings(companyA.name, companyB.name) >
            0.9
          ) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "potential",
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

    let filtered: { [key: string]: HsContactSimilarityType } = {};

    for (let entry of similarities) {
      if (
        !filtered[entry.field_type] ||
        scoreRanking[entry.similarity_score] >
          scoreRanking[filtered[entry.field_type].similarity_score]
      ) {
        filtered[entry.field_type] = entry;
      }
    }

    const filteredValues: HsContactSimilarityType[] = Object.values(filtered);

    acc.push(...filteredValues);

    return acc;
  }, [] as HsContactSimilarityType[]);
}
