import { CompanyType, InsertCompanyType } from "@/types/companies";

export type CompanyFieldsType = "name";
export const CompanyFieldsCount = 4;

export function listCompanyField(company: CompanyType) {
  let fields: CompanyFieldsType[] = [];

  if (company.name && company.name.trim().length > 0) {
    fields.push("name");
  }

  return fields;
}

export function calcCompanyFilledScore(company: InsertCompanyType) {
  let score = 0;

  if (company.name && company.name.trim().length > 0) {
    score += 1;
  }

  return score;
}
