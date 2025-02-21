const readline = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");
const os = require("os");
const v8 = require("v8");
const _data = require("./data");
const _logs = require("./logs");
const helpers = require("./helpers");

class _events extends events {}
const e = new _events();

const cli = {};

// Input handlers
e.on("-help", (str) => {
  cli.responders.help();
});

e.on("exit", (str) => {
  cli.responders.exit();
});

e.on("-stats", (str) => {
  cli.responders.stats();
});

e.on("-listusers", (str) => {
  cli.responders.listUsers();
});

e.on("-muser", (str) => {
  cli.responders.muser(str);
});

e.on("-listchecks", (str) => {
  cli.responders.listChecks(str);
});

e.on("-mcheck", (str) => {
  cli.responders.mcheck(str);
});

e.on("-listlogs", (str) => {
  cli.responders.listLogs();
});

e.on("-mlog", (str) => {
  const arr = str.split(" ");
  const filename = typeof arr[1] == "string" && arr[1].trim().length > 0 ? arr[1].trim() : false;
  if (filename) {
    cli.responders.verticalSpace();
    _logs.decompress(filename, (err, strData) => {
      if (!err && strData) {
        const arr = strData.split("\n");
        arr.forEach((jsonStr) => {
          const logObj = helpers.parseJsonToObject(jsonStr);
          if (logObj && JSON.stringify(logObj) !== "{}") {
            console.dir(logObj, { colors: true });
            cli.responders.verticalSpace();
          }
        });
      }
    });
  }
});

cli.responders = {
  help: () => {
    const commands = {
      exit: "Kill the CLI (and the entire application)",
      help: "Show this help page",
      "-stats": "Get statistics on the underlying operating system and resource utilization",
      "-listusers": "Show a list of all the registered (undeleted) users in the system",
      "-muser {userId}": "Show details of a specific user",
      "-listchecks up down": "Show a list of all the active checks in the system, including their state. The up and the down flags are both optional",
      "-mcheck {checkId}": "Show details of a specified check",
      "-listlogs": "Show a list of all the log files available to be read (compressed and uncompressed)",
      "-mlog {filename}": "Show details of a specified log file",
    };

    // Show a header for the help page that is as wide as the screen
    cli.responders.horizontalLine();
    cli.responders.centered("CLI MANUAL");
    cli.responders.horizontalLine();
    cli.responders.verticalSpace(2);

    // Show each command
    for (const key in commands) {
      if (commands.hasOwnProperty(key)) {
        const value = commands[key];
        let line = `\x1b[33m${key}\x1b[0m`;
        const padding = 60 - line.length;
        for (i = 0; i < padding; i++) {
          line += " ";
        }

        line += value;
        console.log(line);
        cli.responders.verticalSpace(1);
      }
    }
    cli.responders.verticalSpace(1);
    cli.responders.horizontalLine();
  },
  horizontalLine: () => {
    // Get available screen size
    const width = process.stdout.columns;
    let line = "";

    for (i = 0; i < width; i++) {
      line += "-";
    }
    console.log(line);
  },
  centered: (str) => {
    str = typeof str == "string" && str.trim().length > 0 ? str.trim() : "";
    // Get available screen size
    const width = process.stdout.columns;
    const leftPadding = Math.floor((width - str.length) / 2);
    let line = "";
    for (i = 0; i < leftPadding; i++) {
      line += " ";
    }
    line += str;
    console.log(line);
  },
  verticalSpace: (numLines) => {
    numLines = typeof numLines == "number" && numLines > 0 ? numLines : 1;
    for (i = 0; i < numLines; i++) {
      console.log("");
    }
  },
  exit: () => {
    process.exit(0);
  },
  stats: () => {
    const stats = {
      "Load Average": os.loadavg().join(" "),
      "CPU Count": os.cpus().length,
      "Free Memory": os.freemem(),
      "Current Malloced Memory": v8.getHeapStatistics().malloced_memory,
      "Peak Malloced Memory": v8.getHeapStatistics().peak_malloced_memory,
      "Allocated Heap Used (%)": Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
      "Available Heep Allocated (%)": Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
      Uptime: `${os.uptime()} Seconds`,
    };

    cli.responders.horizontalLine();
    cli.responders.centered("SYSTEM STATISTICS");
    cli.responders.horizontalLine();
    cli.responders.verticalSpace(2);

    for (const key in stats) {
      if (stats.hasOwnProperty(key)) {
        const value = stats[key];
        let line = `\x1b[33m${key}\x1b[0m`;
        const padding = 60 - line.length;
        for (i = 0; i < padding; i++) {
          line += " ";
        }

        line += value;
        console.log(line);
        cli.responders.verticalSpace(1);
      }
    }
    cli.responders.verticalSpace(1);
    cli.responders.horizontalLine();
  },
  listUsers: () => {
    _data.list("users", (err, userIds) => {
      if (!err && userIds && userIds.length > 0) {
        cli.responders.verticalSpace();
        userIds.forEach((userId) => {
          _data.read("users", userId, (err, userData) => {
            if (!err && userData) {
              let line = `Name: ${userData.firstName} ${userData.lastName} Phone: ${userData.phone} Checks: `;
              const numOfChecks = typeof userData.checks == "object" && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks.length : 0;
              line += numOfChecks;
              console.log(line);
              cli.responders.verticalSpace();
            }
          });
        });
      }
    });
  },
  muser: (str) => {
    const arr = str.split(" ");
    const userId = typeof arr[1] == "string" && arr[1].trim().length > 0 ? arr[1].trim() : false;
    if (userId) {
      _data.read("users", userId, (err, userData) => {
        if (!err && userData) {
          delete userData.hashedPassword;
          cli.responders.verticalSpace();
          console.dir(userData, { colors: true });
          cli.responders.verticalSpace();
        }
      });
    }
  },
  listChecks: (str) => {
    _data.list("checks", function (err, checkIds) {
      if (!err && checkIds && checkIds.length > 0) {
        cli.responders.verticalSpace();
        checkIds.forEach(function (checkId) {
          _data.read("checks", checkId, function (err, checkData) {
            if (!err && checkData) {
              var includeCheck = false;
              var lowerString = str.toLowerCase();
              // Get the state, default to down
              var state = typeof checkData.state == "string" ? checkData.state : "down";
              // Get the state, default to unknown
              var stateOrUnknown = typeof checkData.state == "string" ? checkData.state : "unknown";
              // If the user has specified that state, or hasn't specified any state
              if (lowerString.indexOf(state) > -1 || (lowerString.indexOf("down") == -1 && lowerString.indexOf("up") == -1)) {
                var line = "ID: " + checkData.id + " " + checkData.method.toUpperCase() + " " + checkData.protocol + "://" + checkData.url + " State: " + stateOrUnknown;
                console.log(line);
                cli.responders.verticalSpace();
              }
            }
          });
        });
      }
    });
  },
  mcheck: (str) => {
    const arr = str.split(" ");
    const checkId = typeof arr[1] == "string" && arr[1].trim().length > 0 ? arr[1].trim() : false;
    if (checkId) {
      _data.read("checks", checkId, (err, checkData) => {
        if (!err && checkData) {
          cli.responders.verticalSpace();
          console.dir(checkData, { colors: true });
          cli.responders.verticalSpace();
        }
      });
    }
  },
  listLogs: () => {
    _logs.list(true, (err, filenames) => {
      if (!err && filenames && filenames.length > 0) {
        filenames.forEach((filename) => {
          if (filename.indexOf("-") > 1) {
            console.log(filename);
            cli.responders.verticalSpace();
          }
        });
      }
    });
  },
  mlog: (str) => {
    console.log("You asked for more log info.", str);
  },
};

cli.processInput = (str) => {
  str = typeof str == "string" && str.trim().length > 0 ? str.trim() : false;

  if (str) {
    // Codify unique strings user can ask
    const uniqueInputs = ["-help", "exit", "-stats", "-listusers", "-muser", "-listchecks", "-mcheck", "-listlogs", "-mlog"];

    let matchFound = false;
    let counter = 0;

    uniqueInputs.some((input) => {
      if (str.indexOf(input.toLowerCase()) > -1) {
        matchFound = true;
        e.emit(input, str);
        return true;
      }
    });

    if (!matchFound) {
      console.log("Sorry, try again.");
    }
  }
};

cli.init = () => {
  console.log("\x1b[34m%s\x1b[0m", `The CLI is running`);

  // Start the interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ">",
  });

  // Create initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on("line", (str) => {
    cli.processInput(str);
  });

  // Reinitialize the prompt
  _interface.prompt();

  // If the user stops the CLI, kill the associated process
  _interface.on("close", () => {
    process.exit(0);
  });
};

module.exports = cli;
