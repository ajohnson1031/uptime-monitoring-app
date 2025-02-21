const readline = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");

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
  cli.responders.mlog(str);
});

cli.responders = {
  help: () => {
    const commands = {
      exit: "Kill the CLI (and the entire application)",
      help: "Show this help page",
      "-stats": "Get statistics on the underlying operating system and resource utilization",
      "-listusers": "Show a list of all the registered (undeleted) users in the system",
      "-muser --{userId}": "Show details of a specific user",
      "-listchecks --up --down": "Show a list of all the active checks in the system, including their state. The --up and the --down flags are both optional",
      "-mcheck --{checkId}": "Show details of a specified check",
      "-listlogs": "Show a list of all the log files available to be read (compressed and uncompressed)",
      "-mlog --{filename}": "Show details of a specified log file",
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
    console.log("You asked for stats.");
  },
  listUsers: () => {
    console.log("You asked to list users.");
  },
  muser: (str) => {
    console.log("You asked for more user info.", str);
  },
  listChecks: (str) => {
    console.log("You asked to list checks.", str);
  },
  mcheck: (str) => {
    console.log("You asked for more check info.", str);
  },
  listLogs: () => {
    console.log("You asked to list logs.");
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
