# zip-bucket

[![Build Status](https://travis-ci.org/DrPaulBrewer/zip-bucket.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/zip-bucket)

Creates a .zip archive from a collection of files in a Google Cloud Storage[tm] bucket.  Include nodejs library and simple command-line program.

Keep the resulting .zip file locally, upload back to Google Cloud Storage, or both.

## Command Line Program

### Installation

For global installation of the command line program, so that all users can use "zip-bucket":

    sudo npm install -g zip-bucket

### Usage

Enter `zip-bucket --help` to print this reminder message:

<pre>

  Usage: zip-bucket [options] fromBucketPath [toBucketPath]

  Options:

    -h, --help       output usage information
    -V, --version    output the version number
    --key <keyfile>  keyfile to access Google Cloud Storage API
    --keep <keep>    path in local filesystem to keep a copy of the .zip file
    --progress       show progress messages
    --json           output parameters and manifest in json at program completion

</pre>

`<fromBucketPath>` has the format `gs://bucketName/path`

`<toBucketPath>` needs to include the zip file name, e.g. `gs://bucketName/some/other/path/myzipfile.zip`

### Examples

#### Example #1

Goal: zip up the files found at gs://my-bucket/2016 to another bucket gs://backup-bucket/my2016.zip, show progress messages (not shown)

    $ zip-bucket --progress --key /path/to/secret/key.json gs://my-bucket/2016 gs://backup-bucket/my2016.zip

#### Example #2

Goal: zip up the files found at gs://my-bucket/20170402T0616/U to a local file /tmp/sims2.zip and output the manifest (and parameters) in JSON

    $ zip-bucket --json --key /path/to/secret/key.json --keep /tmp/sims2.zip gs://my-bucket/20170402T0616/U/
                 {
		     "keep": "/tmp/sims2.zip",
		     "fromBucket": "my-bucket",
		     "fromPath": "20170402T0616/U/",
		     "manifest": [
			 [
			     "20170402T0616/U/effalloc.csv",
			     "U/effalloc.csv"
			 ],
			 [
			     "20170402T0616/U/md5.json",
			     "U/md5.json"
			 ],
			 [
			     "20170402T0616/U/ohlc.csv",
			     "U/ohlc.csv"
			 ],
			 [
			     "20170402T0616/U/profit.csv",
			     "U/profit.csv"
			 ],
			 [
			     "20170402T0616/U/sim.json",
			     "U/sim.json"
			 ],
			 [
			     "20170402T0616/U/trade.csv",
			     "U/trade.csv"
			 ],
			 [
			     "20170402T0616/U/volume.csv",
			     "U/volume.csv"
			 ]
		     ]
		 }


## Library

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

## /tmp files

The zip procedure creates unique .zip files in /tmp . These temporary .zip files are deleted on success -- but not deleted on error -- and may accumulate over time or potentially allow unauthorized reading or
copying of the data.  

## Limitations

Input files are streamed so the limit is not dependent on the size of input files except through the size
of the resulting zip file.  The maximum zip file size will depend on the space available in `/tmp`.  


## Google Cloud Charges

Keep in mind that running this software outside of Google Cloud will result in bandwidth fees. To save money,
you should probably find a way to run it from within Google Cloud.

Note:  All Google service fees are your responsibility, as the user of this software, and under the MIT License there is
a disclaimer of liability for any defects in this software.

## Local Testing

If you clone the repository and want to test it locally, you will need to change the storage initialization and
bucket names in ./test/index.js to something more appropriate for your local tests.  

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




