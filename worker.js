'use strict';

var util = require('util');

// This script will be run separately and listens to incoming messages from the parent process
function hook_stdout(callback) {
    var old_write = process.stdout.write;

    process.stdout.write = (function(write) {
        return function(string, encoding, fd) {
            write.apply(process.stdout, arguments);
            callback(string, encoding, fd);
        }
    })(process.stdout.write);

    return function() {
        process.stdout.write = old_write;
    }
}

process.on('message', function(jsCode) {
    var vm = require("vm"),
        obj = {'console': console},
        context,
        script,
        result = "Out: <no output>",
        resultFromCall,
        unhook;

    context = vm.createContext(obj);
    script = vm.createScript(jsCode);

    unhook = hook_stdout(function(string, encoding, fd) {
        result = result.replace('<no output>', string);
    });

    resultFromCall = script.runInNewContext(context);
    unhook();
    result += "\nReturn: " + resultFromCall;

    // Emoji time!
    result += "\nPowered by :node:";

    // Send the finished message to the parent process
    process.send(result);
});
