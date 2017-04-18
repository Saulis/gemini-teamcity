var EventEmitter = require('events').EventEmitter;

var sinon = require('sinon');
var assert = require('chai').assert;
var tsm = require('teamcity-service-messages');
var _ = require('lodash');

var plugin = require('../lib/plugin');

sinon.assert.expose(assert, {prefix: ''});

describe('gemini-teamcity', function() {
    var sandbox = sinon.sandbox.create(),
        gemini, runner;

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
            equal: true
        }, opts);
    }

    beforeEach(function() {
        gemini = new EventEmitter();
        runner = new EventEmitter();

        plugin(gemini);
        gemini.emit('startRunner', runner);

        sandbox.stub(tsm);
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

    describe('on endTest', function() {
        testArgs_('endTest', 'testFinished');

        describe('Test is failed', function() {
            testArgs_('endTest', 'testFailed', {equal: false});
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

            it('should not pass "undefined" event data properties to "testFailed"', function() {
                runner.emit('err', stubEventData_({
                    stack: undefined,
                    message: 'error message'
                }));

                var failedTestData = tsm.testFailed.lastCall.args[0];
                assert.notProperty(failedTestData, 'details');
                assert.property(failedTestData, 'message');
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
                runner.emit('endTest', _.defaults({state: state1}, data));
                runner.emit('endTest', _.defaults({state: state2, equal: false}, data));

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
