// This script will be run separately and listens to incoming messages from the parent process
process.on('message', function(jsCode) {
    var vm = require("vm"),
        obj = {'console': console},
        context = vm.createContext(obj),
        script = vm.createScript(jsCode),
        result,
        resultFromCall;

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

    var unhook = hook_stdout(function(string, encoding, fd) {
        result = 'Out: ' + string;
    });

    resultFromCall = script.runInNewContext(context);
    unhook();
    result += '\nReturn: ' + resultFromCall;
    process.send(result); //Send the finished message to the parent process
});
