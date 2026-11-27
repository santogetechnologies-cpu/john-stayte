import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { countNewUnreviewedApplications } from "../src/lib/application-service";

describe("Admin Dashboard & Sidebar Applications Notification Badge", () => {
  it("counts only newly received unreviewed applications (PENDING/SUBMITTED with null reviewed_at & reviewed_by)", () => {
    const sampleRows = [
      { id: "app-1", status: "PENDING", reviewed_by: null, reviewed_at: null },
      { id: "app-2", status: "SUBMITTED", reviewed_by: null, reviewed_at: null },
      // Duplicate ID must not double-count
      { id: "app-1", status: "PENDING", reviewed_by: null, reviewed_at: null },
      // Already reviewed / actioned applications must NOT be counted
      { id: "app-3", status: "APPROVED", reviewed_by: "admin-1", reviewed_at: "2026-11-26T10:00:00Z" },
      { id: "app-4", status: "DECLINED", reviewed_by: "admin-1", reviewed_at: "2026-11-26T10:05:00Z" },
      { id: "app-5", status: "REJECTED", reviewed_by: "admin-1", reviewed_at: "2026-11-26T10:05:00Z" },
      { id: "app-6", status: "MORE_INFO_NEEDED", reviewed_by: "admin-1", reviewed_at: "2026-11-26T10:10:00Z" },
      // Edge case: status PENDING but already touched/reviewed by an admin
      { id: "app-7", status: "PENDING", reviewed_by: "admin-1", reviewed_at: "2026-11-26T10:15:00Z" },
      { id: "app-8", status: "NOT_COMPLETED", reviewed_by: null, reviewed_at: null },
    ];

    assert.equal(countNewUnreviewedApplications(sampleRows), 2);
  });

  it("returns 0 when there are no new unreviewed applications", () => {
    assert.equal(countNewUnreviewedApplications([]), 0);
    assert.equal(
      countNewUnreviewedApplications([
        { id: "app-9", status: "APPROVED", reviewed_by: "admin-1", reviewed_at: "2026-11-26T10:00:00Z" },
      ]),
      0,
    );
  });

  it("wires the same countNewUnreviewedApplications & Supabase Realtime subscription in both AdminPortalLayout and AdminDashboardView", () => {
    const layoutSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/admin/AdminPortalLayout.tsx"),
      "utf8",
    );
    const dashboardSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/admin/AdminDashboardView.tsx"),
      "utf8",
    );

    assert.ok(layoutSrc.includes('badgeKey: "applicationsPending"'));
    assert.ok(layoutSrc.includes("countNewUnreviewedApplications"));
    assert.ok(layoutSrc.includes('table: "gas_customer_applications"'));

    assert.ok(dashboardSrc.includes('title: "Applications"'));
    assert.ok(dashboardSrc.includes("newApplicationsCount > 0 ? newApplicationsCount : undefined"));
    assert.ok(dashboardSrc.includes("countNewUnreviewedApplications"));
    assert.ok(dashboardSrc.includes('table: "gas_customer_applications"'));
  });
});
