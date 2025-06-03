import { test, expect, Page, APIRequestContext } from "@playwright/test";
import variables from "../fixtures/variable.json";
import { env } from "../playwright.config";

export const RegisterForm = {
  container: (page: Page) =>
    page.locator('[data-id="register-page-container"]'),
  formTitle: (page: Page) => page.locator('[data-id="register-page-title"]'),
  fullName: (page: Page) =>
    page.locator('[data-id="auth-form-fullname-input"]'),
  gender: (page: Page) => page.locator('[data-id="auth-form-gender-select"]'),
  nickname: (page: Page) =>
    page.locator('[data-id="auth-form-nickname-input"]'),
  age: (page: Page) => page.locator('[data-id="auth-form-age-input"]'),
  address: (page: Page) => page.locator('[data-id="auth-form-address-input"]'),
  username: (page: Page) =>
    page.locator('[data-id="auth-form-username-input"]'),
  password: (page: Page) =>
    page.locator('[data-id="auth-form-password-input"]'),
  submitButton: (page: Page) => page.getByRole("button", { name: "Register" }),
  loginLink: (page: Page) => page.locator('[data-id="register-login-link"]'),
};
export const logoutButton = (page: Page) => {
  return page.locator('[data-id="navigation-logout-button"]');
};
export const userProfileButton = (page: Page) => {
  return page.locator('[data-id="navigation-profile-button"]');
};
export const homePageNavBar = (page: Page) => {
  return page.locator('[data-id="navigation-container"]');
};
export const homePageSearchBar = (page: Page) => {
  return page.locator('[data-id="home-search-input"]');
};
export const studentCards = (page: Page) => {
  return page.locator('[data-id^="student-card-"]');
};

export const LoginForm = {
  container: (page: Page) => page.locator('[data-id="login-page-container"]'),
  formTitle: (page: Page) => page.locator('[data-id="login-page-title"]'),
  username: (page: Page) =>
    page.locator('[data-id="auth-form-username-input"]'),
  password: (page: Page) =>
    page.locator('[data-id="auth-form-password-input"]'),
  submitButton: (page: Page) => page.getByRole("button", { name: "Login" }),
  registerLink: (page: Page) => page.locator('[data-id="login-register-link"]'),
};

export async function loginAPI(
  api: APIRequestContext,
  user?: { userName: string; password: string }
) {
  const response = await api.post(`${env.apiBaseURL}/auth/login`, {
    data: {
      username: variables.teacher.username || user?.userName,
      password: variables.teacher.password || user?.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Login failed with status ${response.status()}`);
  }

  const data = await response.json();
  return data;
}
export async function login(
  page: Page,
  user?: { userName: string; password: string }
) {
  await page.route("**/api/auth/login", (route) => route.continue());
  expect(LoginForm.container(page)).toBeVisible();

  const username = variables.student.username || user?.userName;
  const password = variables.student.password || user?.password;

  await LoginForm.username(page).waitFor({ state: "visible" });
  await LoginForm.password(page).waitFor({ state: "visible" });

  await LoginForm.username(page).focus();
  await page.waitForTimeout(100);
  await LoginForm.username(page).clear();
  await LoginForm.username(page).type(username, { delay: 50 });

  // Wait and verify username is still there
  await page.waitForTimeout(500);
  await expect(LoginForm.username(page)).toHaveValue(username);

  // Now fill password
  await LoginForm.password(page).focus();
  await page.waitForTimeout(100);
  await LoginForm.password(page).clear();
  await LoginForm.password(page).type(password, { delay: 50 });

  // Final verification both fields are filled
  await expect(LoginForm.username(page)).toHaveValue(username);
  await expect(LoginForm.password(page)).toHaveValue(password);

  await LoginForm.submitButton(page).click();
  const response = await page.waitForResponse(
    (response) =>
      response.url().includes("/auth/login") && response.status() === 200
  );
  expect(response.ok()).toBeTruthy();
}

export async function addToRegisterList(
  api: APIRequestContext,
  token: String,
  username: string
) {
  const response = await api.post(`${env.apiBaseURL}/registrationList`, {
    data: {
      username: username,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `Add to register list failed with status ${response.status()}`
    );
  }
  const data = await response.json();
  return data;
}

export async function deleteFromRegisterList(
  api: APIRequestContext,
  token: String,
  id: string
) {
  const response = await api.delete(
    `${env.apiBaseURL}/registrationList/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok()) {
    throw new Error(
      `Delete from register list failed with status ${response.status()}`
    );
  }
  return response;
}

export async function deleteUser(
  api: APIRequestContext,
  token: String,
  id: string
) {
  const response = await api.delete(`${env.apiBaseURL}/user/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    throw new Error(`Delete user failed with status ${response.status()}`);
  }
  return response;
}

export async function createAttendanceList(
  api: APIRequestContext,
  token: String,
  title: string
) {
  const response = await api.post(`${env.apiBaseURL}/attendanceList`, {
    data: {
      title: title,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `Create attendance list failed with status ${response.status()}`
    );
  }
  const data = await response.json();
  return data;
}
export async function deleteAttendanceList(
  api: APIRequestContext,
  token: String,
  id: string
) {
  const response = await api.delete(`${env.apiBaseURL}/attendanceList/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `Delete attendance list failed with status ${response.status()}`
    );
  }
  return response;
}

export function requestOptions(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}
