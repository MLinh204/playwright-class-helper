import { test, expect } from "@playwright/test";
import variables from "../../fixtures/variable.json";
import { env } from "../../playwright.config";
import * as us from "../../support/app.support";
import { randomUUID } from "crypto";
import { request } from "http";

let defaultUserToken: string;
let adminToken: string;
const testUserName = "testUser" + randomUUID().slice(0, 8);
const testUserPassword = "testPassword";
let testUser = {
  username: testUserName,
  password: testUserPassword,
  id: "",
};
let registrationListId: string;

// Skip the entire test suite for now
test.describe.skip("User API Tests", () => {
  test.beforeAll(async ({ request }) => {
    //login as default user
    const response = await request.post(`${env.apiBaseURL}/auth/login`, {
      data: {
        username: variables.student.username,
        password: variables.student.password,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    defaultUserToken = data.token;
    expect(defaultUserToken).toBeDefined();
    //login as admin
    const adminResponse = await request.post(`${env.apiBaseURL}/auth/login`, {
      data: {
        username: variables.teacher.username,
        password: variables.teacher.password,
      },
    });
    expect(adminResponse.ok()).toBeTruthy();
    const adminData = await adminResponse.json();
    adminToken = adminData.token;
    expect(adminToken).toBeDefined();
    // Create a registration list item for the test user
    const registrationListResponse = await request.post(
      `${env.apiBaseURL}/registrationList`,
      {
        data: {
          username: testUserName,
        },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    expect(registrationListResponse.ok()).toBeTruthy();
    const registrationListData = await registrationListResponse.json();
    expect(registrationListData.username).toEqual(testUserName);
    registrationListId = registrationListData.id;
  });
  test.afterAll(async ({ request }) => {
    // Delete the test user
    const deleteUserResponse = await request.delete(
      `${env.apiBaseURL}/user/${testUser.id}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    expect(deleteUserResponse.ok()).toBeTruthy();
    // Delete the registration list item
    const deleteRegistrationListResponse = await request.delete(
      `${env.apiBaseURL}/registrationList/${registrationListId}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    expect(deleteRegistrationListResponse.ok()).toBeTruthy();
  });
  test("Should create a user with admin user", async ({ request }) => {
    const response = await request.post(`${env.apiBaseURL}/user`, {
      data: {
        username: testUserName,
        password: testUserPassword,
        role_id: 2,
      },
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.username).toEqual(testUserName);
    testUser.id = data.id;
  });
  test("Should create failed with default user", async ({ request }) => {
    const response = await request.post(`${env.apiBaseURL}/user`, {
      data: {
        username: testUserName + "-Should Failed",
        password: testUserPassword,
        role_id: 2,
      },
      headers: {
        Authorization: `Bearer ${defaultUserToken}`,
      },
    });
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.message).toContain("Access denied");
  });
  test("Should create failed with existing username", async ({ request }) => {
    const response = await request.post(`${env.apiBaseURL}/user`, {
      data: {
        username: variables.student.username, // Using an existing username
        password: testUserPassword,
        role_id: 2,
      },
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    expect(response.status()).toBe(500);
    const data = await response.json();
    expect(data.error.message).toContain(
      `Duplicate entry '${variables.student.username}' for key 'username'`
    );
  });
  test("Should get user by id", async ({ request }) => {
    const response = await request.get(
      `${env.apiBaseURL}/user/${testUser.id}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.username).toEqual(testUserName);
    expect(data.id).toEqual(testUser.id);
  });
  test("Should get user by username", async ({ request }) => {
    const response = await request.get(
      `${env.apiBaseURL}/user?username=${testUserName}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.username).toEqual(testUserName);
    expect(data.id).toEqual(testUser.id);
  });
});
