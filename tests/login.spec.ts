import {test, expect, request, Page} from '@playwright/test';
import * as lg from '../support/app.support';
import {env} from '../playwright.config';
import variables from '../fixtures/variable.json';

test.describe.serial('Login Flow Tests', () => {
    let page: Page;
    
    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
        await page.goto('/login');
    });
    
    test.beforeEach(async () => {
        await page.route(`${env.apiBaseURL}/auth/login`, route => route.continue());
    });
    
    test('Validate UI elements on the login page', async () => {
        await expect(lg.LoginForm.container(page)).toBeVisible();
        await expect(lg.LoginForm.formTitle(page)).toHaveText('Login');
        await expect(lg.LoginForm.username(page)).toBeVisible();
        await expect(lg.LoginForm.password(page)).toBeVisible();
        await expect(lg.LoginForm.submitButton(page)).toBeVisible();
        await expect(lg.LoginForm.registerLink(page)).toBeVisible();
        await expect(lg.LoginForm.registerLink(page)).toHaveText('Register here');
    });
    
    test('Login with valid credentials', async () => {
        await lg.LoginForm.username(page).fill(variables.student.username);
        await lg.LoginForm.password(page).fill(variables.student.password);
        await lg.LoginForm.submitButton(page).click();
        
        const response = await page.waitForResponse(response =>
            response.url().includes('/auth/login')
        );
        expect(response.ok()).toBeTruthy();
        
        // Wait for navigation and page load
        await page.waitForURL('/');
        await page.waitForLoadState('networkidle');
        
        // Ensure we can see the user profile button
        await expect(lg.userProfileButton(page)).toBeVisible();
    });
    
    test('Logout functionality', async () => {
        // Ensure we're still on the home page
        await expect(page).toHaveURL('/');
        
        await expect(lg.userProfileButton(page)).toBeVisible();
        await lg.userProfileButton(page).click();
        
        await expect(lg.logoutButton(page)).toBeVisible();
        await lg.logoutButton(page).click();
        
        await expect(page).toHaveURL('/login');
        await expect(lg.LoginForm.container(page)).toBeVisible();
    });
    test('Login with invalid credentials', async () => {
        await lg.LoginForm.username(page).fill('invalidUser');
        await lg.LoginForm.password(page).fill('invalidPassword');
        const dialogPromise = new Promise(resolve => {
            page.once('dialog', async dialog => {
                expect(dialog.message()).toContain('Invalid username or password');
                await dialog.dismiss();
                resolve(dialog);
            });
        });
        const [response] = await Promise.all([
            page.waitForResponse(response => response.url().includes('/auth/login')),
            lg.LoginForm.submitButton(page).click()
        ]);
        expect(response.ok()).toBeFalsy();
        expect(response.status()).toBe(401); 
        await dialogPromise;
    });
    test('Login with valid username and invalid password', async () => {
        await lg.LoginForm.username(page).fill(variables.student.username);
        await lg.LoginForm.password(page).fill('wrongPassword');

        const dialogPromise = new Promise(resolve => {
            page.once('dialog', async dialog => {
                expect(dialog.message()).toContain('Invalid username or password');
                await dialog.dismiss();
                resolve(dialog);
            });
        });
        const [response] = await Promise.all([
            page.waitForResponse(response => response.url().includes('/auth/login')),
            lg.LoginForm.submitButton(page).click()
        ]);
        expect(response.ok()).toBeFalsy();
        expect(response.status()).toBe(401);

        await dialogPromise;
    });
    test('Click Register Here link', async () => {
        await expect(lg.LoginForm.registerLink(page)).toBeVisible();
        await lg.LoginForm.registerLink(page).click();
        await expect(page).toHaveURL('/register');
        await expect(lg.RegisterForm.container(page)).toBeVisible();
    });
    
    test.afterAll(async () => {
        await page.close();
    });
});