import { areItemsDups } from "@/inngest/dedup/dup-stacks/are-items-dups";
import { contactSimilarityCheck } from "@/lib/contacts";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Tables } from "@/types/supabase";

function AlgoTest() {
  const baseContact: Tables<"items"> = {
    id: "",
    created_at: "",
    workspace_id: "abcd",
    item_type: "CONTACTS",
    distant_id: "",
    merged_in_distant_id: null,
    merged_at: null,

    similarity_checked: false,
    dup_checked: false,
    filled_score: 0,
    value: "",
  };

  const companyA = {
    id: uuid(),
    name: "Blabla",
  };

  const companyB = {
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
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: ["0781208307"],
          emails: [],
          company_name: "",
          companies: [],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0781208307"],
          emails: ["jkfldjkflds@kfdlskldfs.com"],
          company_name: "",
          companies: [],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      2,
      "Same name but different email domains",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias@sibilu.com"],
          company_name: "",
          companies: [],
        }),
      },
      "POTENTIAL"
    ),

    testContacts(
      3,
      "Same name but clearly different companies and email domain",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias@sibilu.com"],
          company_name: "",
          companies: [companyB],
        }),
      },
      false
    ),

    testContacts(
      4,
      "Same first name, email and company",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: ["mathias+test@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      5,
      "Unlikely emails and same company, but not same person",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "",
          lastname: "",
          phones: [],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "",
          lastname: "",
          phones: [],
          emails: ["lathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      false
    ),

    testContacts(
      6,
      "Homonyme same company",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: [],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: [],
          company_name: "",
          companies: [companyA],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      7,
      "Homonyme without other info",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: [],
          company_name: "",
          companies: [],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: [],
          company_name: "",
          companies: [],
        }),
      },
      "POTENTIAL"
    ),

    testContacts(
      8,
      "Homonyme and same mail but different company",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: [],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyB],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      9,
      "Homonyme and same phone and unlikely email and not same company",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: ["0388090228", "0781208307"],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "",
          phones: ["0781208307"],
          emails: ["mathias.bragagia@gmail.com"],
          company_name: "",
          companies: [companyB],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      10,
      "Reverse fullname, same company, but unlikely email and no phone",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Bragagia",
          lastname: "Mathias",
          phones: ["0781208307"],
          emails: ["mathias.bragagia@bla.bla"],
          company_name: "",
          companies: [companyA],
        }),
      },
      "POTENTIAL"
    ),

    testContacts(
      11,
      "Same mail except extension, same company",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "",
          lastname: "",
          phones: [""],
          emails: ["mathias.bragagia@blabla.fr"],
          company_name: "",
          companies: [companyA],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      12,
      "Same company and phone, but different person",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0707070707"],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Vincent",
          lastname: "Abraham",
          phones: ["0707070707"],
          emails: ["vincent@splinar.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      false
    ),

    testContacts(
      13,
      "Same name and company, but unlikely emails",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: [],
          emails: ["mathias.bragag@gmail.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      14,
      "Same company and phone, but different fullname and no email",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0707070707"],
          emails: ["mathias.bragagia@gmail.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Vincent",
          lastname: "Abraham",
          phones: ["0707070707"],
          emails: [],
          company_name: "",
          companies: [companyA],
        }),
      },
      false
    ),

    testContacts(
      15,
      "Same company, phone and name, but different emails",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0707070707"],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0707070707"],
          emails: ["mbragag@gmail.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      "CONFIDENT"
    ),

    testContacts(
      16,
      "Same name and company, and empty other columns",
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0707070707"],
          emails: ["mathias.bragagia@blabla.com"],
          company_name: "",
          companies: [companyA],
        }),
      },
      {
        ...baseContact,
        id: uuid(),
        value: JSON.stringify({
          firstname: "Mathias",
          lastname: "Bragagia",
          phones: ["0707070707"],
          emails: ["mbragag@gmail.com"],
          company_name: "",
          companies: [companyA],
        }),
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
  a: Tables<"items">,
  b: Tables<"items">,
  expected: "CONFIDENT" | "POTENTIAL" | false
) {
  a.filled_score = listItemFields(a).length;
  b.filled_score = listItemFields(b).length;

  const similarities = contactSimilarityCheck("abcd", a, b) || [];

  const areDups = areItemsDups(
    { ...a, similarities: similarities as Tables<"similarities">[] },
    { ...b, similarities: similarities as Tables<"similarities">[] },
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
    areItemsDups(
      { ...a, similarities: similarities as Tables<"similarities">[] },
      { ...b, similarities: similarities as Tables<"similarities">[] },
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
