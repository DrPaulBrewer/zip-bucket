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
    retries: 2,
    factor: 1.5,
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

module.exports = function zipBucket(storage){
    "use strict";
    return function({fromBucket,fromPath,toBucket,toPath,keep,mapper,metadata}){
	if (typeof(fromBucket)!=="string") throw new Error("fromBucket require string, got:"+typeof(fromBucket));
	if (typeof(fromPath)!=="string") throw new Error("fromPath require string, got:"+typeof(fromPath));
	const manifest = [];
	const tmpzip = '/tmp/'+uuid()+'.zip';
	const output = fs.createWriteStream(tmpzip);
	output.on('error', (e)=>{ throw e; });
	const zip = archiver('zip', {
	    zlib: { level: 9 }
	});
	zip.on('error', (e)=>{ throw e; });
	zip.pipe(output);
	function getListOfFromFiles(){
	    return (promiseRetry((retry)=>(storage.bucket(fromBucket).getFiles({prefix:fromPath}).catch(retry)), backoffStrategy)
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
		return promiseRetry((retry)=>(storage.bucket(toBucket).upload(tmpzip, options).catch(retry), backoffStrategy));
	    }
	}
	function keepTheZipFile(){
	    if (keep){ 
		return new Promise(function(resolve,reject){
		    mv(tmpzip,keep,(e)=>{if(e) reject(e); else resolve();});
		});
	    }
	}
	function successfulResult(){
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
		.then(successfulResult)
	       );	
    };
};
