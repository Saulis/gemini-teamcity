# gemini-teamcity
Plugin for Gemini which enables reporting test results to TeamCity.

[![Build Status](https://travis-ci.org/gemini-testing/gemini-teamcity.svg?branch=master)](https://travis-ci.org/gemini-testing/gemini-teamcity)

## Requirements
Works with [gemini](https://github.com/gemini-testing/gemini) [v1.1.0](https://github.com/gemini-testing/gemini/releases/tag/v1.1.0) or later.

Latest test run done with: _v2.1.1_

## Installation
`npm install gemini-teamcity`

## Configuration
Set the configuration to your `.gemini.yml`

```
plugins:
  teamcity: true
```

## Options

### imagesDir

Directory to save images to. `gemini-images` by default.

```
plugins:
  teamcity:
    imagesDir: path/to/my/dir
```
