/**
 * Library for storing and editing data
 */

const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

// Base directory of the data folder
const lib = {
  baseDir: path.join(__dirname, "/../.data"),
  create: (dir, file, data, cb) => {
    // Open file for writing
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, "wx", (err, fileDescriptor) => {
      if (!err && !!fileDescriptor) {
        // Convert data to string
        const strData = JSON.stringify(data);
        // Write to file and close it
        fs.writeFile(fileDescriptor, strData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                cb(false);
              } else {
                cb("Error closing new file.");
              }
            });
          } else {
            cb("Error writing to new file.");
          }
        });
      } else {
        cb("DuplicateError: Could not create new file; it may already exist.");
      }
    });
  },
  read: (dir, file, cb) => {
    fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, "utf-8", (err, data) => {
      if (!err && !!data) {
        const parsedData = helpers.parseJsonToObject(data);
        cb(false, parsedData);
      } else {
        cb(err, data);
      }
    });
  },
  update: (dir, file, data, cb) => {
    // Open file for writing
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, "r+", (err, fileDescriptor) => {
      if (!err && !!fileDescriptor) {
        const strData = JSON.stringify(data);

        fs.ftruncate(fileDescriptor, (err) => {
          if (!err) {
            fs.writeFile(fileDescriptor, strData, (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  if (!err) {
                    cb(false);
                  } else {
                    cb("Error closing file.");
                  }
                });
              } else {
                cb("Error writing to existing file.");
              }
            });
          } else {
            cb("Error truncating file.");
          }
        });
      } else {
        cb("Could not open the file for updating; it may not yet exist.");
      }
    });
  },
  delete: (dir, file, cb) => {
    // Unlink file from fs
    fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, (err) => {
      if (!err) {
        cb(false);
      } else {
        cb("Error deleting file.");
      }
    });
  },
  list: (dir, cb) => {
    fs.readdir(`${lib.baseDir}/${dir}/`, (err, data) => {
      if (!err && !!data && data.length > 0) {
        const trimmedFilenames = [];
        data.forEach((filename) => trimmedFilenames.push(filename.replace(".json", "")));
        cb(false, trimmedFilenames);
      } else cb(err, data);
    });
  },
};

module.exports = lib;
