const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

// Define our handlers
const handlers = {
  ping: (data, cb) => {
    // The purpose of this is to make sure the application is still alive
    cb(200);
  },

  /*
   * HTML Handlers
   */

  index: (data, cb) => {
    if (data.method == "get") {
      const templateData = {
        "head.title": "This is the title",
        "head.description": "This is the meta description.",
        "body.title": "Hello templated world",
        "body.class": "index",
      };
      // read in the index template as a string
      helpers.getTemplate("index", templateData, (err, str) => {
        if (!err && str) {
          helpers.addUniversalTemplates(str, templateData, (err, str) => {
            if (!err && str) {
              cb(200, str, "html");
            } else {
              cb(500, undefined, "html");
            }
          });
        } else {
          cb(500, undefined, "html");
        }
      });
    } else {
      cb(405, undefined, "html");
    }
  },
  favicon: (data, cb) => {
    if (data.method == "get") {
      helpers.getStaticAsset("favicon.ico", (err, data) => {
        if (!err && data) {
          cb(200, data, "favicon");
        } else {
          cb(500);
        }
      });
    } else {
      cb(405);
    }
  },
  public: (data, cb) => {
    if (data.method == "get") {
      const trimmedAssetName = data.trimmedPath.replace("public/", "");

      if (trimmedAssetName.length > 0) {
        helpers.getStaticAsset(trimmedAssetName, (err, data) => {
          if (!err && data) {
            let contentType = "plain";

            if (trimmedAssetName.indexOf("css") > -1) {
              contentType = "css";
            }

            if (trimmedAssetName.indexOf("png") > -1) {
              contentType = "png";
            }

            if (trimmedAssetName.indexOf("jpg") > -1) {
              contentType = "jpg";
            }

            if (trimmedAssetName.indexOf("ico") > -1) {
              contentType = "favicon";
            }

            cb(200, data, contentType);
          } else {
            cb(404);
          }
        });
      } else {
        cb(404);
      }
    } else {
      cb(405);
    }
  },
  /*
   * JSON API Handlers
   */
  users: (data, cb) => {
    const ACCEPTABLE_METHODS = ["post", "get", "put", "delete"];
    if (ACCEPTABLE_METHODS.indexOf(data.method) > -1) {
      handlers._users[data.method](data, cb);
    } else {
      cb(405);
    }
  },
  _users: {
    post: (data, cb) => {
      // Checked required fields exist in payload
      const firstName = typeof data.payload.firstName == "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
      const lastName = typeof data.payload.lastName == "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
      const phone = typeof data.payload.phone == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
      const password = typeof data.payload.password == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
      const tos = typeof data.payload.tos == "boolean" && !!data.payload.tos ? data.payload.tos : false;

      if (firstName && lastName && phone && password && tos) {
        // Ensure unique user
        _data.read("users", phone, (err, data) => {
          if (err) {
            var hashedPassword = helpers.hash(password);

            if (hashedPassword) {
              const userObj = {
                firstName,
                lastName,
                phone,
                hashedPassword,
                tos: true,
              };

              _data.create("users", phone, userObj, (err) => {
                if (!err) {
                  cb(200);
                } else {
                  console.log(err);
                  cb(500, { Error: "Could not create the new user" });
                }
              });
            } else {
              cb(500, { Error: "Could not create the new user." });
            }
          } else {
            cb(400, { Error: "A user with that phone number already exists." });
          }
        });
      } else {
        cb(400, { Error: "Missing required fields." });
      }
    },
    get: (data, cb) => {
      // Check validity of phone number
      const { phone: queryPhone } = data.query;
      const phone = typeof queryPhone == "string" && queryPhone.trim().length == 10 ? queryPhone : false;

      if (!!phone) {
        // Get token from the headers
        const token = typeof data.headers.token == "string" ? data.headers.token : false;
        // Verify token is valid for the phone number provided
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
          if (!!tokenIsValid) {
            _data.read("users", phone, (err, data) => {
              if (!err && !!data) {
                // remove hashed pw from user object before returning
                delete data.hashedPassword;
                cb(200, data);
              } else cb(404);
            });
          } else cb(403, { Error: "Missing required token in header or token is invalid." });
        });
      } else cb(400, { Error: "Missing required field." });
    },
    put: (data, cb) => {
      const { phone: payloadPhone } = data.payload;
      const phone = typeof payloadPhone == "string" && payloadPhone.trim().length == 10 ? payloadPhone : false;

      const firstName = typeof data.payload.firstName == "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
      const lastName = typeof data.payload.lastName == "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
      const password = typeof data.payload.password == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

      if (!!phone) {
        if (firstName || lastName || password) {
          const token = typeof data.headers.token == "string" ? data.headers.token : false;

          handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (!!tokenIsValid) {
              _data.read("users", phone, (err, userData) => {
                if (!err && !!data) {
                  if (firstName) {
                    userData.firstName = firstName;
                  }

                  if (lastName) {
                    userData.lastName = lastName;
                  }

                  if (password) {
                    userData.password = helpers.hash(password);
                  }

                  _data.update("users", phone, userData, (err) => {
                    if (!err) {
                      cb(200);
                    } else cb(500, { Error: "Could not update the user" });
                  });
                } else cb(400, { Error: "The specified user does not exist." });
              });
            } else cb(403, { Error: "Missing required token in header or token is invalid." });
          });
        } else cb(400, { Error: "Missing fields to update." });
      } else {
        cb(400, { Error: "Missing required field." });
      }
    },
    delete: (data, cb) => {
      // Check validity of phone number
      const { phone: queryPhone } = data.query;
      const phone = typeof queryPhone == "string" && queryPhone.trim().length == 10 ? queryPhone : false;

      if (!!phone) {
        const token = typeof data.headers.token == "string" ? data.headers.token : false;
        // Verify token is valid for the phone number provided
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
          if (!!tokenIsValid) {
            _data.read("users", phone, (err, userData) => {
              if (!err && !!data) {
                _data.delete("users", phone, (err) => {
                  if (!err) {
                    // Delete checks associated with user
                    const userChecks = typeof userData.checks == "object" && userData.checks instanceof Array ? userData.checks : [];
                    const checksToDelete = userChecks.length;

                    if (checksToDelete > 0) {
                      let checksDeleted = 0;
                      let deletionErrs = false;

                      userChecks.forEach((checkId) => {
                        _data.delete("checks", checkId, (err) => {
                          if (!!err) {
                            deletionErrs = true;
                          }
                          checksDeleted++;
                          if (checksDeleted == checksToDelete) {
                            if (!deletionErrs) cb(200);
                            else cb(500, { Error: "Error encountered while deleting the user's checks. All checks may not have been deleted successfully." });
                          }
                        });
                      });
                    } else {
                      cb(200);
                    }
                  } else cb(500, { Error: "Could not delete the specified user." });
                });
              } else cb(400, { Error: "Could not find specified user." });
            });
          } else cb(403, { Error: "Missing required token in header or token is invalid." });
        });
      } else cb(400, { Error: "Missing required field." });
    },
  },
  notfound: (data, cb) => {
    cb(404);
  },
  tokens: (data, cb) => {
    const ACCEPTABLE_METHODS = ["post", "get", "put", "delete"];
    if (ACCEPTABLE_METHODS.indexOf(data.method) > -1) {
      handlers._tokens[data.method](data, cb);
    } else {
      cb(405);
    }
  },
  _tokens: {
    post: (data, cb) => {
      const phone = typeof data.payload.phone == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
      const password = typeof data.payload.password == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

      if (!!phone && !!password) {
        _data.read("users", phone, (err, userData) => {
          if (!err && !!userData) {
            const hashedPassword = helpers.hash(password);
            if (hashedPassword == userData.hashedPassword) {
              // Create randomized token with 1hr expiry
              const tokenId = helpers.createRandomString(20);
              const expires = Date.now() + 1000 * 60 * 60;

              const tokenObj = {
                phone,
                id: tokenId,
                expires,
              };

              _data.create("tokens", tokenId, tokenObj, (err) => {
                if (!err) {
                  cb(200, tokenObj);
                } else cb(500, { Error: "Could not create the new token." });
              });
            } else cb(400, { Error: "Password did not match the specified user's stored password." });
          } else cb(400, { Error: "Could not find the specified user." });
        });
      } else cb(400, { Error: "Missing required fields." });
    },
    get: (data, cb) => {
      const { id: dataId } = data.query;
      const id = typeof dataId == "string" && dataId.trim().length == 20 ? dataId : false;

      if (!!id) {
        _data.read("tokens", id, (err, tokenData) => {
          if (!err && !!tokenData) {
            cb(200, tokenData);
          } else cb(404);
        });
      } else cb(400, { Error: "Missing required field." });
    },
    put: (data, cb) => {
      const { id: payloadId, extend: payloadExtend } = data.payload;
      const id = typeof payloadId == "string" && payloadId.trim().length == 20 ? payloadId : false;
      const extend = typeof payloadExtend == "boolean" && payloadExtend == true ? payloadExtend : false;

      if (!!id && !!extend) {
        _data.read("tokens", id, (err, tokenData) => {
          if (!err && !!tokenData) {
            if (tokenData.expires > Date.now()) {
              tokenData.expires = Date.now() + 1000 * 60 * 60;
              _data.update("tokens", id, tokenData, (err) => {
                if (!err) {
                  cb(200);
                } else cb(500, { Error: "Could not update the token's expiration" });
              });
            } else cb(400, { Error: "The token has already expired and cannot be extended." });
          } else cb(400, { Error: "Specified token does not exist." });
        });
      } else cb(400, { Error: "Missing required field(s) or field(s) are invalid." });
    },
    delete: (data, cb) => {
      const { id: queryId } = data.query;
      const id = typeof queryId == "string" && queryId.trim().length == 20 ? queryId : false;

      if (!!id) {
        _data.read("tokens", id, (err, tokenData) => {
          if (!err && !!tokenData) {
            _data.delete("tokens", id, (err) => {
              if (!err) {
                cb(200);
              } else cb(500, { Error: "Could not delete the specified token." });
            });
          } else cb(404, { Error: "Could not find specified token." });
        });
      } else cb(400, { Error: "Missing required field." });
    },
    verifyToken: (id, phone, cb) => {
      _data.read("tokens", id, (err, tokenData) => {
        if (!err && tokenData) {
          if (tokenData.phone == phone && tokenData.expires > Date.now()) cb(true);
          else cb(false);
        } else cb(false);
      });
    },
  },
  checks: (data, cb) => {
    const ACCEPTABLE_METHODS = ["post", "get", "put", "delete"];
    if (ACCEPTABLE_METHODS.indexOf(data.method) > -1) {
      handlers._checks[data.method](data, cb);
    } else {
      cb(405);
    }
  },
  _checks: {
    post: (data, cb) => {
      const { protocol: payloadProtocol, url: payloadUrl, method: payloadMethod, successCodes: payloadSuccessCodes, timeoutSeconds: payloadTimeoutSeconds } = data.payload;

      const protocol = typeof payloadProtocol == "string" && ["https", "http"].includes(payloadProtocol) ? payloadProtocol : false;
      const url = typeof payloadUrl == "string" && payloadUrl.length > 0 ? payloadUrl : false;
      const method = typeof payloadMethod == "string" && ["post", "get", "put", "delete"].includes(payloadMethod) ? payloadMethod : false;
      const successCodes = typeof payloadSuccessCodes == "object" && payloadSuccessCodes instanceof Array && payloadSuccessCodes.length > 0 ? payloadSuccessCodes : false;
      const timeoutSeconds =
        typeof payloadTimeoutSeconds == "number" && payloadTimeoutSeconds % 1 === 0 && payloadTimeoutSeconds >= 1 && payloadTimeoutSeconds <= 5 ? payloadTimeoutSeconds : false;

      if (protocol && url && method && successCodes && timeoutSeconds) {
        const token = typeof data.headers.token == "string" ? data.headers.token : false;
        _data.read("tokens", token, (err, tokenData) => {
          if (!err && !!tokenData) {
            var userPhone = tokenData.phone;

            _data.read("users", userPhone, (err, userData) => {
              if (!err && !!userData) {
                const userChecks = typeof userData.checks == "object" && userData.checks instanceof Array ? userData.checks : [];
                if (userChecks.length < config.MAX_CHECKS) {
                  const checkId = helpers.createRandomString(20);
                  const checkObj = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds,
                  };
                  _data.create("checks", checkId, checkObj, (err) => {
                    if (!err) {
                      userData.checks = userChecks;
                      userData.checks.push(checkId);
                      _data.update("users", userPhone, userData, (err) => {
                        if (!err) {
                          cb(200, checkObj);
                        } else cb(500, { Error: "Could not update the user with the new check." });
                      });
                    } else cb(500, { Error: "Could not create the new check." });
                  });
                } else {
                  cb(400, { Error: `User already has max number of checks (${config.MAX_CHECKS}).` });
                }
              } else cb(403);
            });
          } else cb(403);
        });
      } else cb(400, { Error: "Missing required inputs or not all inputs are valid." });
    },
    get: (data, cb) => {
      const { id: queryId } = data.query;
      const id = typeof queryId == "string" && queryId.trim().length == 20 ? queryId : false;

      if (!!id) {
        // Lookup the check
        _data.read("checks", id, (err, checkData) => {
          if (!err && !!checkData) {
            // Get token from the headers
            const token = typeof data.headers.token == "string" ? data.headers.token : false;
            // Verify token is valid and belongs to the check creating user
            handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
              if (!!tokenIsValid) {
                // return the checkData
                cb(200, checkData);
              } else cb(403);
            });
          } else cb(404);
        });
      } else cb(400, { Error: "Missing required field." });
    },
    put: (data, cb) => {
      const {
        id: payloadId,
        protocol: payloadProtocol,
        url: payloadUrl,
        method: payloadMethod,
        successCodes: payloadSuccessCodes,
        timeoutSeconds: payloadTimeoutSeconds,
      } = data.payload;
      const id = typeof payloadId == "string" && payloadId.trim().length == 20 ? payloadId : false;

      const protocol = typeof payloadProtocol == "string" && ["https", "http"].includes(payloadProtocol) ? payloadProtocol : false;
      const url = typeof payloadUrl == "string" && payloadUrl.length > 0 ? payloadUrl : false;
      const method = typeof payloadMethod == "string" && ["post", "get", "put", "delete"].includes(payloadMethod) ? payloadMethod : false;
      const successCodes = typeof payloadSuccessCodes == "object" && payloadSuccessCodes instanceof Array && payloadSuccessCodes.length > 0 ? payloadSuccessCodes : false;
      const timeoutSeconds =
        typeof payloadTimeoutSeconds == "number" && payloadTimeoutSeconds % 1 === 0 && payloadTimeoutSeconds >= 1 && payloadTimeoutSeconds <= 5 ? payloadTimeoutSeconds : false;
      console.log(protocol, url, method, successCodes, timeoutSeconds);

      if (!!id) {
        if (!!protocol || !!url | !!method | !!successCodes | !!timeoutSeconds) {
          _data.read("checks", id, (err, checkData) => {
            if (!err && !!checkData) {
              const token = typeof data.headers.token == "string" ? data.headers.token : false;
              // Verify token is valid and belongs to the check creating user
              handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                if (!!tokenIsValid) {
                  // return the checkData
                  if (!!protocol) checkData.protocol = protocol;
                  if (!!url) checkData.url = url;
                  if (!!method) checkData.method = method;
                  if (!!successCodes) checkData.successCodes = successCodes;
                  if (!!timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

                  _data.update("checks", id, checkData, (err) => {
                    if (!err) {
                      cb(200);
                    } else cb(500, { Error: "Could not update the check." });
                  });
                } else cb(403);
              });
            } else cb(400, { Error: "Check ID did not exist." });
          });
        } else cb(400, { Error: "Missing fields to update." });
      } else cb(400, { Error: "Missing required field." });
    },
    delete: (data, cb) => {
      // Check validity of phone number
      const { id: queryId } = data.query;
      const id = typeof queryId == "string" && queryId.trim().length == 20 ? queryId : false;

      if (!!id) {
        _data.read("checks", id, (err, checkData) => {
          if (!err && !!checkData) {
            const token = typeof data.headers.token == "string" ? data.headers.token : false;
            // Verify token is valid for the phone number provided
            handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
              if (!!tokenIsValid) {
                // Delete checkData
                _data.delete("checks", id, (err) => {
                  if (!err) {
                    _data.read("users", checkData.userPhone, (err, userData) => {
                      if (!err && !!userData) {
                        const userChecks = typeof userData.checks == "object" && userData.checks instanceof Array ? userData.checks : [];

                        const checkPos = userChecks.indexOf(id);
                        if (checkPos > -1) {
                          userChecks.splice(checkPos, 1);

                          _data.update("users", checkData.userPhone, userData, (err) => {
                            if (!err) {
                              cb(200);
                            } else cb(500, { Error: "Could not update the specified user." });
                          });
                        } else {
                          cb(500, { Error: "Could not find the check on the user object." });
                        }
                      } else cb(400, { Error: "Could not find the user who created the check, so could not delete check." });
                    });
                  } else cb(500, { Error: "Could not delete the check data." });
                });
              } else cb(403, { Error: "Missing required token in header or token is invalid." });
            });
          } else cb(400, { Error: "The specified check ID does not exist." });
        });
      } else cb(400, { Error: "Missing required field." });
    },
  },
};

module.exports = handlers;
