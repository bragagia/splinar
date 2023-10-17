import { HsContactType } from "@/utils/database-types";

export type ContactFieldsType = "fullname" | "email" | "phone";
export const ContactFieldsCount = 3;
export const ContactFieldsList: ContactFieldsType[] = [
  "fullname",
  "email",
  "phone",
];

export function listContactField(contact: HsContactType) {
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

  return fields;
}
