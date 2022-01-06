/* Copyright 2017- Paul Brewer, Economic and Financial Technology Consulting LLC and contributors */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true,node:true */

const fs = require('fs');
const archiver = require('archiver');
const promiseRetry = require('promise-retry');
const asyncPool = require('tiny-async-pool');

const backoffStrategy = {
    retries: 3,
    factor: 2,
    minTimeout:  1000,
    maxTimeout: 10000,
    randomize: true
};

function suggestedName(fname, fromPath){
    if ((!fromPath) || (fromPath.length === 0) || (fromPath === '/')) {
        return fname;
    }
    const splitFrom = fromPath.split('/').filter(s => s.length > 0);
    const index = splitFrom.length-1;
    if (index <= 0) {
        return fname;
    }
    const splitFname = fname.split('/').filter(s => s.length > 0);
    if (splitFname.length > index) {
        return splitFname.slice(index).join('/');
    }
    return fname;
}   

const validateOptions = ({fromBucket, fromPath}) => {
    if (typeof(fromBucket) !== 'string') {
        throw new Error(`fromBucket should be of type 'string', got: ${typeof(fromBucket)}`);
    }
    if (typeof(fromPath) !== 'string') {
        throw new Error(`fromPath should be of type 'string', got: ${typeof(fromPath)}`);
    }
}

module.exports = (storage) => (options) => {
    let resumable;

    validateOptions(options);

    if (resumable === null || resumable === undefined || typeof(resumable) !== 'boolean') {
        resumable = true;
    }
    
    const {fromBucket, fromPath, toBucket, toPath, keep, mapper, metadata, progress, downloadValidation, resumable} = options;

    if ((!keep) && (!toBucket)) {
        return Promise.resolve(null);
    }
    const manifest = [];
    
    const zip = archiver('zip', {zlib: { level: 9 }});
    zip.on('error', (e)=>{ throw e; });

    let keepPromise;
    let bucketPromise;
    if (keep) {
        const keepOutput = fs.createWriteStream(keep);
        zip.pipe(keepOutput);
        keepPromise = new Promise((resolve, reject) => {
            keepOutput.on('close', resolve);
            keepOutput.on('error', reject);
        });
    }
    if (toBucket) {
        const uploadOptions = {resumable: resumable, destination: toPath, validation: 'md5', metadata: {contentType: 'application/zip'}};
        if (typeof(metadata) === 'object') {
            uploadOptions.metadata.metadata = metadata;
        }
        logAction(`uploading zip file to gs://${toBucket}/${toPath}`);
        const bucketOutput = storage.bucket(toBucket).file(toPath).createWriteStream(uploadOptions);
        bucketPromise = new Promise((resolve, reject) => {
            bucketOutput.on('finish', resolve);
            bucketOutput.on('error', reject);
        });
        zip.pipe(bucketOutput);
    }

    function logAction(action) {
        if (progress) {
            console.log(action);
        }
    }
    function getListOfFromFiles() {
        return promiseRetry((retry) => storage.bucket(fromBucket).getFiles({prefix:fromPath}).catch(retry), backoffStrategy)
        .then((data)=>(data[0]));
    }

    function zipFile(f) {
        let pathInZip = suggestedName(f.name, fromPath);
        if (typeof(mapper) === 'function') {
            pathInZip = mapper(f, pathInZip);
            if (!pathInZip) {
                return false;
            }
        }

        logAction(`adding gs://${fromBucket}/${f.name}`);

        return new Promise(function(resolve, reject) {
            const reader = storage.bucket(fromBucket).file(f.name).createReadStream({validation: downloadValidation});
            reader.on('error', (e)=>{ reject(e); });
            reader.on('end',() => {
                manifest.push([f.name,pathInZip]);
                resolve([f.name,pathInZip]);
            });
            zip.append(reader, {name: pathInZip});
        });
    }

    function zipEachFile(filelist) {
        const {concurrentLimit = 1} = options;
        return asyncPool(concurrentLimit, filelist, zipFile);
    }

    function finalize() {
        logAction('finalizing zip file');
        zip.finalize();
        return Promise.all([keepPromise, bucketPromise]);
    }

    function checkZipExistsInBucket() {
        if (toBucket) {
            logAction(`confirming existence of zip file at gs://${toBucket}/${toPath}`);

            return promiseRetry((retry)=>(storage
            .bucket(toBucket)
            .file(toPath)
            .exists()
            .then((info)=> {if (!(info[0])) throw new Error('checkZipExistsInBucket: zip file not found in storage bucket'); })
            .catch(retry)
            ), backoffStrategy)
        }
    }

    function successfulResult() {
        logAction('finished');

        return {
            keep,
            fromBucket,
            fromPath,
            toBucket,
            toPath,
            metadata,
            manifest
        };
    }	
    
    return getListOfFromFiles()
        .then(zipEachFile)
        .then(finalize)
        .then(checkZipExistsInBucket)
        .then(successfulResult);
};
