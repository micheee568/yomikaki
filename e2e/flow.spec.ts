import { expect, test } from "@playwright/test";

test("read, save a word, review it, see it on the dashboard", async ({ page }) => {
  // Add a reading.
  await page.goto("/library");
  await page.getByLabel("Title").fill("日記");
  await page.getByLabel("Japanese text").fill("昨日、友達と新しいレストランで寿司を食べました。");
  await page.getByRole("button", { name: "Add reading" }).click();
  await page.getByRole("link", { name: /日記/ }).click();

  // Click a conjugated verb: the dictionary form and meaning appear.
  await page.getByRole("button", { name: "食べました" }).click();
  const popup = page.getByRole("dialog", { name: "Word details" });
  await expect(popup).toContainText("食べる");
  await expect(popup).toContainText("to eat");

  // Save it; saving again adds no duplicate.
  await popup.getByRole("button", { name: "Save word" }).click();
  await expect(popup).toContainText("Saved to your vocabulary.");

  // It shows up in the vocabulary list with its sentence.
  await page.goto("/vocab");
  await expect(page.getByText("食べる").first()).toBeVisible();
  await expect(page.getByText("昨日、友達と新しいレストランで寿司を食べました。")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Vocabulary/ })).toContainText("1");

  // Review it.
  await page.goto("/review");
  await expect(page.getByText("食べる").first()).toBeVisible();
  await page.getByRole("button", { name: /Show answer/ }).click();
  await expect(page.getByText("to eat")).toBeVisible();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.getByText(/All caught up/)).toBeVisible();

  // The dashboard reflects the review.
  await page.goto("/");
  await expect(page.getByText("1 day", { exact: true })).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
});

test("rejects an empty reading without crashing", async ({ page, request }) => {
  const res = await request.post("/api/readings", { data: { title: "", content: "" } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toContain("Title is required");
  await page.goto("/library");
  await expect(page.getByRole("button", { name: "Add reading" })).toBeDisabled();
});
