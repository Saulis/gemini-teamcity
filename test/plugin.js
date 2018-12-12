var EventEmitter = require('events').EventEmitter;

var sinon = require('sinon');
var assert = require('chai').assert;
var tsm = require('teamcity-service-messages');
var fs = require('fs-extra');
var _ = require('lodash');

var utils = require('../lib/utils');
var plugin = require('../lib/plugin');

sinon.assert.expose(assert, {prefix: ''});

function resolveImmediately() {
    console.log(arguments);
    return {
        then: function(callback) {
            callback();
        }
    }
}

describe('gemini-teamcity', function() {
    var sandbox = sinon.sandbox.create(),
        gemini, runner, saveDiffTo;

    function stubEventData_(opts) {
        return _.extend({
            suite: {
                fullName: 'Suite default full name'
            },
            state: {
                name: 'State default name'
            },
            browserId: 'default-browser',
            sessionId: 'default-session-id',
            equal: true,
            refImg: {
                path: 'refPath'
            },
            currImg: {
                path: 'currPath'
            },
            saveDiffTo: saveDiffTo
        }, opts);
    }

    beforeEach(function() {
        sandbox.stub(tsm);
        sandbox.stub(fs, 'mkdtempSync', function(prefix) {
            return prefix + '0';
        });
        sandbox.stub(fs, 'copy', resolveImmediately);
        sandbox.stub(utils, 'reportScreenshot');
        saveDiffTo = sandbox.spy(resolveImmediately);

        gemini = new EventEmitter();
        runner = new EventEmitter();

        plugin(gemini);
        gemini.emit('startRunner', runner);

    });

    afterEach(function() {
        sandbox.restore();
    });

    function testArgs_(event, handleMethod, specificData) {
        it('should call "' + event + '" with proper full test name', function() {
            var data = _.extend({
                    browserId: 'some-browser',
                    state: {name: 'some-state'},
                    suite: {fullName: 'some suite'}
                }, specificData);

            runner.emit(event, stubEventData_(data));

            assert.calledOnce(tsm[handleMethod]);
            assert.calledWithMatch(tsm[handleMethod], {
                name: 'some_suite.some-state.some-browser'
            });
        });

        it('should use sessionId as flowId', function() {
            var data = _.extend({
                    sessionId: 'some-session-id'
                }, specificData);

            runner.emit(event, stubEventData_(data));

            assert.calledWithMatch(tsm[handleMethod], {
                flowId: 'some-session-id'
            });
        });
    }

    describe('on beginState', function() {
        testArgs_('beginState', 'testStarted');
    });

    describe('on skipState', function() {
        testArgs_('skipState', 'testIgnored');
    });

    describe('on testResult', function() {
        testArgs_('testResult', 'testFinished');

        it ('should copy & report reference image', function () {
            runner.emit('testResult', stubEventData_());

            assert.calledWithMatch(
              fs.copy,
              'refPath',
              'gemini-0/Suite default full name/State default name/default-browser/Reference.png'
            );
            assert.calledWithMatch(
              utils.reportScreenshot,
              'Suite_default_full_name.State_default_name.default-browser',
              'gemini-0/Suite default full name/State default name/default-browser/Reference.png'
            );
        });

        it ("shouldn't copy or report any other images", function () {
            runner.emit('testResult', stubEventData_());

            assert.calledOnce(fs.copy);
            assert.calledOnce(utils.reportScreenshot);
            assert.notCalled(saveDiffTo);
        });

        describe('Test is failed', function() {
            testArgs_('testResult', 'testFailed', {equal: false});

            it ('should copy & report reference image', function () {
                runner.emit('testResult', stubEventData_({equal: false}));

                assert.calledWithMatch(
                  fs.copy,
                  'refPath',
                  'gemini-0/Suite default full name/State default name/default-browser/Reference.png'
                );
                assert.calledWithMatch(
                  utils.reportScreenshot,
                  'Suite_default_full_name.State_default_name.default-browser',
                  'gemini-0/Suite default full name/State default name/default-browser/Reference.png'
                );
            });

            it ('should copy & report current image', function () {
                runner.emit('testResult', stubEventData_({equal: false}));

                assert.calledWithMatch(
                  fs.copy,
                  'currPath',
                  'gemini-0/Suite default full name/State default name/default-browser/Current.png'
                );
                assert.calledWithMatch(
                  utils.reportScreenshot,
                  'Suite_default_full_name.State_default_name.default-browser',
                  'gemini-0/Suite default full name/State default name/default-browser/Current.png'
                );
            });

            it ('should save & report diff image', function () {
                runner.emit('testResult', stubEventData_({equal: false}));

                assert.calledWithMatch(
                  saveDiffTo,
                  'gemini-0/Suite default full name/State default name/default-browser/Diff.png'
                );
                assert.calledWithMatch(
                  utils.reportScreenshot,
                  'Suite_default_full_name.State_default_name.default-browser',
                  'gemini-0/Suite default full name/State default name/default-browser/Diff.png'
                );
            });
        });
    });

    describe('on error', function() {
        describe('with state', function() {
            it('should call "testFailed" with stack and message', function() {
                runner.emit('err', stubEventData_({
                    stack: 'error stack',
                    message: 'error message'
                }));

                assert.calledOnce(tsm.testFailed);
                assert.calledWithMatch(tsm.testFailed, {
                    details: 'error stack',
                    message: 'error message'
                });
            });

            it('should call "testFinished"', function() {
                runner.emit('err', stubEventData_({
                    stack: 'error stack',
                    message: 'error message'
                }));

                assert.calledOnce(tsm.testFinished);
            });
        });

        describe('without state', function() {
            var state1, state2, suite, data;

            beforeEach(function() {
                state1 = {name: 'state1'},
                state2 = {name: 'state2'},
                suite = {
                    fullName: 'some suite',
                    states: [state1, state2]
                },
                data = stubEventData_({
                    state: undefined,
                    suite: suite,
                    browserId: 'some-browser'
                });
            });

            it('should fail all suite states', function() {
                runner.emit('err', data);

                assert.calledTwice(tsm.testFailed);
                assert.calledWithMatch(tsm.testFailed, {name: 'some_suite.state1.some-browser'});
                assert.calledWithMatch(tsm.testFailed, {name: 'some_suite.state2.some-browser'});
            });

            it('should not fail already finished suite states', function() {
                runner.emit('testResult', _.defaults({state: state1}, data));
                runner.emit('testResult', _.defaults({state: state2, equal: false}, data));

                runner.emit('err', data);

                assert.calledOnce(tsm.testFailed);
            });

            it('should not fail skipped states', function() {
                runner.emit('skipState', _.defaults({state: state1}, data));
                runner.emit('skipState', _.defaults({state: state2}, data));

                runner.emit('err', data);

                assert.notCalled(tsm.testFailed);
            });
        });
    });
});
