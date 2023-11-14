import {
  HsContactType,
  HsContactWithCompaniesType,
} from "@/utils/database-types";

export type ContactFieldsType = "fullname" | "email" | "phone" | "company";
export const ContactFieldsCount = 4;

export function listContactField(contact: HsContactWithCompaniesType) {
  let fields: ContactFieldsType[] = [];

  let fullname = (contact.first_name || "") + (contact.last_name || "");
  if (fullname.trim().length > 0) {
    fields.push("fullname");
  }

  if (contact.emails && contact.emails.length > 0) {
    fields.push("email");
  }

  if (contact.phones && contact.phones.length > 0) {
    fields.push("phone");
  }

  if (contact.hs_companies && contact.hs_companies.length > 0) {
    fields.push("company");
  }

  return fields;
}

export function calcContactFilledScore(
  contact: HsContactType,
  hasCompanies: boolean
) {
  let score = 0;

  let fullname = (contact.first_name || "") + (contact.last_name || "");
  if (fullname.trim().length > 0) {
    score += 1;
  }

  if (contact.emails && contact.emails.length > 0) {
    score += 1;
  }

  if (contact.phones && contact.phones.length > 0) {
    score += 1;
  }

  if (hasCompanies) {
    score += 1;
  }

  return score;
}
