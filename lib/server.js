const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");
const util = require("util");
const debug = util.debuglog("server");

const server = {};

server.unifiedServer = (req, res) => {
  // Get the path from the URL & the HTTP method
  const { url: reqURL, method: methodRaw, headers } = req,
    method = methodRaw.toLowerCase();

  // Get the path and query from the parsed URL
  const parsedUrl = url.parse(reqURL, true);
  const { pathname, query } = parsedUrl;
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, "");
  const decoder = new StringDecoder("utf-8");

  let buffer = "";

  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    // Choose the handler this request should go to.
    let chosenHandler = typeof server.router[trimmedPath] !== "undefined" ? server.router[trimmedPath] : handlers.notfound;

    chosenHandler = trimmedPath.indexOf("public/") > -1 ? handlers.public : chosenHandler;
    // Construct data to send to chosenHandler
    const data = {
      trimmedPath,
      query,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // route request to the handler specified in the router
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Use the statusCode called back by the handler or default to 200
      contentType = typeof contentType == "string" ? contentType : "json";
      statusCode = typeof statusCode == "number" ? statusCode : 200;

      let payloadStr = "";
      switch (contentType) {
        case "json":
          res.setHeader("Content-Type", "application/json");
          payload = typeof payload == "object" ? payload : {};
          payloadStr = JSON.stringify(payload);
          break;
        case "html":
          res.setHeader("Content-Type", "text/html");
          payloadStr = typeof payload == "string" ? payload : "";
          break;
        case "favicon":
          res.setHeader("Content-Type", "image/x-icon");
          payloadStr = typeof payload !== "undefined" ? payload : "";
          break;
        case "css":
          res.setHeader("Content-Type", "text/css");
          payloadStr = typeof payload !== "undefined" ? payload : "";
          break;
        case "png":
          res.setHeader("Content-Type", "image/png");
          payloadStr = typeof payload !== "undefined" ? payload : "";
          break;
        case "jpg":
          res.setHeader("Content-Type", "image/jpeg");
          payloadStr = typeof payload !== "undefined" ? payload : "";
          break;
        case "plain":
          res.setHeader("Content-Type", "text/plain");
          payloadStr = typeof payload !== "undefined" ? payload : "";
          break;
        default:
          res.setHeader("Content-Type", "text/plain");
          payloadStr = typeof payload !== "undefined" ? payload : "";
      }

      // Return the type parts that are common to all content-types
      res.writeHead(statusCode);
      res.end(payloadStr);

      if ([200, 201].includes(statusCode)) {
        debug("\x1b[32m%s\x1b[0m", `${method.toUpperCase()}/${trimmedPath} (${statusCode})`);
      } else {
        debug("\x1b[31m%s\x1b[0m", `${method.toUpperCase()}/${trimmedPath} (${statusCode})`);
      }
    });
  });
};
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});

server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checksList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,
  ping: handlers.ping,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks,
  "favicon.ico": handlers.favicon,
  public: handlers.public,
};

server.init = () => {
  // Start the server and have it listen on port 3000
  server.httpServer.listen(config.HTTP_PORT, () => console.log("\x1b[36m%s\x1b[0m", `The server is listening on port ${config.HTTP_PORT}`));
  server.httpsServer.listen(config.HTTPS_PORT, () => console.log("\x1b[35m%s\x1b[0m", `The server is listening securely on port ${config.HTTPS_PORT}`));
};

module.exports = server;
