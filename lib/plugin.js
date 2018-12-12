var path = require('path');
var fs = require('fs-extra');
var tsm = require('teamcity-service-messages');
var utils  = require('./utils');
var _ = require('lodash');

/**
 *
 * @param gemini
 * @param options
 */
module.exports = function(gemini, options) {
    var finishedTests = [];

    gemini.on('startRunner', function(runner) {
        var imagesBase = fs.mkdtempSync('gemini-')

        runner.on('beginState', function(data) {
            tsm.testStarted({ name: utils.getTestName(data), flowId: data.sessionId });
        });

        runner.on('skipState', function(data) {
            var testName = utils.getTestName(data);
            tsm.testIgnored({ name: testName, flowId: data.sessionId });
            finishedTests.push(testName);
        });

        runner.on('testResult', function(data) {
            var testName = utils.getTestName(data);

            var refPath = utils.getImagePath(imagesBase, data, 'Reference');
            fs.copy(data.refImg.path, refPath).then(function() {
                utils.reportScreenshot(testName, refPath);
            });

            if(data.equal !== true) {
                var currPath = utils.getImagePath(imagesBase, data, 'Current');
                fs.copy(data.currImg.path, currPath).then(function() {
                    utils.reportScreenshot(testName, currPath);
                });

                var diffPath = utils.getImagePath(imagesBase, data, 'Diff');
                data.saveDiffTo(diffPath).then(function() {
                    utils.reportScreenshot(testName, diffPath);
                });

                tsm.testFailed({ name: testName, flowId: data.sessionId });
            }

            tsm.testFinished({ name: testName, flowId: data.sessionId });
            finishedTests.push(testName);
        });

        runner.on('err', function(data) {
            if (data.state) {
                failTest_(data);
            } else {
                failAllSuiteTests_(data);
            }

            function failTest_(data, testName) {
                testName = testName || utils.getTestName(data);

                tsm.testFailed({ name: testName, message: data.message, details: data.stack, flowId: data.sessionId });
                tsm.testFinished({ name: testName, flowId: data.sessionId });
            }

            function failAllSuiteTests_(data) {
                data.suite.states.forEach(function(state) {
                    var testName = utils.getTestName(data, state);
                    if (!_.includes(finishedTests, testName)) {
                        failTest_(data, testName);
                    }
                });
            }
        });
    });
};
