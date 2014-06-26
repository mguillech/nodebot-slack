'use strict';

var request = require('request'),
    util = require('util');

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
        result,
        resultFromCall,
        unhook,
        terms,
        url;

    // First check if the jsCode provided is not really a query to MDN
    if (jsCode.toLowerCase().match('^!mdn')) {
        terms = jsCode.toLowerCase().split('!mdn')[1].trim();
        if (terms === '') {
            process.send("*Error:* please specify a term to look up MDN for");
            return;
        }
        url = 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=' + encodeURIComponent(terms) +
            ' site:developer.mozilla.org';
        try {
            request(url, function (error, response, body) {
                var jsonBody,
                    googleResults;
                if (!error && response.statusCode == 200) {
                    jsonBody = JSON.parse(body);
                    googleResults = jsonBody.responseData.results;  // array of results, we will take the first hit only
                    process.send("*Document Title:* " + googleResults[0].titleNoFormatting +
                        "\n*URL:* " + googleResults[0].unescapedUrl);
                }
                else {
                    process.send("*Error:* Error querying MDN for your terms");
                }
            });
        }
        catch (error) {
            process.send("*Error:* Error querying MDN for your terms");
        }

        return;     // stop here
    }

    // Valid JS code to run
    result = "*Out:* <no output>";
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
