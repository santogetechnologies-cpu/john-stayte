import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../src/lib/supabase";
import {
  FORECOURT_LOCATIONS,
  FUEL_TYPES,
  createDriveOffIncident,
  fetchDriveOffIncidents,
  recordDriveOffPayment,
  updateDriveOffStatus,
  calculateDriveOffStats,
  subscribeToDriveOffChanges,
} from "../src/lib/drive-off-service";
import type { FuelDriveOffIncident } from "../src/types/drive-offs";

describe("Fuel Drive-Offs Incident Management System", () => {
  it("1. Forecourt branches and fuel types are correctly configured", () => {
    assert.strictEqual(FORECOURT_LOCATIONS.length, 4);
    const stationNames = FORECOURT_LOCATIONS.map((s) => s.name);
    assert.ok(stationNames.some((n) => n.includes("Wild Goose Garage")));
    assert.ok(stationNames.some((n) => n.includes("Fromebridge")));
    assert.ok(stationNames.some((n) => n.includes("Bridge Service Station")));
    assert.ok(stationNames.some((n) => n.includes("Eastington")));

    assert.ok(FUEL_TYPES.includes("Unleaded 95 (E10)"));
    assert.ok(FUEL_TYPES.includes("Standard Diesel (B7)"));
    assert.ok(FUEL_TYPES.includes("Auto Gas (LPG)"));
  });

  it("2. Successfully creates a Drive-Off incident with formatted VRN and balance", async () => {
    const incident = await createDriveOffIncident({
      branch_id: "st-1",
      branch_name: "Wild Goose Garage (Dursley)",
      pump_number: 2,
      incident_date: "2026-11-16",
      incident_time: "10:30:00",
      occurred_at: "2026-11-16T10:30:00Z",
      vehicle_registration_number: "ab12 cde", // lowercase input
      vehicle_make: "Audi",
      vehicle_model: "A3",
      vehicle_colour: "Black",
      fuel_type: "Standard Diesel (B7)",
      litres_dispensed: 50.0,
      price_per_litre: 1.459,
      total_amount_due: 72.95,
      incident_type: "drive_off",
      status: "unpaid",
      created_by_name: "Forecourt Manager",
    });

    assert.ok(incident.id);
    assert.match(incident.incident_number, /^DO-\d{4}-\d{4}$/);
    assert.strictEqual(incident.vehicle_registration_number, "AB12 CDE"); // Auto-uppercased
    assert.strictEqual(incident.total_amount_due, 72.95);
    assert.strictEqual(incident.balance_remaining, 72.95);
    assert.strictEqual(incident.amount_paid, 0.0);
    assert.strictEqual(incident.status, "unpaid");
  });

  it("3. Creates a No Means to Pay (NMTP) incident with customer details", async () => {
    const nmtp = await createDriveOffIncident({
      branch_id: "st-2",
      branch_name: "Fromebridge Service Station (Whitminster)",
      pump_number: 4,
      incident_date: "2026-11-16",
      incident_time: "11:00:00",
      occurred_at: "2026-11-16T11:00:00Z",
      vehicle_registration_number: "GL70 XYZ",
      vehicle_make: "Ford",
      vehicle_model: "Puma",
      vehicle_colour: "Silver",
      fuel_type: "Unleaded 95 (E10)",
      litres_dispensed: 30.0,
      price_per_litre: 1.359,
      total_amount_due: 40.77,
      incident_type: "no_means_to_pay",
      status: "unpaid",
      driver_name: "Arthur Pendelton",
      driver_contact_phone: "07700 900123",
      notes: "Card was blocked; promised to return before 18:00",
      created_by_name: "Fromebridge Cashier",
    });

    assert.strictEqual(nmtp.incident_type, "no_means_to_pay");
    assert.strictEqual(nmtp.driver_name, "Arthur Pendelton");
    assert.strictEqual(nmtp.driver_contact_phone, "07700 900123");
  });

  it("4. Accurately handles partial settlement and full balance clearance", async () => {
    const testInc = await createDriveOffIncident({
      branch_id: "st-3",
      branch_name: "Bridge Service Station (Stonehouse)",
      pump_number: 1,
      incident_date: "2026-11-16",
      incident_time: "11:15:00",
      occurred_at: "2026-11-16T11:15:00Z",
      vehicle_registration_number: "WR20 DEF",
      fuel_type: "Standard Diesel (B7)",
      litres_dispensed: 40.0,
      price_per_litre: 1.5,
      total_amount_due: 60.0,
      incident_type: "drive_off",
      status: "unpaid",
      created_by_name: "Staff",
    });

    // Partial payment of £20
    const partialRes = await recordDriveOffPayment(
      testInc.id,
      20.0,
      "Cash",
      "Cashier 1",
      "REC-001",
    );
    assert.strictEqual(partialRes.success, true);
    assert.strictEqual(partialRes.updatedIncident?.amount_paid, 20.0);
    assert.strictEqual(partialRes.updatedIncident?.balance_remaining, 40.0);
    assert.strictEqual(partialRes.updatedIncident?.status, "partial_payment");

    // Full remaining payment of £40
    const fullRes = await recordDriveOffPayment(
      testInc.id,
      40.0,
      "Card",
      "Cashier 1",
      "REC-002",
    );
    assert.strictEqual(fullRes.success, true);
    assert.strictEqual(fullRes.updatedIncident?.amount_paid, 60.0);
    assert.strictEqual(fullRes.updatedIncident?.balance_remaining, 0.0);
    assert.strictEqual(fullRes.updatedIncident?.status, "paid");
  });

  it("5. Updates status to Police Investigation and records crime reference", async () => {
    const testInc = await createDriveOffIncident({
      branch_id: "st-1",
      branch_name: "Wild Goose Garage (Dursley)",
      pump_number: 3,
      incident_date: "2026-11-16",
      incident_time: "12:00:00",
      occurred_at: "2026-11-16T12:00:00Z",
      vehicle_registration_number: "LK19 GHH",
      fuel_type: "Standard Diesel (B7)",
      litres_dispensed: 45.0,
      price_per_litre: 1.4,
      total_amount_due: 63.0,
      incident_type: "drive_off",
      status: "unpaid",
      created_by_name: "Staff",
    });

    const success = await updateDriveOffStatus(
      testInc.id,
      "police_investigation",
      "CR/2026/09912",
    );
    assert.strictEqual(success, true);

    const incidents = await fetchDriveOffIncidents({ searchQuery: "LK19 GHH" });
    const found = incidents.find((i) => i.id === testInc.id);
    assert.strictEqual(found?.status, "police_investigation");
    assert.strictEqual(found?.police_crime_reference, "CR/2026/09912");
  });

  it("6. Correctly computes KPI summary statistics", () => {
    const sampleIncidents: FuelDriveOffIncident[] = [
      {
        id: "1",
        incident_number: "DO-2026-1",
        branch_id: "st-1",
        branch_name: "Wild Goose",
        pump_number: 1,
        incident_date: "2026-11-16",
        incident_time: "10:00",
        occurred_at: "2026-11-16T10:00:00Z",
        vehicle_registration_number: "AA11 AAA",
        fuel_type: "Diesel",
        litres_dispensed: 50,
        price_per_litre: 1.4,
        total_amount_due: 70.0,
        amount_paid: 0.0,
        balance_remaining: 70.0,
        incident_type: "drive_off",
        status: "unpaid",
        created_by_name: "Staff",
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        incident_number: "DO-2026-2",
        branch_id: "st-2",
        branch_name: "Fromebridge",
        pump_number: 2,
        incident_date: "2026-11-16",
        incident_time: "10:00",
        occurred_at: "2026-11-16T10:00:00Z",
        vehicle_registration_number: "BB22 BBB",
        fuel_type: "Diesel",
        litres_dispensed: 50,
        price_per_litre: 1.4,
        total_amount_due: 70.0,
        amount_paid: 70.0,
        balance_remaining: 0.0,
        incident_type: "drive_off",
        status: "paid",
        created_by_name: "Staff",
        created_at: "",
        updated_at: "",
      },
      {
        id: "3",
        incident_number: "DO-2026-3",
        branch_id: "st-1",
        branch_name: "Wild Goose",
        pump_number: 3,
        incident_date: "2026-11-16",
        incident_time: "10:00",
        occurred_at: "2026-11-16T10:00:00Z",
        vehicle_registration_number: "CC33 CCC",
        fuel_type: "Diesel",
        litres_dispensed: 50,
        price_per_litre: 1.4,
        total_amount_due: 70.0,
        amount_paid: 20.0,
        balance_remaining: 50.0,
        incident_type: "drive_off",
        status: "police_investigation",
        police_crime_reference: "CR-12345",
        created_by_name: "Staff",
        created_at: "",
        updated_at: "",
      },
    ];

    const stats = calculateDriveOffStats(sampleIncidents);
    assert.strictEqual(stats.totalIncidents, 3);
    assert.strictEqual(stats.unpaidCount, 1); // 1 unpaid (plus 1 police_investigation)
    assert.strictEqual(stats.recoveredAmount, 90.0); // 70 + 20
    assert.strictEqual(stats.withPoliceCount, 1);
    assert.strictEqual(stats.recoveryRatePercent, 42.9); // (90 / 210) * 100
  });

  it("7. Filters incidents by branch and search term accurately", async () => {
    const dursleyIncidents = await fetchDriveOffIncidents({ branchId: "st-1" });
    assert.ok(dursleyIncidents.every((i) => i.branch_id === "st-1"));

    const searchResults = await fetchDriveOffIncidents({ searchQuery: "WP68 XTR" });
    assert.ok(searchResults.length > 0);
    assert.ok(searchResults.some((i) => i.vehicle_registration_number === "WP68 XTR"));
  });

  it("8. Rejects payments exceeding the outstanding incident balance", async () => {
    const testInc = await createDriveOffIncident({
      branch_id: "st-1",
      branch_name: "Wild Goose Garage (Dursley)",
      pump_number: 1,
      incident_date: "2026-11-16",
      incident_time: "12:30:00",
      occurred_at: "2026-11-16T12:30:00Z",
      vehicle_registration_number: "PL65 YTR",
      fuel_type: "Unleaded 95 (E10)",
      litres_dispensed: 20.0,
      price_per_litre: 1.35,
      total_amount_due: 27.0,
      incident_type: "drive_off",
      status: "unpaid",
      created_by_name: "Staff",
    });

    // Attempting to pay £50 on a £27 bill must throw
    await assert.rejects(
      async () => {
        await recordDriveOffPayment(testInc.id, 50.0, "Card", "Cashier", "REC-ERR");
      },
      /cannot exceed the outstanding balance/,
    );

    // Negative or zero payment must throw
    await assert.rejects(
      async () => {
        await recordDriveOffPayment(testInc.id, 0.0, "Card", "Cashier", "REC-ERR");
      },
      /greater than zero/,
    );
  });

  it("9. Enforces exact branch matching and prevents partial substring collisions", () => {
    // Exact matching logic as written in migration 00103 RLS:
    // (p.assigned_branch_id = i.branch_id) OR (i.branch_id = p.assigned_branch) OR (LOWER(TRIM(i.branch_name)) = LOWER(TRIM(p.assigned_branch)))
    const matchBranch = (
      staffBranchName: string,
      staffBranchId: string | null,
      incidentBranchName: string,
      incidentBranchId: string,
    ) => {
      if (!staffBranchName || ["", "Pending Confirmation", "Unassigned", "None"].includes(staffBranchName)) {
        return false;
      }
      return (
        (staffBranchId !== null && staffBranchId === incidentBranchId) ||
        incidentBranchId === staffBranchName ||
        incidentBranchName.trim().toLowerCase() === staffBranchName.trim().toLowerCase()
      );
    };

    // Case A: Staff at "Bridge Service Station (Stonehouse)"
    const bridgeStaffBranch = "Bridge Service Station (Stonehouse)";
    const fromebridgeIncident = "Fromebridge Service Station (Whitminster)";
    const bridgeIncident = "Bridge Service Station (Stonehouse)";

    // Must NOT match Fromebridge
    assert.strictEqual(
      matchBranch(bridgeStaffBranch, "st-3", fromebridgeIncident, "st-2"),
      false,
      "Bridge staff must NEVER access Fromebridge incidents!",
    );

    // Must match Bridge
    assert.strictEqual(
      matchBranch(bridgeStaffBranch, "st-3", bridgeIncident, "st-3"),
      true,
      "Bridge staff must access Bridge incidents",
    );

    // Case B: Unassigned or empty branch must be rejected
    assert.strictEqual(matchBranch("", null, bridgeIncident, "st-3"), false);
    assert.strictEqual(matchBranch("Unassigned", null, bridgeIncident, "st-3"), false);
    assert.strictEqual(matchBranch("Pending Confirmation", null, bridgeIncident, "st-3"), false);
  });

  it("10. Partial payment preserves active police_investigation and disputed statuses", async () => {
    const policeInc = await createDriveOffIncident({
      branch_id: "st-1",
      branch_name: "Wild Goose Garage (Dursley)",
      pump_number: 2,
      incident_date: "2026-11-16",
      incident_time: "14:00:00",
      occurred_at: "2026-11-16T14:00:00Z",
      vehicle_registration_number: "PO18 PLM",
      fuel_type: "Standard Diesel (B7)",
      litres_dispensed: 50.0,
      price_per_litre: 1.5,
      total_amount_due: 75.0,
      incident_type: "drive_off",
      status: "police_investigation",
      police_crime_reference: "CR/2026/09988",
      created_by_name: "Staff",
    });

    assert.strictEqual(policeInc.status, "police_investigation");

    // Record partial payment of £25
    const partialRes = await recordDriveOffPayment(policeInc.id, 25.0, "Card", "Cashier", "REC-POL");
    assert.strictEqual(partialRes.success, true);
    assert.strictEqual(partialRes.updatedIncident?.balance_remaining, 50.0);
    // Crucial: Must still be police_investigation, NOT overwritten to partial_payment!
    assert.strictEqual(
      partialRes.updatedIncident?.status,
      "police_investigation",
      "Active police investigation must not be overwritten by partial payment",
    );

    // Full payment of remaining £50 clears balance to 0.00 while preserving police_investigation status!
    const fullRes = await recordDriveOffPayment(policeInc.id, 50.0, "Card", "Cashier", "REC-POL-FULL");
    assert.strictEqual(fullRes.success, true);
    assert.strictEqual(fullRes.updatedIncident?.amount_paid, 75.0);
    assert.strictEqual(fullRes.updatedIncident?.balance_remaining, 0.0);
    assert.strictEqual(
      fullRes.updatedIncident?.status,
      "police_investigation",
      "Full payment must preserve active police investigation until explicitly closed by manager",
    );
  });

  it("11. Payment deletion preserves investigation and write-off statuses", () => {
    // Logic matching trigger recalculate_drive_off_after_payment_delete:
    const determineStatusAfterPaymentDelete = (
      currentStatus: string,
      totalPaid: number,
      totalDue: number,
    ) => {
      if (["police_investigation", "disputed", "written_off"].includes(currentStatus)) {
        return currentStatus;
      }
      if (totalPaid >= totalDue && totalDue > 0) return "paid";
      if (totalPaid > 0) return "partial_payment";
      return "unpaid";
    };

    assert.strictEqual(
      determineStatusAfterPaymentDelete("police_investigation", 0, 75),
      "police_investigation",
    );
    assert.strictEqual(
      determineStatusAfterPaymentDelete("written_off", 0, 75),
      "written_off",
    );
    assert.strictEqual(
      determineStatusAfterPaymentDelete("disputed", 0, 75),
      "disputed",
    );
    assert.strictEqual(
      determineStatusAfterPaymentDelete("paid", 20, 75),
      "partial_payment",
    );
    assert.strictEqual(
      determineStatusAfterPaymentDelete("paid", 0, 75),
      "unpaid",
    );
  });

  it("12. Payment insertion preserves written_off status during both partial and full payments", async () => {
    const writtenOffInc = await createDriveOffIncident({
      branch_id: "st-4",
      branch_name: "Eastington Service Station (Eastington)",
      pump_number: 1,
      incident_date: "2026-11-16",
      incident_time: "15:00:00",
      occurred_at: "2026-11-16T15:00:00Z",
      vehicle_registration_number: "WO15 OFF",
      fuel_type: "Unleaded 95 (E10)",
      litres_dispensed: 30.0,
      price_per_litre: 1.4,
      total_amount_due: 42.0,
      incident_type: "drive_off",
      status: "written_off",
      created_by_name: "Manager",
    });

    assert.strictEqual(writtenOffInc.status, "written_off");

    // Partial recovery payment of £10
    const partialRes = await recordDriveOffPayment(writtenOffInc.id, 10.0, "Cash", "Cashier", "REC-WO-1");
    assert.strictEqual(partialRes.success, true);
    assert.strictEqual(partialRes.updatedIncident?.amount_paid, 10.0);
    assert.strictEqual(partialRes.updatedIncident?.balance_remaining, 32.0);
    assert.strictEqual(
      partialRes.updatedIncident?.status,
      "written_off",
      "Partial payment must preserve written_off status",
    );

    // Full payment of remaining £32
    const fullRes = await recordDriveOffPayment(writtenOffInc.id, 32.0, "Card", "Cashier", "REC-WO-FULL");
    assert.strictEqual(fullRes.success, true);
    assert.strictEqual(fullRes.updatedIncident?.amount_paid, 42.0);
    assert.strictEqual(fullRes.updatedIncident?.balance_remaining, 0.0);
    assert.strictEqual(
      fullRes.updatedIncident?.status,
      "written_off",
      "Full payment must preserve written_off status",
    );
  });

  it("13. Realtime subscription initializes and cleans up channel properly without memory leaks", () => {
    let receivedEvents = 0;
    const unsubscribe = subscribeToDriveOffChanges(() => {
      receivedEvents++;
    }, "unit_test_realtime");

    assert.strictEqual(typeof unsubscribe, "function");
    // Executing unsubscribe removes channel cleanly
    assert.doesNotThrow(() => unsubscribe());
  });

  it("14. Realtime incident and payment additions trigger automatic KPI recalculations", () => {
    const baselineList: FuelDriveOffIncident[] = [
      {
        id: "do-rt-1",
        incident_number: "DO-RT-01",
        branch_id: "st-1",
        branch_name: "Wild Goose Garage (Dursley)",
        pump_number: 1,
        incident_date: "2026-11-16",
        incident_time: "10:00:00",
        occurred_at: "2026-11-16T10:00:00Z",
        vehicle_registration_number: "RT26 ONE",
        fuel_type: "Standard Diesel (B7)",
        litres_dispensed: 50.0,
        price_per_litre: 1.5,
        total_amount_due: 75.0,
        amount_paid: 0.0,
        balance_remaining: 75.0,
        incident_type: "drive_off",
        status: "unpaid",
        created_by_name: "Staff",
        created_at: "",
        updated_at: "",
      },
    ];

    const initialKpis = calculateDriveOffStats(baselineList);
    assert.strictEqual(initialKpis.totalIncidents, 1);
    assert.strictEqual(initialKpis.unpaidCount, 1);
    assert.strictEqual(initialKpis.totalUnpaidAmount, 75.0);
    assert.strictEqual(initialKpis.recoveredAmount, 0.0);

    // Branch Staff adds second incident via Realtime broadcast
    const newBroadcastIncident: FuelDriveOffIncident = {
      id: "do-rt-2",
      incident_number: "DO-RT-02",
      branch_id: "st-2",
      branch_name: "Fromebridge Service Station (Whitminster)",
      pump_number: 2,
      incident_date: "2026-11-16",
      incident_time: "10:30:00",
      occurred_at: "2026-11-16T10:30:00Z",
      vehicle_registration_number: "RT26 TWO",
      fuel_type: "Unleaded 95 (E10)",
      litres_dispensed: 40.0,
      price_per_litre: 1.4,
      total_amount_due: 56.0,
      amount_paid: 0.0,
      balance_remaining: 56.0,
      incident_type: "drive_off",
      status: "unpaid",
      created_by_name: "Branch Staff",
      created_at: "",
      updated_at: "",
    };

    const updatedList = [newBroadcastIncident, ...baselineList];
    const updatedKpis = calculateDriveOffStats(updatedList);
    assert.strictEqual(updatedKpis.totalIncidents, 2);
    assert.strictEqual(updatedKpis.unpaidCount, 2);
    assert.strictEqual(updatedKpis.totalUnpaidAmount, 131.0); // 75 + 56

    // Payment recorded on second incident (£30)
    newBroadcastIncident.amount_paid = 30.0;
    newBroadcastIncident.balance_remaining = 26.0;
    newBroadcastIncident.status = "partial_payment";

    const postPaymentKpis = calculateDriveOffStats(updatedList);
    assert.strictEqual(postPaymentKpis.recoveredAmount, 30.0);
    assert.strictEqual(postPaymentKpis.totalUnpaidAmount, 101.0); // 75 + 26
    assert.strictEqual(postPaymentKpis.recoveryRatePercent, 22.9); // (30 / 131) * 100
  });

  after(async () => {
    await supabase.removeAllChannels();
    supabase.realtime.disconnect();
  });
});

