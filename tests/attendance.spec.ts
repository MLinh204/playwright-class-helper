import { test, expect, request, Page } from "@playwright/test";
import * as at from "../support/app.support";
import { env } from "../playwright.config";
import variables from "../fixtures/variable.json";

let attendanceId: string;
const userFullName = variables.student.fullName;
let token: string;
test.describe.serial("Attendance Tests", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    const apiContext = await request.newContext();
    const result = await at.loginAPI(apiContext); // Login as admin
    token = result.token;

    //create a test attendance list
    const attendanceTest = await at.createAttendanceList(
      apiContext,
      token,
      "Test Attendance List"
    );
    attendanceId = attendanceTest.id;
    await apiContext.dispose();

    page.goto("/login");
    await at.login(page);
    expect(page.locator('[data-id="home-page-title"]')).toBeVisible();
    await page.locator('[data-id="navigation-attendance-link"]').click();
    await page.waitForResponse(
      (response) =>
        response.url().includes(`${env.apiBaseURL}/attendanceList/all`) &&
        response.status() === 200
    );
  });
  test.afterAll(async () => {
    const apiContext = await request.newContext();
    const result = await at.loginAPI(apiContext);
    const token = result.token;
    // Delete the test attendance list
    await at.deleteAttendanceList(apiContext, token, attendanceId);
    await apiContext.dispose();
  });
  test("Check attendance page elements", async () => {
    // await page.route('**/api/attendanceList/all', route => route.continue());
    expect(
      page.locator(`[data-id="attendance-card-${attendanceId}"]`)
    ).toBeVisible();
    await expect(
      page.locator('[data-id="attendance-page-title"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-id="attendance-search-input"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-id="attendance-cards-grid"]')
    ).toBeVisible();
  });
  test("Open attendance list", async () => {
    const attendanceCard = page.locator(
      `[data-id="attendance-card-${attendanceId}"]`
    );
    await expect(attendanceCard).toBeVisible();
    await attendanceCard
      .locator(`[data-id="attendance-card-check-link-${attendanceId}"]`)
      .click();
    await expect(
      page.locator('[data-id="attendance-detail-table"]')
    ).toBeVisible();
  });
  test.describe("List contains students - state: Active", () => {
    test("Should be able to see attendance check", async () => {
      expect(
        page
          .locator('[data-id^="attendance-student-name-"]')
          .getByText(`${userFullName}(You)`)
      ).toBeVisible();
    });
    test("Should highlight current student", async () => {
      const id = await getStudentCardId(page);
      console.log("Current ID:", id);
      const studentCard = page.locator(
        `[data-id="attendance-record-row-${id}"]`
      );
      await expect(studentCard).toBeVisible();
      // validate studentCard has color bg-blue-50
      await expect(studentCard).toHaveClass(/bg-blue-50/);
    });
    test("Should be able to check attendance", async () => {
      const checkbox = await getCheckBox(page);
      await expect(checkbox).toBeEnabled();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      const studentCard = await getStudentCard(page);
      await expect(studentCard.getByText('Attended')).toBeVisible();
    });
    test("Should be able to uncheck attendance", async () => {
      const checkbox = await getCheckBox(page);
      await expect(checkbox).toBeChecked();
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
      const studentCard = await getStudentCard(page);
      await expect(studentCard.getByText('Absent')).toBeVisible();
    });
    test("Should not be able to check attendance for another student", async () => {
        const otherStudentCard = await getStudentCardOfOtherStudent(page);
        const otherStudentCardAttribute = await otherStudentCard.getAttribute("data-id");
        const otherStudentCardId = otherStudentCardAttribute.replace("attendance-record-row-", "");
        const otherCheckbox = otherStudentCard.locator(
          `[data-id^="attendance-checkbox-${otherStudentCardId}"]`
        );
        await expect(otherCheckbox).toBeDisabled();
    });
  });
  test.describe("List contains students - state: closed", () => {
    test.beforeAll(async () => {
      await page.goBack();
      await page.waitForResponse(
        (response) =>
          response.url().includes(`${env.apiBaseURL}/attendanceList/all`) &&
          response.status() === 200
      );
      await page.route(
        `${env.apiBaseURL}/attendanceList/${attendanceId}`,
        async (route) => {
          const response = await route.fetch();
          const originalBody = await response.json();
          console.log("Original Body:", originalBody);
          const modifiedBody = {
            ...originalBody,
            status: "closed",
          };

          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(modifiedBody),
          });
        }
      );
      const attendanceCard = page.locator(
        `[data-id="attendance-card-${attendanceId}"]`
      );
      await attendanceCard
        .locator(`[data-id="attendance-card-check-link-${attendanceId}"]`)
        .click();
      await page.waitForResponse(
        (response) =>
          response.url().includes(`${env.apiBaseURL}/attendanceList/${attendanceId}`) &&
          response.status() === 200
      );
      await expect(
        page.locator('[data-id="attendance-detail-table"]')
      ).toBeVisible();
    });
    test("Should not be able to check attendance", async () => {
      const checkbox = await getCheckBox(page);
      await expect(checkbox).toBeDisabled();
    });
    test("Should not be able to check attendance for another student", async () => {
        const otherStudentCard = await getStudentCardOfOtherStudent(page);
        const otherStudentCardAttribute = await otherStudentCard.getAttribute("data-id");
        const otherStudentCardId = otherStudentCardAttribute.replace("attendance-record-row-", "");
        const otherCheckbox = otherStudentCard.locator(
          `[data-id^="attendance-checkbox-${otherStudentCardId}"]`
        );
        await expect(otherCheckbox).toBeDisabled();
    });
  });
  test.describe("List contains no students", () => {
    test.beforeAll(async () => {
      await page.goBack();
      await page.waitForResponse(
        (response) =>
          response.url().includes(`${env.apiBaseURL}/attendanceList/all`) &&
          response.status() === 200
      );
      await page.route(
        `${env.apiBaseURL}/attendanceRecord/list/${attendanceId}`,
        route => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify([]), // Return an empty array to simulate no students
            });
        });
        const attendanceCard = page.locator(
            `[data-id="attendance-card-${attendanceId}"]`
        );
        await attendanceCard
          .locator(`[data-id="attendance-card-check-link-${attendanceId}"]`)
          .click();
      await page.waitForResponse(
        (response) =>
          response.url().includes(`${env.apiBaseURL}/attendanceRecord/list/${attendanceId}`) &&
          response.status() === 200
      );
  });
    test("Should display no students message", async () => {
        await expect(
            page.getByText('No attendance records found')
        ).toBeVisible();
    });
});
});


async function getStudentCardId(page: Page) {
  const studentNameLocator = page
    .locator('[data-id^="attendance-student-name-"]')
    .getByText(`${userFullName}(You)`);
  const attribute = await studentNameLocator.getAttribute("data-id");
  const id = attribute.replace("attendance-student-name-", "");
  return id;
}
async function getStudentCard(page: Page) {
  const id = await getStudentCardId(page);
  return page.locator(`[data-id="attendance-record-row-${id}"]`);
}
async function getCheckBox(page: Page) {
  const id = await getStudentCardId(page);
  const studentCard = page.locator(`[data-id="attendance-record-row-${id}"]`);
  const checkbox = studentCard.locator(`[data-id="attendance-checkbox-${id}"]`);
  return checkbox;
}
async function getStudentCardOfOtherStudent(page: Page) {
  const studentNameLocator = page
    .locator('[data-id^="attendance-student-name-"]')
    .filter({ hasNotText: `${userFullName}(You)` })
    .first();
  const attribute = await studentNameLocator.getAttribute("data-id");
  const id = attribute.replace("attendance-student-name-", "");
  return page.locator(`[data-id="attendance-record-row-${id}"]`);
}
