
var createClient = require('./swf').createClient;
var async = require('async');

/**
 * Class to make it easier to respond to activity tasks
 * @constructor
 * @param {Object} config - Object containing the taskToken from SWF
 * @param {Object} [swfClient]
 */
var ActivityTask = exports.ActivityTask = function (config, swfClient) {
    
    this.config = config;

    this.swfClient = swfClient || createClient();
};

function stringify(str) {
    if(!str) {
        return "";
    }

    if (typeof str !== "string") {
        return JSON.stringify(str);
    }

    return str;
}

ActivityTask.prototype = {

    /**
     * Sends a "RespondActivityTaskCompleted" to AWS.
     * @param {Mixed} result - Result of the activity (will get stringified in JSON if not a string)
     * @param {Function} [cb] - callback
     */
    respondCompleted: function (result, cb) {
        var self = this;
        async.retry({times: 5, interval: 5000}, function (retryCb) {
            self.swfClient.respondActivityTaskCompleted({
                result: stringify(result),
                taskToken: self.config.taskToken
            }, retryCb);
        }, function (err) {
            if (cb) {
                cb(err);
            }
        });

    },


    /**
     * Sends a "RespondActivityTaskFailed" to AWS.
     * @param {String} reason
     * @param {String} details
     * @param {Function} [cb] - callback
     */
    respondFailed: function (reason, details, cb) {
        var self = this;
        var o = {
            "taskToken": this.config.taskToken
        };
        if (reason) {
            o.reason = reason;
        }
        if (details) {
            o.details = stringify(details);
        }
        async.retry({times: 5, interval: 5000}, function (retryCb) {
            self.swfClient.respondActivityTaskFailed(o, retryCb);
        }, function (err) {
            if (cb) {
                cb(err);
            }
        });

    },

    /**
     * Sends a heartbeat to AWS. Needed for long run activity
     * @param {Mixed} heartbeat - Details of the heartbeat (will get stringified in JSON if not a string)
     * @param {Function} [cb] - callback
     */
    recordHeartbeat: function (heartbeat, cb) {
        var self = this;
        async.retry({times: 5, interval: 2000}, function (retryCb) {
            self.swfClient.recordActivityTaskHeartbeat({
                taskToken: self.config.taskToken,
                details: stringify(heartbeat)
            }, retryCb);
        }, function (err) {
            if (cb) {
                cb(err);
            }
        });
    }

};
