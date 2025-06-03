import {test, expect, request, Page} from '@playwright/test';
import * as st from '../support/app.support';
import {env} from '../playwright.config';

let existingStudentName: string, existingStudentNickname: string;


test.describe.serial('Search Tests', () => {
    let page: Page;
    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
        await page.route(`${env.apiBaseURL}/student/all`, route => route.continue());

        page.goto('/login');
        await st.login(page);
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/all') && response.status() === 200
        );
        const data = await response.json();
        existingStudentName = data[0].userFullName;
        existingStudentNickname = data[0].nickname;

        expect(page.locator('[data-id="home-page-title"]')).toBeVisible();
    });
    test('Search for an exact student name', async () => {
        await page.route(`${env.apiBaseURL}/student/search`, route => route.continue());

        await expect(st.homePageSearchBar(page)).toBeVisible();
        await st.homePageSearchBar(page).fill(existingStudentName);
        await st.homePageSearchBar(page).press('Enter');
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/search')
        );
        const data = await response.json();
        await expect(st.studentCards(page)).toHaveCount(5); // Because one student card would have 5 student-card-
        const studentCard = st.studentCards(page).first();
        await expect(studentCard.locator(`[data-id="student-card-name-${data[0].id}"]`)).toHaveText(existingStudentName);
        await expect(studentCard.locator(`[data-id="student-card-nickname-${data[0].id}"]`)).toHaveText(existingStudentNickname);
    });
    test('Search for a student by nickname', async () => {
        await page.route(`${env.apiBaseURL}/student/search`, route => route.continue());

        await expect(st.homePageSearchBar(page)).toBeVisible();
        await st.homePageSearchBar(page).fill(existingStudentNickname);
        await st.homePageSearchBar(page).press('Enter');
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/search')
        );
        const data = await response.json();
        await expect(st.studentCards(page)).toHaveCount(5); // Because one student card would have 5 student-card-
        const studentCard = st.studentCards(page).first();
        await expect(studentCard.locator(`[data-id="student-card-name-${data[0].id}"]`)).toHaveText(existingStudentName);
        await expect(studentCard.locator(`[data-id="student-card-nickname-${data[0].id}"]`)).toHaveText(existingStudentNickname);
    });
    test('Search for a student with no results', async () => {
        await page.route(`${env.apiBaseURL}/student/search`, route => route.continue());

        await expect(st.homePageSearchBar(page)).toBeVisible();
        await st.homePageSearchBar(page).fill('NonExistentStudent');
        await st.homePageSearchBar(page).press('Enter');
        
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/search')
        );
        const data = await response.json();
        expect(data.length).toBe(0);
        const studentCards = st.studentCards(page);
        await expect(studentCards).toHaveCount(0);
        await expect(page.getByText('No students found matching')).toBeVisible();
    });
    test('Search with empty input', async () => {
        await page.route(`${env.apiBaseURL}/student/search`, route => route.continue());
        await expect(st.homePageSearchBar(page)).toBeVisible();
        await st.homePageSearchBar(page).fill('');
        await st.homePageSearchBar(page).press('Enter');
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/search')
        );
        const data = await response.json();
        expect(data.length).toBeGreaterThan(0);
        const studentCards = st.studentCards(page);
        await expect(studentCards).toHaveCount(data.length*5); // Because one student card would have 5 student-card-
    });
    test('Search with input matching multiple students', async () => {
        await page.route(`${env.apiBaseURL}/student/search`, route => route.continue());
        await expect(st.homePageSearchBar(page)).toBeVisible();
        await st.homePageSearchBar(page).fill('Test');
        await st.homePageSearchBar(page).press('Enter');
        const response = await page.waitForResponse(response =>
            response.url().includes('/student/search')
        );
        const data = await response.json();
        expect(data.length).toBeGreaterThan(1);
        const studentCards = st.studentCards(page);
        await expect(studentCards).toHaveCount(data.length*5); // Because one student card would have 5 student-card-
        for (let i = 0; i < data.length; i++) {
            const studentCard = page.locator(`[data-id="student-card-${data[i].id}"]`);
            await expect(studentCard.locator(`[data-id="student-card-name-${data[i].id}"]`)).toHaveText(data[i].userFullName);
        }
    });
});