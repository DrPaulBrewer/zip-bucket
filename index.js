/* Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true,node:true */

const fs = require('fs');
const mv = require('mv');
const archiver = require('archiver');
const uuid = require('uuid/v4');
const promiseRetry = require('promise-retry');
const pEachSeries = require('p-each-series');

const backoffStrategy = {
    retries: 3,
    factor: 2,
    minTimeout:  1000,
    maxTimeout: 10000,
    randomize: true
};

function suggestedName(fname, fromPath){
    "use strict";
    if ((!fromPath) || (fromPath.length===0) || (fromPath==='/'))
	return fname;
    const splitFrom = fromPath.split("/").filter((s)=>(s.length>0));
    const index = splitFrom.length-1;
    if (index<=0)
	return fname;
    const splitFname = fname.split("/").filter((s)=>(s.length>0));
    if (splitFname.length>index)
	return splitFname.slice(index).join("/");
    return fname;
}

function getFilesOptions(fromPath, pathDelimiter) {
	const getFilesOptions = {};
	getFilesOptions.prefix = fromPath;
	if (pathDelimiter !== false) {
		getFilesOptions.delimiter = pathDelimiter;
	}
	return getFilesOptions;
}

module.exports = function zipBucket(storage){
    "use strict";
    return function({fromBucket,fromPath,toBucket,toPath,keep,mapper,metadata,progress, pathDelimiter = false}){
	if (typeof(fromBucket)!=="string") throw new Error("fromBucket require string, got:"+typeof(fromBucket));
	if (typeof(fromPath)!=="string") throw new Error("fromPath require string, got:"+typeof(fromPath));
	if (pathDelimiter && typeof(pathDelimiter)!=="string") throw new Error("pathDelimiter require string, got:"+typeof(fromPath));
	if ((!keep) && (!toBucket)) return Promise.resolve(null);
	const manifest = [];
	const tmpzip = '/tmp/'+uuid()+'.zip';
	const output = fs.createWriteStream(tmpzip);
	output.on('error', (e)=>{ throw e; });
	const zip = archiver('zip', {
	    zlib: { level: 9 }
	});
	zip.on('error', (e)=>{ throw e; });
	zip.pipe(output);
	const filesOptions = getFilesOptions(fromPath, pathDelimiter);
	function getListOfFromFiles(){
	    return (promiseRetry((retry)=>(storage.bucket(fromBucket).getFiles(filesOptions).catch(retry)), backoffStrategy)
		    .then((data)=>(data[0]))
		   );
	}
	function zipFile(f){
	    let pathInZip = suggestedName(f.name, fromPath);
	    if (typeof(mapper)==='function'){
		pathInZip = mapper(f, pathInZip);
		if (!pathInZip)
		    return false;
	    }
	    if (progress) console.log("adding gs://"+fromBucket+"/"+f.name);
	    return new Promise(function(resolve, reject){
		const reader = storage.bucket(fromBucket).file(f.name).createReadStream();
		reader.on('error', (e)=>{ reject(e); });
		reader.on('end',()=>{
		    manifest.push([f.name,pathInZip]);
		    resolve([f.name,pathInZip]);
		});
		zip.append(reader, {name: pathInZip});
	    });
	}
	function zipEachFile(filelist){
	    return pEachSeries(filelist, (f)=>(zipFile(f)));
	}
	function finalize(){
	    return new Promise(function(resolve){
		if (progress) console.log("finalizing zip file");
		output.on('close', ()=>(resolve()));
		zip.finalize();
	    });
	}
	function uploadTheZipFile(){
	    // see docs and example at:
	    // https://googlecloudplatform.github.io/google-cloud-node/#/docs/storage/1.0.0/storage/bucket?method=upload
	    if (toBucket){
		const options = {
		    destination: toPath,
		    validation: 'md5',
		    metadata: {
			contentType: 'application/zip'
		    }
		};
		if (typeof(metadata)==='object') options.metadata.metadata = metadata;
		if (progress) console.log("uploading zip file to gs://"+toBucket+"/"+toPath);
		return promiseRetry((retry)=>(storage.bucket(toBucket).upload(tmpzip, options).catch(retry)), backoffStrategy);
	    }
	}
	function keepTheZipFile(){
	    if (keep){
		if (progress) console.log("saving zip file locally to "+keep);
		return new Promise(function(resolve,reject){
		    mv(tmpzip,keep,(e)=>{if(e) reject(e); else setTimeout(resolve, 100); });
		});
	    }
	}
	function checkZipExistsInBucket(){
	    if (toBucket){
		if (progress) console.log("confirming existence of zip file at gs://"+toBucket+"/"+toPath);
		return (promiseRetry((retry)=>(storage
					       .bucket(toBucket)
					       .file(toPath)
					       .exists()
					       .then((info)=> {if (!(info[0])) throw new Error("checkZipExistsInBucket: zip file not found in storage bucket"); })
					       .catch(retry)
						   ), backoffStrategy)
		       );
	    }
	}
	function deleteTheZipFile(){
	    return new Promise(function(resolve,reject){
		// ignore errors as keepTheZipFile may have moved/deleted the tmpzip already
		fs.unlink(tmpzip, ()=>{ setTimeout(resolve, 100); });
	    });
	}
	function successfulResult(){
	    if (progress) console.log("finished");
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
	return (getListOfFromFiles()
		.then(zipEachFile)
		.then(finalize)
		.then(uploadTheZipFile)
		.then(keepTheZipFile)
		.then(checkZipExistsInBucket)
		.then(deleteTheZipFile)
		.then(successfulResult)
	       );
    };
};
