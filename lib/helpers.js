const crypto = require("crypto");
const config = require("./config");
const https = require("https");
const querystring = require("querystring");
const path = require("path");
const fs = require("fs");

const helpers = {
  hash: (str) => {
    if (typeof str == "string" && str.length > 0) {
      const hash = crypto.createHmac("sha256", config.SECRET_KEY).update(str).digest("hex");
      return hash;
    } else return false;
  },
  parseJsonToObject: (str) => {
    try {
      const obj = JSON.parse(str);
      return obj;
    } catch (error) {
      return {};
    }
  },
  createRandomString: (len) => {
    const strLen = typeof len == "number" && len > 0 ? len : false;

    if (strLen) {
      const possChars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let str = "";

      for (i = 0; i < strLen; i++) {
        const randChar = possChars.charAt(Math.floor(Math.random() * possChars.length));
        str += randChar;
      }

      return str;
    } else return false;
  },
  sendTwilioSMS: (phone, msg, cb) => {
    // Validate the parameters
    phone = typeof phone == "string" && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof msg == "string" && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;

    if (!!phone && !!msg) {
      // Configure the request payload
      const payload = {
        From: config.TWILIO.FROM_PHONE,
        To: `+1${phone}`,
        Body: msg,
      };

      const strPayload = querystring.stringify(payload);

      const reqDetails = {
        protocol: "https:",
        hostname: "api.twilio.com",
        method: "POST",
        path: `/2010-04-01/Accounts/${config.TWILIO.ACCOUNT_SID}/Messages.json`,
        auth: `${config.TWILIO.ACCOUNT_SID}:${config.TWILIO.AUTH_TOKEN}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(strPayload),
        },
      };

      const req = https.request(reqDetails, (res) => {
        // Grab status of sent req
        const status = res.statusCode;

        if (status == 200 || status == 201) cb(false);
        else cb("Status code returned was: ", status);
      });

      // Bind to the error event so it doesn't get thrown
      req.on("error", (e) => {
        cb(e);
      });

      // Add payload to req
      req.write(strPayload);

      // Send the req
      req.end();
    } else cb("Given parameters were missing or invalid");
  },
  getTemplate: (name, data, cb) => {
    name = typeof name == "string" && name.length > 0 ? name : false;
    data = typeof data == "object" && data !== null ? data : {};
    if (name) {
      var templateDir = path.join(__dirname, "/../templates");
      fs.readFile(`${templateDir}/${name}.html`, "utf-8", (err, str) => {
        if (!err && !!str && str.length > 0) {
          const finalStr = helpers.interpolate(str, data);
          cb(false, finalStr);
        } else {
          cb("No template could be found.");
        }
      });
    } else {
      cb("A valid template name was not specified.");
    }
  },
  interpolate: (str, data) => {
    str = typeof str == "string" && str.length > 0 ? str : "";
    data = typeof data == "object" && data !== null ? data : {};

    for (var keyname in config.TEMPLATE_GLOBALS) {
      if (config.TEMPLATE_GLOBALS.hasOwnProperty(keyname)) {
        data[`global.${keyname}`] = config.TEMPLATE_GLOBALS[keyname];
      }
    }

    for (var key in data) {
      if (data.hasOwnProperty(key) && typeof data[key] == "string") {
        var replace = data[key];
        var find = `{${key}}`;
        str = str.replace(find, replace);
      }
    }

    return str;
  },
  addUniversalTemplates: (str, data, cb) => {
    str = typeof str == "string" && str.length > 0 ? str : "";
    data = typeof data == "object" && data !== null ? data : {};
    helpers.getTemplate("_header", data, (err, headerStr) => {
      if (!err && headerStr) {
        helpers.getTemplate("_footer", data, (err, footerStr) => {
          if (!err && footerStr) {
            const fullStr = `${headerStr}${str}${footerStr}`;
            cb(false, fullStr);
          } else {
            cb("Could not find the footer template.");
          }
        });
      } else {
        cb("Could not find the header template.");
      }
    });
  },
  getStaticAsset: (filename, cb) => {
    filename = typeof filename == "string" && filename.length > 0 ? filename : false;
    if (filename) {
      const publicDir = path.join(__dirname, "/../public/");
      fs.readFile(`${publicDir}${filename}`, (err, data) => {
        if (!err && data) {
          cb(false, data);
        } else {
          cb("No file could be found.");
        }
      });
    } else {
      cb("A valid filename was not specified.");
    }
  },
};

module.exports = helpers;
