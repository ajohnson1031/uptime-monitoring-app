const path = require("path");
const fs = require("fs");
const _data = require("./data");
const https = require("https");
const http = require("http");
const helpers = require("./helpers");
const url = require("url");
const _logs = require("./logs");
const util = require("util");
const debug = util.debuglog("workers");

const workers = {};

workers.gatherAllChecks = () => {
  _data.list("checks", (err, checks) => {
    if (!err && !!checks && checks.length > 0) {
      checks.forEach((check) => {
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && !!originalCheckData) {
            workers.validateCheckData(originalCheckData);
          } else debug("Error reading one of the checks's data");
        });
      });
    } else {
      debug("Error: Could not find any checks to process.");
    }
  });
};

workers.validateCheckData = (checkData) => {
  checkData = typeof checkData == "object" && checkData !== null ? checkData : {};
  checkData.id = typeof checkData.id == "string" && checkData.id.length == 20 ? checkData.id : false;
  checkData.userPhone = typeof checkData.userPhone == "string" && checkData.userPhone.length == 10 ? checkData.userPhone : false;
  checkData.protocol = typeof checkData.protocol == "string" && ["http", "https"].includes(checkData.protocol) ? checkData.protocol : false;
  checkData.url = typeof checkData.url == "string" && checkData.url.length > 0 ? checkData.url : false;
  checkData.method = typeof checkData.method == "string" && ["post", "get", "put", "delete"].includes(checkData.method) ? checkData.method : false;
  checkData.successCodes =
    typeof checkData.successCodes == "object" && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;
  checkData.timeoutSeconds =
    typeof checkData.timeoutSeconds == "number" && checkData.timeoutSeconds % 1 === 0 && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5
      ? checkData.timeoutSeconds
      : false;

  // Set keys that may be undefined on first worker pass
  checkData.state = typeof checkData.state == "string" && ["up", "down"].includes(checkData.state) ? checkData.state : "down";
  checkData.lastChecked = typeof checkData.lastChecked == "number" && checkData.lastChecked > 0 ? checkData.lastChecked : false;

  // If all the checks pass, pass data to next process step
  if (checkData.id && checkData.userPhone && checkData.protocol && checkData.url && checkData.method && checkData.successCodes && checkData.timeoutSeconds) {
    workers.performCheck(checkData);
  } else {
    debug("Error: One of the checks is not properly formatted. Skipping it.");
  }
};

workers.performCheck = (checkData) => {
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  let outcomeSent = false;

  const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  const reqDetails = {
    protocol: `${checkData.protocol}:`,
    hostname,
    method: checkData.method.toUpperCase(),
    path,
    timeout: checkData.timeoutSeconds * 1000,
  };

  const _module = checkData.protocol == "http" ? http : https;
  const req = _module.request(reqDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on("error", (e) => {
    checkOutcome.error = { error: true, value: e };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on("timeout", (e) => {
    checkOutcome.error = { error: true, value: "timeout" };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};

workers.processCheckOutcome = (checkData, checkOutcome) => {
  const state = !checkOutcome.error && !!checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? "up" : "down";

  const alertWarranted = !!checkData.lastChecked && checkData.state !== state;

  const timeOfCheck = Date.now();
  const newCheckData = checkData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

  _data.update("checks", newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alertWarranted) {
        workers.alertUser(newCheckData);
      } else {
        debug("Check outcome has not changed. No alert needed.");
      }
    } else debug("Error trying to save updates to check.");
  });
};

workers.alertUser = (checkData) => {
  const msg = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`;

  helpers.sendTwilioSMS(checkData.userPhone, msg, (err) => {
    if (!err) {
      debug("Success: User was alerted to a status change in their check via SMS.", msg);
    } else debug("Error: Could not send alert to user.");
  });
};

workers.log = (checkData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  const logData = {
    check: checkData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };

  const logStr = JSON.stringify(logData);
  const logFile = checkData.id;
  _logs.append(logFile, logStr, (err) => {
    if (!err) {
      debug("Logging to file succeeded.");
    } else debug("Logging to file failed.");
  });
};

workers.rotateLogs = () => {
  _logs.list(false, (err, logs) => {
    if (!err && !!logs && logs.length > 0) {
      logs.forEach((log) => {
        const logId = log.replace(".log", "");
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, (err) => {
          if (!err) {
            _logs.truncate(logId, (err) => {
              if (!err) {
                debug("Success truncating log file.");
              } else debug("Error truncating log file");
            });
          } else debug("Error compressing one of the log files", err);
        });
      });
    } else debug("Error: Could not find any logs to rotate.");
  });
};

workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

workers.init = () => {
  // Send to console in yellow
  console.log("\x1b[33m%s\x1b[0m", "Background workers are running.");

  workers.gatherAllChecks();
  workers.loop();
  workers.rotateLogs();
  workers.logRotationLoop();
};

module.exports = workers;
