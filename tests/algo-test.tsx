import { areItemsDups } from "@/inngest/workspace-install-dupstacks/are-items-dups";
import { evalSimilarities } from "@/inngest/workspace-install-similarities-batch/eval-similarities";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Tables } from "@/types/supabase";
import dayjs from "dayjs";

const VERBOSE = false;

function AlgoTest() {
  let id = 0;

  const baseContact = (): Tables<"items"> => ({
    id: uuid(),
    id_seq: ++id,
    created_at: dayjs().toISOString(),
    workspace_id: "abcd",
    item_type: "CONTACTS",
    distant_id: "",
    merged_in_distant_id: null,
    merged_at: null,

    similarity_checked: false,
    dup_checked: false,
    filled_score: 0,
    value: "",
  });

  const companyA = uuid();
  const companyB = uuid();

  const tests = [
    testContacts(
      1,
      "Same phone and same first name",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: "0781208307",
          email: undefined,
          company_name: undefined,
          companies: [],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0781208307",
          email: "jkfldjkflds@kfdlskldfs.com",
          company_name: undefined,
          companies: [],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      2,
      "Same name but different email domains",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias@sibilu.com",
          company_name: undefined,
          companies: [],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      3,
      "Same name but clearly different companies and email domain",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias@sibilu.com",
          company_name: undefined,
          companies: [companyB],
        },
      },
      false
    ),

    testContacts(
      4,
      "Same first name, email and company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: "mathias+test@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      "CONFIDENT"
    ),

    testContacts(
      5,
      "Unlikely emails and same company, but not same person",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: undefined,
          lastname: undefined,
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: undefined,
          lastname: undefined,
          mobilephone: undefined,
          email: "lathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      false
    ),

    testContacts(
      6,
      "Homonyme same company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: undefined,
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: undefined,
          company_name: undefined,
          companies: [companyA],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      7,
      "Homonyme without other info",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: undefined,
          company_name: undefined,
          companies: [],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: undefined,
          company_name: undefined,
          companies: [],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      8,
      "Homonyme and same mail but different company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyB],
        },
      },
      "CONFIDENT"
    ),

    testContacts(
      9,
      "Homonyme and same phone and unlikely email and not same company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: "0388090228",
          phone: "0781208307",
          email: "mathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: undefined,
          mobilephone: "0781208307",
          email: "mathias.bragagia@gmail.com",
          company_name: undefined,
          companies: [companyB],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      10,
      "Reverse fullname, same company, but unlikely email and no phone",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Bragagia",
          lastname: "Mathias",
          mobilephone: "0781208307",
          email: "mathias.bragagia@bla.bla",
          company_name: undefined,
          companies: [companyA],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      11,
      "Same mail except extension, same company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "",
          lastname: "",
          mobilephone: "",
          email: "mathias.bragagia@blabla.fr",
          company_name: "",
          companies: [companyA],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      12,
      "Same company and phone, but different person",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Vincent",
          lastname: "Abraham",
          mobilephone: "0707070707",
          email: "vincent@splinar.com",
          company_name: "",
          companies: [companyA],
        },
      },
      false
    ),

    testContacts(
      13,
      "Same name and company, but unlikely email",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias.bragag@gmail.com",
          company_name: "",
          companies: [companyA],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      14,
      "Same company and phone, but different fullname and no email",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@gmail.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Vincent",
          lastname: "Abraham",
          mobilephone: "0707070707",
          email: undefined,
          company_name: "",
          companies: [companyA],
        },
      },
      false
    ),

    testContacts(
      15,
      "Same company, phone and name, but different email",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mbragag@gmail.com",
          company_name: "",
          companies: [companyA],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      16,
      "Same name and company and phone, and empty other columns",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mbragag@gmail.com",
          company_name: "",
          companies: [companyA],
        },
      },
      "POTENTIAL"
    ),

    testContacts(
      17,
      "Same phone, but different person without company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Vincent",
          lastname: "Abraham",
          mobilephone: "0707070707",
          email: "vincent@splinar.com",
          company_name: "",
          companies: [],
        },
      },
      false // TODO: Not sure about this one
    ),

    testContacts(
      18,
      "Same name, but different email without phone in same company",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mb@larouequitourne.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      false
    ),

    testContacts(
      19,
      "Same phone, but different email",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "0707070707",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "",
          lastname: "",
          mobilephone: "0707070707",
          email: "mb@larouequitourne.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      false
    ),

    testContacts(
      20,
      "Same name, but different email",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: undefined,
          email: "mb@larouequitourne.com",
          company_name: undefined,
          companies: [],
        },
      },
      false
    ),

    testContacts(
      21,
      "Same mail and company, but different name and phone",
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Mathias",
          lastname: "Bragagia",
          mobilephone: "01234567",
          email: "mathias.bragagia@blabla.com",
          company_name: "",
          companies: [companyA],
        },
      },
      {
        ...baseContact(),
        id: uuid(),
        value: {
          firstname: "Vincent",
          lastname: "Abraham",
          mobilephone: "077777777",
          email: "mathias.bragagia@blabla.com",
          company_name: undefined,
          companies: [companyA],
        },
      },
      "POTENTIAL"
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

  const similarities = evalSimilarities("abcd", a, b) || [];

  const areDups = areItemsDups(
    { ...a, similarities: similarities as Tables<"similarities">[] },
    { ...b, similarities: similarities as Tables<"similarities">[] }
  );

  if (areDups !== expected || VERBOSE) {
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
      console.log
    );

    console.log("#");

    console.log("#", areDups, "vs expected:", expected);
    console.log("######");
    console.log("");
  } else {
    console.log("# Test", nb, "✓");
  }

  return areDups === expected;
}

AlgoTest();
