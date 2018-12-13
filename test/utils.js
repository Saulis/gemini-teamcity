var path = require('path');
var assert = require('chai').assert;
var sinon = require('sinon');
var tsm = require('teamcity-service-messages');

var utils = require('../lib/utils');

describe('getTestName', function() {
    var data;
    var func = utils.getTestName;

    beforeEach(function() {
        data = {
            suite: {
                fullName: 'suite'
            },
            state: {
                name: 'state'
            },
            browserId: 'chrome'
        };
    });

    it('should trim the suite name from spaces', function() {
        data.suite.fullName = ' suite ';

        var actual = func(data);
        var expected = 'suite.state.chrome';

        assert.equal(actual, expected);
    });

    it('should trim the state name from spaces', function() {
        data.state.name = ' state ';

        var actual = func(data);
        var expected = 'suite.state.chrome';

        assert.equal(actual, expected);
    });

    it('should trim browserId from spaces', function() {
        data.browserId = ' chrome 41 ';

        var actual = func(data);
        var expected = 'suite.state.chrome41';

        assert.equal(actual, expected);
    });

    it('should replace spaces with underscore', function() {
        data.browserId = 'chrome 41';
        data.suite.fullName = ' root suite ';
        data.state.name = ' state number two';

        var actual = func(data);
        var expected = 'root_suite.state_number_two.chrome41';

        assert.equal(actual, expected);
    });
});

describe('getImagePath', function() {
    var data;
    var imageBase = 'base';
    var func = utils.getImagePath;
    var base = utils.imagesPath;

    beforeEach(function() {
        data = {
            suite: {
                fullName: 'suite'
            },
            state: {
                name: 'state'
            },
            browserId: 'chrome'
        };
    });

    it('should trim the suite name from spaces', function() {
        data.suite.fullName = ' suite ';

        var actual = func(imageBase, data, 'Current');
        var expected = 'base/suite/state/chrome/Current.png';

        assert.equal(actual, expected);
    });

    it('should trim the state name from spaces', function() {
        data.state.name = ' state ';

        var actual = func(imageBase, data, 'Current');
        var expected = 'base/suite/state/chrome/Current.png';

        assert.equal(actual, expected);
    });

    it('should trim browserId from spaces', function() {
        data.browserId = ' chrome 41 ';

        var actual = func(imageBase, data, 'Current');
        var expected = 'base/suite/state/chrome 41/Current.png';

        assert.equal(actual, expected);
    });

    it('should preserve inner spaces', function() {
        data.browserId = 'chrome 41';
        data.suite.fullName = ' root suite ';
        data.state.name = ' state number two';

        var actual = func(imageBase, data, 'Current');
        var expected = 'base/root suite/state number two/chrome 41/Current.png';

        assert.equal(actual, expected);
    });
});

describe('reportScreenshot', function() {
    var sandbox = sinon.sandbox.create();
    var func = utils.reportScreenshot;
    var testName = 'testName';

    beforeEach(function() {
        sandbox.stub(tsm);
        sandbox.stub(path, 'resolve', path.join.bind(path, '<cwd>'));
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should store artifact', function() {
        func(testName, 'path/to/image.png');

        assert.calledWith(tsm.publishArtifacts, '<cwd>/path/to/image.png => .teamcity/path/to');
    });

    it('should report metadata', function() {
        func(testName, 'path/to/image.png');

        assert.calledWithNew(tsm.Message);
        assert.calledWithMatch(tsm.Message, 'testMetadata', {
            testName: 'testName',
            type: 'image',
            name: 'image',
            value: '.teamcity/path/to/image.png'
        });
    });
});
