import { ContactWithCompaniesType } from "@/types/database-types";
import { Database } from "@/types/supabase";

export type ContactFieldsType = "fullname" | "email" | "phone" | "company";
export const ContactFieldsCount = 4;

export function listContactField(contact: ContactWithCompaniesType) {
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

  if (contact.companies && contact.companies.length > 0) {
    fields.push("company");
  }

  return fields;
}

export function calcContactFilledScore(
  contact: Database["public"]["Tables"]["contacts"]["Insert"],
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
