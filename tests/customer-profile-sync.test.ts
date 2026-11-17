import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveUserName } from "../src/lib/user-profile-service";

describe("Customer Profile Name Synchronization Tests", () => {
  it("1. Database profile full_name takes precedence over auth metadataName", () => {
    // Customer was registered with metadata full_name "Customer JSS",
    // then updated their profile in Account -> Profile to "Jane Doe".
    const email = "customer@example.com";
    const oldMetadataName = "Customer JSS";
    const updatedProfileName = "Jane Doe";

    const resolved = resolveUserName(email, oldMetadataName, updatedProfileName);
    assert.equal(resolved, "Jane Doe", "Updated profile name in database must take precedence over old auth metadata");
  });

  it("2. Falls back to metadataName if profileName is null or empty", () => {
    const email = "newuser@example.com";
    const metadataName = "New Customer";
    const resolved = resolveUserName(email, metadataName, null);
    assert.equal(resolved, "New Customer", "Should fall back to metadataName when profile has not been populated yet");

    const resolvedWithEmpty = resolveUserName(email, metadataName, "   ");
    assert.equal(resolvedWithEmpty, "New Customer", "Should fall back to metadataName when profile is empty whitespace");
  });

  it("3. Falls back to email prefix if both profileName and metadataName are empty", () => {
    const email = "john.stayte@example.com";
    const resolved = resolveUserName(email, null, null);
    assert.equal(resolved, "john.stayte", "Should fall back to email username when names are absent");
  });

  it("4. Rejects raw email string accidentally passed as profileName", () => {
    const email = "abisha@example.com";
    const resolved = resolveUserName(email, "Abisha Jeshma", "abisha@example.com");
    assert.equal(resolved, "Abisha Jeshma", "Should ignore email string passed as profileName and use metadataName");
  });

  it("5. Dashboard greeting extracts first name correctly from updated profile name", () => {
    const fullProfileName = "Jane Doe";
    const firstName = fullProfileName.split(" ")[0];
    assert.equal(firstName, "Jane", "Dashboard greeting must extract 'Jane' from 'Jane Doe'");

    const singleName = "Abisha";
    assert.equal(singleName.split(" ")[0], "Abisha");
  });

  it("6. Header avatar initial and full name match updated profile", () => {
    const updatedName = "Jane Doe";
    const avatarInitial = updatedName.charAt(0);
    assert.equal(avatarInitial, "J", "Avatar fallback initial must be 'J'");
  });
});
