import { CompanyType, InsertCompanyType } from "@/types/companies";

export type CompanyFieldsType =
  | "name"
  | "domain"
  | "website"
  | "facebook_company_page"
  | "linkedin_company_page"
  | "phone"
  | "twitterhandle";
export const CompanyFieldsCount = 7;

export function listCompanyField(company: CompanyType) {
  let fields: CompanyFieldsType[] = [];

  if (company.name && company.name.trim().length > 0) {
    fields.push("name");
  }

  if (company.domain && company.domain.trim().length > 0) {
    fields.push("domain");
  }

  if (company.website && company.website.trim().length > 0) {
    fields.push("website");
  }

  if (
    company.facebook_company_page &&
    company.facebook_company_page.trim().length > 0
  ) {
    fields.push("facebook_company_page");
  }

  if (
    company.linkedin_company_page &&
    company.linkedin_company_page.trim().length > 0
  ) {
    fields.push("linkedin_company_page");
  }

  if (company.phone && company.phone.trim().length > 0) {
    fields.push("phone");
  }

  if (company.twitterhandle && company.twitterhandle.trim().length > 0) {
    fields.push("twitterhandle");
  }

  return fields;
}

export function calcCompanyFilledScore(company: InsertCompanyType) {
  let score = 0;

  if (company.name && company.name.trim().length > 0) {
    score += 1;
  }

  if (company.domain && company.domain.trim().length > 0) {
    score += 1;
  }

  if (company.website && company.website.trim().length > 0) {
    score += 1;
  }

  if (
    company.facebook_company_page &&
    company.facebook_company_page.trim().length > 0
  ) {
    score += 1;
  }

  if (
    company.linkedin_company_page &&
    company.linkedin_company_page.trim().length > 0
  ) {
    score += 1;
  }

  if (company.phone && company.phone.trim().length > 0) {
    score += 1;
  }

  if (company.twitterhandle && company.twitterhandle.trim().length > 0) {
    score += 1;
  }

  return score;
}
