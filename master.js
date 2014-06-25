'use strict';
var util = require('util');

module.exports = function(app) {
    var cluster = require('cluster'),
        mainWorker,
        timer = 0,
        callback;

    cluster.setupMaster({
        exec : "worker.js",     // run this script when we fork ourselves
        args : process.argv.slice(2),
        silent : false
    });

    //This will be fired when the forked process becomes online
    cluster.on("online", function(worker) {
        mainWorker = worker;

        worker.on("message", function (result) {
            clearTimeout(timer);
            // console.log(message);
            // run the callback passed along with all the messages with the result as argument
            if (callback) {
                callback(result);
            }
        });
    });

    cluster.on('exit', function(worker, code, signal) {
        mainWorker = undefined;
        cluster.fork();
    });

    cluster.fork();   // fork one process so if for some reason the executed code hangs it doesn't crash the server

    // Routing
    app.get('/', function(req, res) {
        res.send(401, 'Unauthorized');
    });

    app.post('/js', function(req, res) {
        var userName = req.body.user_name,
            jsCode = req.body.text;

        // Sanitize input first
        if (typeof userName === 'undefined' || typeof jsCode === 'undefined' || jsCode.indexOf('>>') === -1) {
            res.send(400);
            return;
        }

        // Check if we don't have an online worker
        if (typeof mainWorker === 'undefined') {
            res.send(503);      // service unavailable
        }

        // handle long running processes here (5 seconds tops)
        timer = setTimeout(function() {
            mainWorker.destroy();
            console.log("worker execution expired");
            res.send(400, 'Execution time expired');
        }, 5000);

        // parse jsCode
        jsCode = jsCode.split('>> ')[1].trim();

        callback = function(result) {
            res.send({'text': "@" + userName + ": " + result});
        };

        mainWorker.send(jsCode); // Send the expression to run on the worker
    });
};
