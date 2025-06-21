import http from "k6/http";
import { check, sleep } from "k6";
import { login } from "./auth";

// Get API URL from environment variable
const API_URL = __ENV.API_URL;

if (!API_URL) {
  console.error("API_URL environment variable must be set");
  throw new Error("API_URL is not defined");
}

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "60s", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    // Fail the test if more than 1% of requests result in an error.
    http_req_failed: ["rate<0.01"],
    // Fail the test if 95% of requests don't complete within 2000ms.
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  // Use the reusable login function to get authentication data from environment variables
  const { accessToken, userId } = login();

  // If authentication fails, stop the test
  if (!accessToken || !userId) {
    console.error("Authentication failed, cannot proceed with test.");
    return;
  }
  // Step 2: submit code
  const payload = JSON.stringify({
    code: "import sys\ndef singleNumber(nums):\n    my_map = {}\n    \n    for num in nums:\n        if num not in my_map:\n            my_map[num] = 1\n        else:\n            my_map[num] += 1\n    \n    for key, value in my_map.items():\n        if value == 1:\n            return key\n    \n    return -1\n",
    submitOrder: 1,
    programmingLanguage: "Python (3.8.1)",
    problemId: "e608ebb7-07ef-4a2f-8081-92e5993e6118",
    userId: userId,
  });

  const submitRes = http.post(
    `${API_URL}/problem/problem-submissions`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  console.log("r status", submitRes.status);
  check(submitRes, {
    "submission returns 200": (r) => r.status === 200,
    "submission does not return 500": (r) => r.status !== 500,
  });

  sleep(5);
}
