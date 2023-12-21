import { areContactsDups } from "@/inngest/dedup/dup-stacks/contacts";
import { calcContactFilledScore } from "@/inngest/dedup/list-contact-fields";
import { contactSimilarityCheck } from "@/inngest/dedup/similarity/contacts";
import { uuid } from "@/lib/uuid";
import { ContactWithCompaniesType } from "@/types/contacts";
import { ContactSimilarityType } from "@/types/similarities";

function AlgoTest() {
  const baseContact = {
    id: "",
    created_at: "",
    workspace_id: "abcd",
    hs_id: 0,

    similarity_checked: false,
    dup_checked: false,
    filled_score: 0,
  };

  const baseCompany = {
    hs_id: 0,
    id: uuid(),
    owner_hs_id: 0,
    twitterhandle: "",
    website: "",
    workspace_id: "",
    phone: "",
    similarity_checked: false,
    state: "",
    linkedin_company_page: "",
    name: "",
    address: "",
    city: "",
    country: "",
    created_at: "",
    domain: "",
    dup_checked: false,
    facebook_company_page: "",
    filled_score: 0,
    zip: "",
  };

  const companyA = {
    ...baseCompany,
    id: uuid(),
    name: "Blabla",
  };

  const companyB = {
    ...baseCompany,
    id: uuid(),
    name: "Sibilu",
  };

  const tests = [
    testContacts(
      1,
      "Same phone and same first name",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: ["0781208307"],
        emails: [],
        company_name: "",
        companies: [],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0781208307"],
        emails: ["jkfldjkflds@kfdlskldfs.com"],
        company_name: "",
        companies: [],
      },
      "CONFIDENT"
    ),

    testContacts(
      2,
      "Same name but different email domains",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias@sibilu.com"],
        company_name: "",
        companies: [],
      },
      "POTENTIAL"
    ),

    testContacts(
      3,
      "Same name but clearly different companies and email domain",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias@sibilu.com"],
        company_name: "",
        companies: [companyB],
      },
      false
    ),

    testContacts(
      4,
      "Same first name, email and company",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: ["mathias+test@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      "CONFIDENT"
    ),

    testContacts(
      5,
      "Unlikely emails and same company, but not same person",
      {
        ...baseContact,
        id: uuid(),
        first_name: "",
        last_name: "",
        phones: [],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "",
        last_name: "",
        phones: [],
        emails: ["lathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      false
    ),

    testContacts(
      6,
      "Homonyme same company",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: [],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: [],
        company_name: "",
        companies: [companyA],
      },
      "CONFIDENT"
    ),

    testContacts(
      7,
      "Homonyme without other info",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: [],
        company_name: "",
        companies: [],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: [],
        company_name: "",
        companies: [],
      },
      "POTENTIAL"
    ),

    testContacts(
      8,
      "Homonyme and same mail but different company",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: [],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyB],
      },
      "CONFIDENT"
    ),

    testContacts(
      9,
      "Homonyme and same phone and unlikely email and not same company",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: ["0388090228", "0781208307"],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "",
        phones: ["0781208307"],
        emails: ["mathias.bragagia@gmail.com"],
        company_name: "",
        companies: [companyB],
      },
      "CONFIDENT"
    ),

    testContacts(
      10,
      "Reverse fullname, same company, but unlikely email and no phone",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Bragagia",
        last_name: "Mathias",
        phones: ["0781208307"],
        emails: ["mathias.bragagia@bla.bla"],
        company_name: "",
        companies: [companyA],
      },
      "POTENTIAL"
    ),

    testContacts(
      11,
      "Same mail except extension, same company",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "",
        last_name: "",
        phones: [""],
        emails: ["mathias.bragagia@blabla.fr"],
        company_name: "",
        companies: [companyA],
      },
      "CONFIDENT"
    ),

    testContacts(
      12,
      "Same company and phone, but different person",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0707070707"],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Vincent",
        last_name: "Abraham",
        phones: ["0707070707"],
        emails: ["vincent@splinar.com"],
        company_name: "",
        companies: [companyA],
      },
      false
    ),

    testContacts(
      13,
      "Same name and company, but unlikely emails",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: [],
        emails: ["mathias.bragag@gmail.com"],
        company_name: "",
        companies: [companyA],
      },
      "CONFIDENT"
    ),

    testContacts(
      14,
      "Same company and phone, but different fullname and no email",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0707070707"],
        emails: ["mathias.bragagia@gmail.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Vincent",
        last_name: "Abraham",
        phones: ["0707070707"],
        emails: [],
        company_name: "",
        companies: [companyA],
      },
      false
    ),

    testContacts(
      15,
      "Same company, phone and name, but different emails",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0707070707"],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0707070707"],
        emails: ["mbragag@gmail.com"],
        company_name: "",
        companies: [companyA],
      },
      "CONFIDENT"
    ),

    testContacts(
      16,
      "Same name and company, and empty other columns",
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0707070707"],
        emails: ["mathias.bragagia@blabla.com"],
        company_name: "",
        companies: [companyA],
      },
      {
        ...baseContact,
        id: uuid(),
        first_name: "Mathias",
        last_name: "Bragagia",
        phones: ["0707070707"],
        emails: ["mbragag@gmail.com"],
        company_name: "",
        companies: [companyA],
      },
      "CONFIDENT"
    ),
  ];

  const validCount = tests.filter((test) => test).length;

  console.log("");
  console.log(
    "Result:",
    tests.map((test) => (test ? "✓" : "!")).join(""),
    `${validCount}/${tests.length}`
  );
}

function testContacts(
  nb: number,
  description: string,
  a: ContactWithCompaniesType,
  b: ContactWithCompaniesType,
  expected: "CONFIDENT" | "POTENTIAL" | false
) {
  a.filled_score = calcContactFilledScore(a, a.companies.length > 0);
  b.filled_score = calcContactFilledScore(b, b.companies.length > 0);

  const similarities = contactSimilarityCheck("abcd", a, b) || [];

  const areDups = areContactsDups(
    { ...a, contact_similarities: similarities as ContactSimilarityType[] },
    { ...b, contact_similarities: similarities as ContactSimilarityType[] },
    false
  );

  if (areDups !== expected) {
    console.log("");
    console.log("######");
    console.log("# Test:", nb);
    console.log("#", description);
    console.log("#");

    console.log("# Similarities: ");
    if (similarities.length === 0) {
      console.log("No similarities");
    } else {
      console.log(
        similarities.map((similarity) => ({
          field_type: similarity.field_type,
          similarity_score: similarity.similarity_score,
        }))
      );
    }

    console.log("#");
    console.log("# Dup check:");
    areContactsDups(
      { ...a, contact_similarities: similarities as ContactSimilarityType[] },
      { ...b, contact_similarities: similarities as ContactSimilarityType[] },
      true
    );

    console.log("#");

    console.log("#", areDups, "vs expected:", expected);
    console.log("######");
    console.log("");

    return false;
  } else {
    console.log("# Test", nb, "✓");

    return true;
  }
}

AlgoTest();
