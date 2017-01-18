var util = require('util'),
    DecisionTask = require('./decision-task').DecisionTask,
    _ = require('lodash'),
    Poller = require('./poller').Poller;

/**
 * Decider polls Amazon SWF for new Decision Tasks
 * @constructor
 * @param {Object} config Ex: { domain: "my-domain", taskList: {name: "my-taskList"} }
 * @param {Object} [swfClient]
 * @augments Poller
 * @fires Decider#decisionTask
 * @fires Poller#poll
 * @fires Poller#error
 */
var Decider = exports.Decider = function (config, swfClient) {

    Poller.call(this, config, swfClient);

    if (!config.domain || !config.taskList) {
        throw new Error("Decider: domain and taskList must be set");
    }

    // For the Poller class
    this.pollMethod = "pollForDecisionTask";
    this.retries = 0;
};

util.inherits(Decider, Poller);

/**
 * Callback for incoming tasks
 * @private
 * @param {Object} [originalResult] configuration object for the task
 */
Decider.prototype._onNewTask = function(originalResult,result,_this, events) {
    //For the first call, events will not be passed.
    events = events || [];
    //Reference to the original this object.
    _this = _this || this;
    result = result || originalResult;
    var eventsOld = _.clone(events);
    events.push.apply(events,result.events);
    //If more pages are available, make call to fetch objects
    if(result.nextPageToken) {
        var pollConfig = _.clone(this.config);
        pollConfig.nextPageToken = result.nextPageToken;
        this.swfClient[this.pollMethod](pollConfig, function (err, nextPageResult) {
            if (err) {
                if (_this.retries < 5) {
                    _this.retries++;
                    setTimeout(function () {
                        _this._onNewTask(originalResult,result,_this,eventsOld);
                    }, 5000);
                    return;
                }
                // retried 5 times already, so emit error and give up
                _this.emit('error', err);
                _this.retries = 0;
                return;
            }
            _this.retries = 0;
            _this._onNewTask(originalResult,nextPageResult,_this,events); // we do this because an incoming task requires us to get all pages of results before emitting

        });
    } else {
        this.retries = 0;
        //No more pages available. Create decisionTask.
        var decisionTask = new DecisionTask(originalResult, this.swfClient,events);

        /**
         * Emitted for every decision task received from Amazon SWF
         *
         * @event Decider#decisionTask
         * @property {DecisionTask} decisionTask
         */
        this.emit('decisionTask', decisionTask);
    }

};

