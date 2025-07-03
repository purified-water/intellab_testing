import http from "k6/http";
import { check, sleep } from "k6";
import { login } from "./auth";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Get API URL from environment variable
const API_URL = __ENV.API_URL;

if (!API_URL) {
  console.error("API_URL environment variable must be set");
  throw new Error("API_URL is not defined");
}

export const options = {
  // Load testing with gradual ramp-up to test auto-scaling
  // stages: [
  //   { duration: "1m", target: 2 },
  //   { duration: "5m", target: 30 },
  //   { duration: "5m", target: 30 },
  //   { duration: "1m", target: 0 },
  // ],

  // // Stress testing with constant load
  // stages: [
  //   { duration: "1m", target: 5 },
  //   { duration: "1m", target: 15 },
  //   { duration: "2m", target: 25 },
  //   { duration: "2m", target: 35 },
  //   { duration: "1m", target: 0 },
  // ],

  // Spike testing with sudden load increase
  stages: [
    { duration: "30s", target: 1 },
    { duration: "30s", target: 30 }, // sudden spike
    { duration: "1m", target: 30 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    // Allow higher error rate during load testing
    http_req_failed: ["rate<0.10"],
    // Fail the test if 95% of requests don't complete within 5000ms
    http_req_duration: ["p(95)<5000"],
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
    code: `
    def twoSum(nums: list[int], target: int) -> list[int]:
      for i in range(len(nums)):
          for j in range(i + 1, len(nums)):
              if nums[j] == target - nums[i]:
                  return [i, j]
      # Return an empty list if no solution is found
      return []`,
    submitOrder: 1,
    programmingLanguage: "Python (3.8.1)",
    problemId: "591b3457-2157-4d61-b03d-d53f8666342c",
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

  sleep(15);
}

export function handleSummary(data) {
  // return {
  //   "summary-load-2.html": htmlReport(data),
  //   stdout: textSummary(data, { indent: " ", enableColors: false }),
  // };
  return {
    "summary-spike-1.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: false }),
  };
}
