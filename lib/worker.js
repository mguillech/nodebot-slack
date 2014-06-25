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
        result = "*Out:* <no output>",
        resultFromCall,
        unhook;

    context = vm.createContext(obj);
    try {
        script = vm.createScript(jsCode);
    }
    catch (error) {
        process.send("*Error:* " + error.message);
        return;
    }

    unhook = hook_stdout(function(string, encoding, fd) {
        result = result.replace('<no output>', string).trim();
    });

    try {
        resultFromCall = script.runInNewContext(context);
    }
    catch(error) {
        unhook(); // unhook our stdout wrapper here too
        process.send("*Error:* " + error.message);
        return;
    }
    unhook();
    result += "\n*Return:* " + ((typeof resultFromCall !== 'undefined') ? resultFromCall : "<no return value>");

    // Send the finished message to the parent process
    process.send(result);
});
