# zip-bucket

[![Build Status](https://travis-ci.org/DrPaulBrewer/zip-bucket.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/zip-bucket)

Creates a .zip archive from a collection of files in a Google Cloud Storage[tm] bucket.

Keep the resulting .zip file locally, upload back to Google Cloud Storage, or both.

## Installation

npm i zip-bucket -S

## Importing and Setup

    const storage = require('@google-cloud/storage')(optional_api_key);

**Pass the storage object** when setting up zipBucket for usage.

    const zipBucket = require('zip-bucket');

## Usage

zipBucket takes an object with specific properties describing the zip operation, and returns a `Promise`

    zipBucket({ fromBucket, fromPath, toBucket, toPath, keep, mapper, metadata })
    .then(function yourNextTask({fromBucket, fromPath, toBucket, toPath, keep, metadata, manifest}))
    ...

### Object Parameters

`fromBucket` **required** string - The name of the bucket in Google Cloud Storage[tm] to search for files to zip.  Does *not* need to begin with 'gs://'.  Example:  `"my-favorite-bucket"`

`fromPath` **required** string - All files whose names begin with `fromPath` will be selected for adding to the zip file.
Example: `"blogposts/2017/Feb/"`

`toBucket` optional string - The name of the bucket where the zip file is to be stored.  This can be the same string used to set fromBucket.  If undefined, the zip file will not be uploaded to a bucket.  Example: `"my-backup-bucket"`

`toPath` optional string - The path in the bucket to store the zip file, including the file name. Example: `"2017/Feb/blogposts.zip"`

`keep` optional string - A path in the local filesystem to save the zip file.

`metadata` optional object - A key/value object to set custom metadata for your zipfile in Google Cloud Storage.

`mapper` optional function - A `function(GCS_File, fromPath):string` for renaming files inside the zip.  Could also be useful for generating side-effects, like populating metadata, or recording md5 values, etc. Has access to the full File object
in Google Cloud Storage, including metadata, but not file contents. This function can be safely left undefined.

### Promise resolution

The Promise will only resolve successfully if all steps pass, the zip file is created, and is [optionally] uploaded
to the bucket and [optionally] saved.  

The Promise resolves to an object containing the properties shown in the call to `yourNextTask`, which is shown for illustrative purposes only.  Except for `manifest`, these are input properties passed as-is.

THe returned `manifest` consists of an array of pairs of the file name in the bucket and file name in the zip file, i.e. `[[fileNameInBucket, fileNameInZipfile],...]`

### No bucket files are moved or deleted by zipBucket

zipBucket does not delete the files that are zipped.  That's your job.  We haven't tested this much, so you might
want to wait on deleting anything just yet unless you test the zip file integrity yourself.

## Known Issues

* Needs more tests

* Needs to delete its temp files in /tmp

## Copyright

Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC <drpaulbrewer@eaftc.com>

## License

The MIT License

### Trademarks

Google Cloud Storage[tm] is a trademark of Google, Inc.

This software is not a product of Google, Inc.




