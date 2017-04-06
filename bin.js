#!/usr/bin/env node

/* Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint node:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true */

const fs = require('fs');
const program = require('commander');
const storageFactory = require('@google-cloud/storage');
const zipBucketFactory = require("./index.js");
const assert = require('assert');

const z = {};

let projectId, credentials, useJSON, keep;

function setAPIKey(keyFilename){
    projectId = JSON.parse(fs.readFileSync(keyFilename)).project_id;
    credentials = { projectId, keyFilename };
}

function setJSON(){
    useJSON = true;
}

function setProgress(){
    z.progress = 1;
}

function setKeep(path){
    z.keep = path;
}

function gsParse(path, bucketProperty, pathProperty){
    const match = /gs\:\/\/([^\/]+)\/(.*)/.exec(path);
    if ((!match) || (match.length!==3)) return false;
    z[bucketProperty] = match[1];
    z[pathProperty] = match[2];
    return true;
}

function output(status){
    if (useJSON)
	console.log(JSON.stringify(status,null,2));
    else
	explain(status);
}

(program
 .version('0.1.0')
 .arguments('<fromBucketPath> [toBucketPath]')
 .option('--key <keyfile>', 'keyfile to access Google Cloud Storage API', setAPIKey)
 .option('--keep <keep>', 'path in local filesystem to keep a copy of the .zip file', setKeep)
 .option('--progress', 'show progress messages', setProgress)
 .option('--json','output parameters and manifest in json', setJSON)
 .action(function(fromBucketPath, toBucketPath){
     if (gsParse(fromBucketPath,'fromBucket','fromPath')){
	 gsParse(toBucketPath, 'toBucket', 'toPath');
	 const storage = storageFactory(credentials);
	 const zipBucket = zipBucketFactory(storage);
	 zipBucket(z).then(
	     (status)=>{if (useJSON) console.log(JSON.stringify(status,null,2));}, (e)=>(console.log(e))
	 );
     }
 })
 .parse(process.argv)
);





