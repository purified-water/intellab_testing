import http from "k6/http";
import { check } from "k6";

// Get environment variables
const API_URL = __ENV.API_URL;
const TESTER_EMAIL = __ENV.TESTER_EMAIL;
const TESTER_PASSWORD = __ENV.TESTER_PASSWORD;

if (!API_URL) {
  console.error("API_URL environment variable must be set");
  throw new Error("API_URL is not defined");
}
// Store the auth data statically so it's only fetched once across all VUs
const authData = {
  accessToken: null as string | null,
  userId: null as string | null,
  isInitialized: false,
};

/**
 * Login once and get both the access token and user ID
 * This is designed to be called at the beginning of your tests
 * Uses environment variables TESTER_EMAIL and TESTER_PASSWORD
 * @returns {Object} Object containing accessToken and userId
 */
export function login() {
  // Check if required environment variables are set
  if (!TESTER_EMAIL || !TESTER_PASSWORD) {
    console.error("TESTER_EMAIL and TESTER_PASSWORD environment variables must be set");
    return { accessToken: null, userId: null };
  }

  // If auth data is already initialized, return the cached data
  if (authData.isInitialized) {
    return {
      accessToken: authData.accessToken,
      userId: authData.userId,
    };
  }

  // Step 1: Login to get access token
  const loginRes = http.post(
    `${API_URL}/identity/auth/login`,
    JSON.stringify({
      email: TESTER_EMAIL,
      password: TESTER_PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  check(loginRes, { "logged in successfully": (r) => r.status === 200 });
  
  const token = loginRes.json("accessToken");
  if (!token) {
    console.error("Login failed, no access token received.");
    return { accessToken: null, userId: null };
  }

  // Step 2: Get user profile to get userId
  const getProfileRes = http.get(
    `${API_URL}/identity/profile/me`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  check(getProfileRes, { "profile fetched successfully": (r) => r.status === 200 });

  const userId = getProfileRes.json("userId");
  if (!userId) {
    console.error("Failed to get user ID from profile.");
    return { accessToken: token, userId: null };
  }

  // Cache the auth data
  authData.accessToken = token as string;
  authData.userId = userId as string;
  authData.isInitialized = true;

  return {
    accessToken: token,
    userId: userId,
  };
}

/**
 * Alternative method to set auth data manually if you already have tokens
 * Useful for testing with known credentials
 */
export function setAuthData(accessToken: string, userId: string) {
  authData.accessToken = accessToken;
  authData.userId = userId;
  authData.isInitialized = true;
}
