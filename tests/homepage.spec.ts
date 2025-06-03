import {test, expect, request, Page} from '@playwright/test';
import {env} from '../playwright.config';
import * as hp from '../support/app.support';

test.describe.serial('Homepage Tests', () => {
    let page: Page;
    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
        page.goto('/login');
        await hp.login(page);
        expect(page.locator('[data-id="home-page-title"]')).toBeVisible();
    });

    test('Check homepage elements', async () => {
        await expect(hp.homePageNavBar(page)).toBeVisible();
        await expect(hp.userProfileButton(page)).toBeVisible();
        await expect(hp.homePageSearchBar(page)).toBeVisible();
    });
    test('Viewing home page with students', async () => {
        await page.route(`${env.apiBaseURL}/student/all`, route => route.continue());
        await page.goto('/');
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/all') && response.status() === 200
        );
        const data = await response.json();
        const firstStudent = data[0];
        const firstStudentCard = hp.studentCards(page).first();
        await expect(firstStudentCard).toBeVisible();
        await expect(firstStudentCard.locator(`[data-id="student-card-name-${firstStudent.id}"]`)).toHaveText(firstStudent.userFullName);
        await expect(firstStudentCard.locator(`[data-id="student-card-nickname-${firstStudent.id}"]`)).toHaveText(firstStudent.nickname);
    });
    test('Viewing home page with no students', async () => {
        // Simulate no students by intercepting the API call
        await page.route(`${env.apiBaseURL}/student/all`, route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        }
        );
        await page.goto('/');

        const response = await page.waitForResponse(response =>
            response.url().includes('/student/all') && response.status() === 200
        );
        const data = await response.json();
        expect(data.length).toBe(0);
        const studentCards = hp.studentCards(page);
        await expect(studentCards).toHaveCount(0);
        await expect(page.getByText('No students available')).toBeVisible();
    });
});