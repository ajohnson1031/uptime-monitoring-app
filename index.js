const server = require("./lib/server");
const workers = require("./lib/workers");

const app = {
  init: () => {
    server.init();
    workers.init();
  },
};

app.init();

module.exports = app;
