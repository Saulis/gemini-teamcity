var _console = require('console');

function getTestName(eventData) {
  return (eventData.suiteName.trim() + '.' +
          eventData.stateName.trim() + '.' +
          eventData.browserId.replace(/ /g, ''))
          .replace(/ /g, '_');
}
function escapeMessage(message) {
  if(message === null || message === undefined) {
    return '';
  }

  return message.toString().
    replace(/\|/g, '||').
    replace(/\'/g, '|\'').
    replace(/\n/g, '|n').
    replace(/\r/g, '|r').
    replace(/\u0085/g, '|x').
    replace(/\u2028/g, '|l').
    replace(/\u2029/g, '|p').
    replace(/\[/g, '|[').
    replace(/\]/g, '|]');
}
module.exports = function(gemini, opts) {
  gemini.on('startRunner', function(runner) {
    runner.on('beginState', function(eventData) {
      _console.log('##teamcity[testStarted name=\'' + getTestName(eventData) + '\']');
    });

    runner.on('skipState', function(eventData) {
      _console.log('##teamcity[testIgnored name=\'' + getTestName(eventData) + '\']');
    });

    runner.on('error', function(error) {
      _console.log('##teamcity[testFailed name=\'' +
        getTestName(error) + '\' message=\'' +
        escapeMessage(error.message) + '\' details=\'' +
        escapeMessage(error.stack) + '\']');
      _console.log('##teamcity[testFinished name=\'' + getTestName(error) + '\']');
    });

    runner.on('endTest', function(result) {
      if(result.equal !== true) {
        _console.log('##teamcity[testFailed name=\'' + getTestName(result) + '\']');
      }
      _console.log('##teamcity[testFinished name=\'' + getTestName(result) + '\']');
    });
  });
};
