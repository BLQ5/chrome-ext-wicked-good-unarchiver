// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * A helper namespace used by integration_tests.js.
 */
var tests_helper = {
  /**
   * The base URL where all test archives are located.
   * @type {string}
   * @private
   * @const
   */
  ARCHIVE_BASE_URL_: 'http://localhost:9876/base-test/archives/',

  /**
   * The path to the NaCl nmf file.
   * "base/" prefix is required because Karma prefixes every file path with
   * "base/" before serving it.
   * @type {string}
   * @const
   */
  MODULE_NMF_FILE_PATH: 'base/newlib/Debug/module.nmf',

  /**
   * The mime type of the module.
   * @type {string}
   * @const
   */
  MODULE_MIME_TYPE: 'application/x-nacl',

  /**
   * Define information for the volumes to check.
   * @type {Array.<Object>}
   */
  volumesInformation: [],

  /**
   * The volumes state to save and restore after suspend event, restarts,
   * crashes, etc.
   * @type {Object.<string, Object>}
   */
  volumesState: null,

  /**
   * Downloads an archive in order to use it inside the tests. The download
   * operation is required in order to obtain a Blob object for the archive,
   * object that is needed by the Decompressor to read the archive's data.
   * @param {string} archiveName The archive name in 'archives/' directory.
   * @param {Object} volumeInformation The volume information for archiveName.
   * @return {Promise} A promise that can be used with Promise.all.
   * @private
   */
  getArchiveBlob_: function(archiveName, volumeInformation) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', tests_helper.ARCHIVE_BASE_URL_ + archiveName);
      xhr.responseType = 'blob';

      xhr.onload = function(e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            volumeInformation.entry.file =
                sinon.stub().callsArgWith(0, xhr.response /* The blob. */);
            resolve();
          } else {
            reject(xhr.statusText + ': ' + archiveName);
          }
        }
      };

      xhr.onerror = function(e) {
        reject(xhr.statusText + ': ' + archiveName);
      };

      xhr.send(null);
    });
  },

  /**
   * Initializes Chrome APIs.
   */
  initChromeApis: function() {
    // Local storage API.
    chrome.storage = {
      local: {
        set: sinon.spy(),
        get: sinon.stub()
      }
    };
    chrome.storage.local.get.withArgs([app.STORAGE_KEY])
        .callsArgWith(1, tests_helper.volumesState);
    chrome.storage.local.get.throws(
        'Invalid argument for get.' /* If app.STORAGE_KEY is invalid. */);

    // File system API.
    chrome.fileSystem = {
      retainEntry: sinon.stub(),
      restoreEntry: sinon.stub(),
      getDisplayPath: sinon.stub()
    };

    tests_helper.volumesInformation.forEach(function(volume) {
      chrome.fileSystem.retainEntry.withArgs(volume.entry)
          .returns(volume.entryId);
      chrome.fileSystem.restoreEntry.withArgs(volume.entryId)
          .callsArgWith(1, volume.entry);
      chrome.fileSystem.getDisplayPath.withArgs(volume.entry)
          .callsArgWith(1, volume.fileSystemId);
    });
    chrome.fileSystem.retainEntry.throws('Invalid argument for retainEntry.');
    chrome.fileSystem.restoreEntry.throws('Invalid argument for restoreEntry.');
    chrome.fileSystem.getDisplayPath.throws(
        'Invalid argument for displayPath.');

    // File system provider API.
    chrome.fileSystemProvider = {
      mount: sinon.stub(),
      unmount: sinon.stub()
    };
    tests_helper.volumesInformation.forEach(function(volume) {
      chrome.fileSystemProvider.mount
          .withArgs({fileSystemId: volume.fileSystemId,
            displayName: volume.entry.name})
          .callsArg(1);
      chrome.fileSystemProvider.unmount
          .withArgs({fileSystemId: volume.fileSystemId})
          .callsArg(1);
    });
    chrome.fileSystemProvider.mount.throws('Invalid argument for mount.');
    chrome.fileSystemProvider.unmount.throws('Invalid argument for unmount.');
  },

  /**
   * Initializes the tests helper. Should call Promise.then to finish
   * initialization as it is done asynchronously.
   * @param {Array.<string>} archivesToTest A list with the names of the
   *     archives to test. The archives should be present in 'archives/'
   *     directory.
   * @return {Promise} A promise that will finish initialization asynchronously.
   */
  init: function(archivesToTest) {
    // Init volumesState.
    tests_helper.volumesState = {};
    tests_helper.volumesState[app.STORAGE_KEY] = {};

    // Create promises to obtain archives blob.
    var getArchivesBlobPromises = [];
    archivesToTest.forEach(function(archiveName) {
      // Inititialization is done outside of the promise in order for Mocha to
      // correctly identify the number of tests_helper.volumesInformation when
      // it initialiazes tests. In case this is done in the promise, Mocha
      // will think there is no volumeInformation because at the time the
      // JavaScript test file is parssed tests_helper.volumesInformation will
      // still be empty.
      var fileSystemId = archiveName + '_id';
      var volumeInformation = {
        fileSystemId: fileSystemId,
        entry: {
          file: null,  // Lazy initialization in Promise.
          name: archiveName + '_name'
        },
        entryId: archiveName + '_entry'
      };

      tests_helper.volumesInformation.push(volumeInformation);
      tests_helper.volumesState[app.STORAGE_KEY][fileSystemId] = {
        entryId: volumeInformation.entryId
      };

      // Get the archives blob.
      getArchivesBlobPromises.push(
          tests_helper.getArchiveBlob_(archiveName, volumeInformation));
    });

    return Promise.all(getArchivesBlobPromises);
  }
};