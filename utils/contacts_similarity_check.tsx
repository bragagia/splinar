import { HsContactSimilarityType, HsContactType } from "@/utils/database-types";
import { nanoid } from "nanoid";

var stringSimilarity = require("string-similarity");

export function contactSimilarityCheck(
  userId: string,
  workspaceId: string,
  contact: HsContactType,
  contactsBase: HsContactType[]
) {
  let contactA = contact;

  return contactsBase.reduce((acc, contactB) => {
    if (contactA.id === contactB.id) {
      return acc;
    }

    const similarityBase = {
      user_id: userId,
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
        acc.push({
          ...fullNameSimilarityBase,
          similarity_score: "exact",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aFullName, bFullName) > 0.8
      ) {
        // TODO: This constant must be tested on real database
        acc.push({
          ...fullNameSimilarityBase,
          similarity_score: "similar",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aFullName, bFullName) > 0.7
      ) {
        // TODO: This constant must be tested on real database
        acc.push({
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

        if (emailA === emailB) {
          acc.push({
            ...emailSimilarityBase,
            similarity_score: "exact",
          });
        } else if (normalizeMail(emailA) === normalizeMail(emailB)) {
          acc.push({
            ...emailSimilarityBase,
            similarity_score: "similar",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            normalizeMail(emailA),
            normalizeMail(emailB)
          ) > 0.8
        ) {
          acc.push({
            ...emailSimilarityBase,
            similarity_score: "potential",
          });
        } else if (
          stringSimilarity.compareTwoStrings(
            normalizeMail(emailA),
            normalizeMail(emailB)
          ) > 0.7
        ) {
          acc.push({
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
          acc.push({
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

    return acc;
  }, [] as HsContactSimilarityType[]);
}
