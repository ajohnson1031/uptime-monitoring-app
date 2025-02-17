// Creating and exporting configuration vars

// Container for all envs
const environments = {
  staging: {
    HTTP_PORT: 3000,
    HTTPS_PORT: 3001,
    ENV_NAME: "staging",
    SECRET_KEY: "TH15 15 A S3CR3T",
    MAX_CHECKS: 5,
    TWILIO: {
      ACCOUNT_SID: "ACb32d411ad7fe886aac54c665d25e5c5d",
      AUTH_TOKEN: "9455e3eb3109edc12e3d8c92768f7a67",
      FROM_PHONE: "+15005550006",
    },
    TEMPLATE_GLOBALS: {
      appName: "UptimeChecker",
      companyName: "NotARealCompany, Inc.",
      yearCreated: "2025",
      baseUrl: "http://localhost:3000/",
    },
  },
  production: {
    HTTP_PORT: 4400,
    HTTPS_PORT: 4401,
    ENV_NAME: "production",
    SECRET_KEY: "TH15 15 A S3CR3T",
    MAX_CHECKS: 5,
    TWILIO: {
      ACCOUNT_SID: "ACb32d411ad7fe886aac54c665d25e5c5d",
      AUTH_TOKEN: "9455e3eb3109edc12e3d8c92768f7a67",
      FROM_PHONE: "+15005550006",
    },
    TEMPLATE_GLOBALS: {
      appName: "UptimeChecker",
      companyName: "NotARealCompany, Inc.",
      yearCreated: "2025",
      baseUrl: "http://localhost:4400/",
    },
  },
};

// Determine which environment was passed as a command-line arg
const currentEnv = typeof process.env.NODE_ENV == "string" ? process.env.NODE_ENV.toLowerCase() : "";

// Check that the current env exists as a key in our environments object
var exportedEnv = typeof environments[currentEnv] == "object" ? environments[currentEnv] : environments.staging;

module.exports = exportedEnv;
