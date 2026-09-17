import { processCustomerMessage, ChatMessage } from "../src/lib/jss-assistant-engine";

async function runTests() {
  console.log("=== JSS ASSISTANT CONVERSATION LOGIC TEST SUITE ===\n");

  const testCases = [
    {
      id: "TEST 1",
      query: "hi",
      expected: "Greeting response (no prices, no products, no contact info dump)",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        const hasGreeting = text.includes("hi!") || text.includes("how can i help");
        const noProducts = !res.products || res.products.length === 0;
        const noContactDump = !text.includes("01453 882219") && !text.includes("phoenix house");
        return hasGreeting && noProducts && noContactDump;
      },
    },
    {
      id: "TEST 2",
      query: "what is your contact number?",
      expected: "Phone numbers provided",
      validate: (res: any) => {
        const text = res.text;
        return text.includes("01453 882219") || text.includes("01452 741234");
      },
    },
    {
      id: "TEST 3",
      query: "what is your email?",
      expected: "info@johnstayte.co.uk provided",
      validate: (res: any) => {
        return res.text.includes("info@johnstayte.co.uk");
      },
    },
    {
      id: "TEST 4",
      query: "how to order gas?",
      expected: "Step-by-step ordering instructions with Shop & Order Gas",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return (
          text.includes("how to order") &&
          text.includes("shop & order gas") &&
          text.includes("refill") &&
          text.includes("checkout")
        );
      },
    },
    {
      id: "TEST 5",
      query: "do you have calor gas?",
      expected: "Calor gas products returned with live pricing",
      validate: (res: any) => {
        return res.products && res.products.length > 0 && res.text.toLowerCase().includes("calor");
      },
    },
    {
      id: "TEST 6 (Multi-turn)",
      query: "how much is it?",
      history: [
        { id: "1", role: "user", content: "do you have calor gas 13kg?", timestamp: 1 },
        { id: "2", role: "assistant", content: "Yes, we supply Calor Gas 13kg Propane...", timestamp: 2 },
      ] as ChatMessage[],
      expected: "Context-aware price for 13kg Calor Propane",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return text.includes("13kg") && (text.includes("£") || res.products?.length > 0);
      },
    },
    {
      id: "TEST 7",
      query: "where is my order?",
      expected: "Order tracking instructions or status",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return text.includes("order") && (text.includes("log in") || text.includes("status") || res.orders);
      },
    },
    {
      id: "TEST 8",
      query: "good morning",
      expected: "Natural morning greeting only",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        const hasMorning = text.includes("good morning");
        const noProducts = !res.products || res.products.length === 0;
        return hasMorning && noProducts;
      },
    },
    {
      id: "TEST 9",
      query: "where is your nearest filling station?",
      expected: "Filling station info (Wild Goose Garage & Fromebridge)",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return text.includes("filling station") || text.includes("wild goose") || text.includes("fromebridge") || res.stations?.length > 0;
      },
    },
    {
      id: "TEST 10",
      query: "can I exchange an empty cylinder?",
      expected: "Cylinder exchange rules explained",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return text.includes("exchange") && text.includes("empty");
      },
    },
    {
      id: "TEST 11 (Variation)",
      query: "I need gas for my BBQ",
      expected: "BBQ / Patio gas products and advice",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return text.includes("patio gas") || text.includes("bbq") || res.products?.length > 0;
      },
    },
    {
      id: "TEST 12 (Variation)",
      query: "which one should I choose?",
      expected: "Equipment-based guidance without spam",
      validate: (res: any) => {
        const text = res.text.toLowerCase();
        return text.includes("help you choose") || text.includes("patio gas") || text.includes("butane");
      },
    },
  ];

  let passed = 0;
  for (const test of testCases) {
    try {
      const res = await processCustomerMessage(test.query, test.history || []);
      const ok = test.validate(res);
      if (ok) {
        console.log(`✅ [PASS] ${test.id} ("${test.query}")`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${test.id} ("${test.query}")`);
        console.error("Expected:", test.expected);
        console.error("Actual response:", res.text.slice(0, 150));
      }
    } catch (err) {
      console.error(`💥 [ERROR] ${test.id}:`, err);
    }
  }

  console.log(`\nResults: ${passed} / ${testCases.length} tests passed.`);
}

runTests();
