/**
 * Library for storing and rotating logs
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const lib = { baseDir: path.join(__dirname, "/../logs") };

lib.append = (filename, str, cb) => {
  fs.open(`${lib.baseDir}/${filename}.log`, "a", (err, fileDescriptor) => {
    if (!err) {
      fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              cb(false);
            } else cb("Error closing file that was being appended.");
          });
        } else cb("Error appending to file.");
      });
    } else cb("Error: Could not open file for appending.");
  });
};

lib.list = (includeCompressedLogs, cb) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && !!data && data.length > 0) {
      const trimmedFileNames = [];

      data.forEach((filename) => {
        if (filename.indexOf(".log") > -1) {
          trimmedFileNames.push(filename.replace(".log", ""));
        }

        if (filename.indexOf(".gz.b64") > -1 && !!includeCompressedLogs) {
          trimmedFileNames.push(filename.replace(".gz.b64", ""));
        }
      });
      cb(false, trimmedFileNames);
    } else cb(err, data);
  });
};

lib.compress = (logId, newFileId, cb) => {
  const sourceFile = `${logId}.log`;
  const destinationFile = `${newFileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}/${sourceFile}`, "utf-8", (err, inputStr) => {
    if (!err && !!inputStr) {
      zlib.gzip(inputStr, (err, buffer) => {
        if (!err && !!buffer) {
          fs.open(`${lib.baseDir}/${destinationFile}`, "wx", (err, fileDescriptor) => {
            if (!err && !!fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString("base64"), (err) => {
                if (!err) {
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      cb(false);
                    } else cb(err);
                  });
                } else cb(err);
              });
            } else cb(err);
          });
        } else cb(err);
      });
    } else {
      cb(err);
    }
  });
};

lib.decompress = (fileId, cb) => {
  const filename = `${fileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}/${filename}`, "utf-8", (err, str) => {
    if (!err && !!str) {
      const inputBuffer = Buffer.from(str, "base64");
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && !!outputBuffer) {
          const str = outputBuffer.toString();
          cb(false, str);
        } else cb(err);
      });
    } else cb(err);
  });
};

lib.truncate = (logId, cb) => {
  fs.truncate(`${lib.baseDir}/${logId}.log`, 0, (err) => {
    if (!err) {
      cb(false);
    } else cb(err);
  });
};

module.exports = lib;
