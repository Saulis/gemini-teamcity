var path = require('path');
var tsm = require('teamcity-service-messages');

var TEAMCITY_HIDDEN_ARTIFACTS_PATH = '.teamcity'

module.exports = {
    getTestName: function(testData, state) {
        return [
            testData.suite.fullName.trim(),
            (state || testData.state).name.trim(),
            testData.browserId.replace(/ /g, '')
        ].join('.').replace(/ /g, '_');
    },
    getImagePath: function(base, testData, type) {
        return path.join(
          base,
          testData.suite.fullName.trim(),
          testData.state.name.trim(),
          testData.browserId.trim(),
          type + '.png'
        );
    },
    reportScreenshot: function(testName, imagePath) {
        tsm.publishArtifacts(
            path.resolve(imagePath) + ' => ' + path.join(
              TEAMCITY_HIDDEN_ARTIFACTS_PATH,
              path.dirname(imagePath)
            )
        );
        tsm.testMetadata({
            testName: testName,
            type: 'image',
            value: path.join(
              TEAMCITY_HIDDEN_ARTIFACTS_PATH,
              imagePath
            )
        });
    }
};
