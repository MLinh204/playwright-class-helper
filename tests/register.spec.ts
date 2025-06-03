import {test, expect, request, Page} from '@playwright/test';
import * as rg from '../support/app.support';
import {env} from '../playwright.config';
import crypto from 'node:crypto';

const uuid = crypto.randomUUID();
const existingUserName = 'test-register';
const userName = `testUser+${uuid}`;
const password = 'TestPassword123!';
let authToken: string;
const age = Math.floor(Math.random() * (50 - 18 + 1)) + 18;
let createdUserId: string;
let registrationListId: string;

test.describe.serial('Register page', () => {
    let page: Page;
    
    test.beforeAll(async ({browser}) => {
        const apiContext = await request.newContext();
        const result = await rg.loginAPI(apiContext);
        authToken = result.token;

        // Add the user to the register list
        const response = await rg.addToRegisterList(apiContext, authToken, userName);
        registrationListId = response.id;
        await apiContext.dispose();
        
        // Create a shared page for all tests
        page = await browser.newPage();
    });
    
    test.afterAll(async () => {
        console.log('Running afterAll - should only see this once');
        const apiContext = await request.newContext();
        try {
            // Only delete if a user was actually created in the successful registration test
            if (createdUserId) {
                console.log(`Deleting user with ID: ${createdUserId}`);
                await rg.deleteUser(apiContext, authToken, createdUserId);
            } else {
                console.log('No user ID to delete');
            }
            if (registrationListId) {
                console.log(`Deleting registration list entry with ID: ${registrationListId}`);
                await rg.deleteFromRegisterList(apiContext, authToken, registrationListId);
            } else {
                console.log('No registration list ID to delete');
            }
        } catch (error) {
            console.log('Error during cleanup:', error);
        } finally {
            await apiContext.dispose();
        }
        
        // Close the shared page
        await page.close();
    });
    
    test.beforeEach(async () => {
        await page.route(`${env.apiBaseURL}/auth/register`, route => route.continue());
        await page.goto('/register');
    });
    
    test('Register successfully', async () => {
        await test.step('Check if the register page is displayed', async () => {
            await expect(rg.RegisterForm.container(page)).toBeVisible();
            await expect(rg.RegisterForm.formTitle(page)).toHaveText('Register');
        });
        await test.step('Fill in the registration form', async () => {
            await rg.RegisterForm.fullName(page).fill('Test User');
            await rg.RegisterForm.gender(page).selectOption({label: 'Boy'});
            await rg.RegisterForm.nickname(page).fill('tester');
            await rg.RegisterForm.age(page).fill(age.toString());
            await rg.RegisterForm.address(page).fill('123 Test Street');
            await rg.RegisterForm.username(page).fill(userName);
            await rg.RegisterForm.password(page).fill(password);
        });
        await test.step('Submit the registration form', async () => {
            await rg.RegisterForm.submitButton(page).click();
        });
        await test.step('Check if the registration was successful', async () => {
            const response = await page.waitForResponse(response =>
                response.url().includes('/auth/register') && response.status() === 200
            );
            createdUserId = (await response.json()).user.user_id;
            console.log(`Registered user ID: ${createdUserId}`);
            expect(response.ok()).toBeTruthy();
        });
    });
    
    test('Register with existing username', async () => {
        await test.step('Fill in the registration form with existing username', async () => {
            await rg.RegisterForm.fullName(page).fill('Test User');
            await rg.RegisterForm.gender(page).selectOption({label: 'Boy'});
            await rg.RegisterForm.nickname(page).fill('tester');
            await rg.RegisterForm.age(page).fill(age.toString());
            await rg.RegisterForm.address(page).fill('123 Test Street');
            await rg.RegisterForm.username(page).fill(existingUserName);
            await rg.RegisterForm.password(page).fill(password);
        });
        await test.step('Submit the registration form and check error', async () => {
            const dialogPromise = new Promise(resolve => {
                page.once('dialog', async dialog => {
                    expect(dialog.message()).toContain('Username already exists');
                    await dialog.dismiss();
                    resolve(dialog);
                });
            });
            await rg.RegisterForm.submitButton(page).click();
            const response = await page.waitForResponse(response =>
                response.url().includes('/auth/register')
            );
            expect(response.ok()).toBeFalsy();
            expect(response.status()).toBe(400);
            await dialogPromise;
        });
    });
    
    test('Register with user not allowed to register', async () => {
        await test.step('Fill in the registration form with a user not allowed to register', async () => {
            await rg.RegisterForm.fullName(page).fill('Test User');
            await rg.RegisterForm.gender(page).selectOption({label: 'Boy'});
            await rg.RegisterForm.nickname(page).fill('tester');
            await rg.RegisterForm.age(page).fill(age.toString());
            await rg.RegisterForm.address(page).fill('123 Test Street');
            await rg.RegisterForm.username(page).fill('thisUserIsNotAllowed');
            await rg.RegisterForm.password(page).fill(password);
        });
        await test.step('Submit the registration form and check error', async () => {
            const dialogPromise = new Promise(resolve => {
                page.once('dialog', async dialog => {
                    expect(dialog.message()).toContain('Registration is not allowed for this user');
                    await dialog.dismiss();
                    resolve(dialog);
                });
            });
            await rg.RegisterForm.submitButton(page).click();
            const response = await page.waitForResponse(response =>
                response.url().includes('/auth/register') 
            );
            expect(response.ok()).toBeFalsy();
            expect(response.status()).toBe(400);
            await dialogPromise;
        });  
    });
    
    test('Click Login Here link', async () => {
        await test.step('Check if the Login Here link is displayed', async () => {
            await expect(rg.RegisterForm.loginLink(page)).toBeVisible();
        });
        await test.step('Click the Login Here link', async () => {
            await rg.RegisterForm.loginLink(page).click();
            await expect(page).toHaveURL('/login');
        });
    });
});