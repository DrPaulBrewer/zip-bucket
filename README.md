# zip-bucket

![Build Status](https://github.com/DrPaulBrewer/zip-bucket/actions/workflows/node.js.yml/badge.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/DrPaulBrewer/zip-bucket/badge.svg)](https://snyk.io/test/github/DrPaulBrewer/zip-bucket)

Creates a .zip archive from a collection of files in a Google Cloud Storage[tm] bucket.  Include nodejs library and simple command-line program.

Keep the resulting .zip file locally, upload back to Google Cloud Storage, or both.

## Command Line Program

The `zip-bucket` command line program was split off
into its own module in v2.0.0.  

install [zip-bucket-bin](https://npmjs.com/zip-bucket-bin) for the `zip-bucket` command line program

## Library

The v2.0.0 library is the same as v1.9.0.  The only breaking change
is the removal of the  `zip-bucket` command line program and associated dependencies.

### Installation

    npm i zip-bucket -S

### Importing and Setup

    const storage = require('@google-cloud/storage')(optional_api_key);

**Pass the storage object** when setting up zipBucket for usage.

    const zipBucket = require('zip-bucket')(storage);

### Usage

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

`zipBucket` does not delete the files from the bucket after copying them to the `.zip` archive. That's your job. The resolved `manifest` may be helpful.

## Limitations

The current tests include a 100MB file and several smaller files. Streaming is used, and the write stream to 
Google Cloud Storage can sometimes timeout (~1%). This and other issues can be caught with the Promise's `.catch`.

## Google Cloud Charges

Keep in mind that running this software outside of Google Cloud will result in bandwidth fees. To save money,
you should probably find a way to run it from within Google Cloud.

Note:  All Google service fees are your responsibility, as the user of this software, and under the MIT License there is
a disclaimer of liability for any defects in this software.

## Local Testing

If you clone the repository and want to test it locally, you will need to change the storage initialization and
bucket names in ./test/index.js to something more appropriate for your local tests.  

## Copyright

Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC <drpaulbrewer@eaftc.com> and Contributors

## Contributions

@atlanteh Windows compatibility, downloadValidation flag, v1.0 based on streaming

@harscoet Patch for issue with bin.js, move bin.js dependencies to "dependencies"

## License

The MIT License

### Trademarks

Google Cloud Storage[tm] is a trademark of Google, Inc.

This software is not a product of Google, Inc.




