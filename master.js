'use strict';

module.exports = function(app) {
    var cluster = require('cluster');

    cluster.setupMaster({
        exec : "worker.js",     // run this script when we fork ourselves
        args : process.argv.slice(2),
        silent : false
    });

    // Routing
    app.get('/', function(req, res) {
        res.send(401, 'Unauthorized');
    });

    app.post('/js', function(req, res) {
        // Sanitize input first
        var command = req.body.command;

        if (typeof command === 'undefined') {
            res.send(400);
            return;
        }

        //This will be fired when the forked process becomes online
        cluster.on("online", function(worker) {
            var timer = 0;

            worker.on("message", function (message) {
                clearTimeout(timer);
                console.log(message);
                worker.destroy();   // destroy the spun worker
                res.send({'text': message});
            });

            // handle long running processes here (5 seconds tops)
            timer = setTimeout(function() {
                worker.destroy();
                console.log("worker execution expired");
                res.send(400, 'Invalid command supplied');
            }, 5000);
            worker.send(command); // Send the expression to run from the worker
        });

        cluster.fork();   // fork one process so if for some reason the executed code hangs it doesn't crash the server
    });
};
