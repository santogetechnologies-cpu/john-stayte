import { processCustomerMessage } from "../src/lib/jss-assistant-engine";

async function runTestSuite() {
  const testCases = [
    { q: "Do you sell gas for BBQs?", note: "BBQ gas / Patio gas inquiry" },
    { q: "How much is Calor 13kg?", note: "Direct price check Calor 13kg" },
    { q: "I need a propane cylinder for my patio heater", note: "Patio heater propane cylinder" },
    { q: "I need a propane bottle", note: "General propane bottle" },
    { q: "Can I exchange my empty cylinder?", note: "Refill exchange policy" },
    { q: "I don't have an empty cylinder, can I still buy one?", note: "New purchase without empty cylinder" },
    { q: "Can I order a refill without an empty cylinder?", note: "Refill vs new purchase distinction" },
    { q: "What filling station is open Sunday?", note: "Sunday opening hours at filling stations" },
    { q: "Where is my order?", note: "Order tracking" },
    { q: "When will my delivery arrive?", note: "Delivery timing and schedule" },
    { q: "What brands do you sell?", note: "Brand catalogue overview" },
    { q: "Do you sell CO2?", note: "Air Liquide CO2 gas inquiry" },
    { q: "Do you have CO2 O-rings?", note: "Specific accessory product inquiry" },
    { q: "Show me Pub Gas products", note: "Pub Gas range" },
    { q: "What is the cheapest gas cylinder?", note: "Price ranking" },
    { q: "Do you deliver to me?", note: "Delivery coverage Gloucestershire" },
    { q: "What are your opening hours?", note: "Contact & depot hours" },
    { q: "I want to apply for a gas account", note: "Trade account application" },
    { q: "What happens after I place an order?", note: "Order lifecycle & delivery OTP" },
    { q: "Which products are currently in stock?", note: "Stock availability" },
    { q: "What is the difference between propane and butane?", note: "Gas science and usage difference" }
  ];

  console.log("========================================================================");
  console.log("TESTING 21 CONVERSATIONAL REAL CUSTOMER QUESTIONS");
  console.log("========================================================================\n");

  for (let i = 0; i < testCases.length; i++) {
    const { q, note } = testCases[i];
    console.log(`[Test ${i + 1}/21] "${q}" (${note})`);
    const res = await processCustomerMessage(q);
    console.log(`-> Response:\n${res.text.slice(0, 200)}...`);
    if (res.products && res.products.length > 0) {
      console.log(`-> Attached Products (${res.products.length}):`, res.products.map(p => `${p.name} (£${p.price})`).slice(0, 3).join(" | "));
    }
    if (res.stations && res.stations.length > 0) {
      console.log(`-> Attached Stations (${res.stations.length}):`, res.stations.map(s => s.name).join(" | "));
    }
    if (res.actions && res.actions.length > 0) {
      console.log(`-> Actions:`, res.actions.map(a => `[${a.label} -> ${a.url || "prompt"}]`).join(" "));
    }
    console.log("------------------------------------------------------------------------\n");
  }

  // Multi-turn test
  console.log("========================================================================");
  console.log("TESTING MULTI-TURN FOLLOW-UP CONVERSATIONS");
  console.log("========================================================================");
  
  const turn1User = "Do you have Calor gas?";
  console.log(`\nUser: "${turn1User}"`);
  const turn1Res = await processCustomerMessage(turn1User);
  console.log(`Assistant:\n${turn1Res.text.slice(0, 150)}...`);

  const history = [
    { id: "1", role: "user" as const, content: turn1User, timestamp: Date.now() },
    { id: "2", role: "assistant" as const, content: turn1Res.text, timestamp: Date.now() }
  ];

  const turn2User = "How much is the 13kg one?";
  console.log(`\nUser (Follow-up): "${turn2User}"`);
  const turn2Res = await processCustomerMessage(turn2User, history);
  console.log(`Assistant:\n${turn2Res.text}`);
  console.log("Attached products:", turn2Res.products?.map(p => `${p.name} (£${p.price})`));

  console.log("\n========================================================================");
  console.log("ALL REAL CONVERSATIONAL TESTS COMPLETED SUCCESSFULLY!");
  console.log("========================================================================");
}

runTestSuite();
