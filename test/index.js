/* jshint node:true,mocha:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true */

const assert = require('assert');
require('should');
const fs = require('fs');
const cmd =  require('command-promise');
const verifyFSDirMD5 = require('verify-fsdir-md5');
// for storage API >=2.x
const {Storage} = require('@google-cloud/storage');
const storage = new Storage({keyFilename: './test-storage.json'});
const pipeToStorage = require('pipe-to-storage')(storage);
const verifyBucketMD5 = require('verify-bucket-md5')(storage);
const zipBucket = require('../index.js')(storage);

const bucket = 'eaftc-travis-testing';

function fname(path){
    return path.replace(/.*\//,'');
}

function assertFileExists(f, expected){
    return (storage
	    .bucket(bucket)
	    .file(f)
	    .exists()
	    .then(function(data){
		if (!Array.isArray(data)) throw new Error("expected array");
		if (data.length!==1) throw new Error("expected returned array to be length 1, got: "+data.length);
		if (data[0]!==expected) throw new Error("expected exists "+f+" to be "+expected+", got: "+data[0]);
		return (data[0]===expected);
	    })
	   );
}

const fromBucket = bucket;
const toBucket = bucket;
const fromPath = 'zipfodder';
const toPath = 'zipped/zip.zip';
const keep = '/tmp/zipbuckettest.zip';


const file1 = fromPath+'/hello.txt';
const file2 = fromPath+'/date.json';
const file3 = fromPath+'/code.js';
const md5file = fromPath+'/md5.json';

const files = [file3,file2,file1]; // sort order

function filesExist(expected){
    return Promise.all(files
		       .concat(md5file)
		       .map((f)=>(assertFileExists(f,expected)))
		      );
}

function deleteFiles(){
    return (Promise
	    .all(files
		 .concat(md5file,toPath)
		 .map( (f)=>(storage
			     .bucket(bucket)
			     .file(f)
			     .delete()
			     .catch((e)=>{})
				 ) )
		)
	    .then(()=>{ fs.unlink(keep, (e)=>{}); })
	    .catch((e)=>{})
		.then(cmd.so('rm -rf /tmp/zipfodder'))
	    .catch((e)=>{})
		);
}

function suite(){
    it('should throw an error if fromBucket is not defined', function(){
	zipBucket.should.throw();
    });
    it('should throw an error if fromBucket is defined but fromPath is not defined', function(){
	zipBucket.bind({},{fromBucket:'eaftc-nonexistent-test-bucket'}).should.throw();
    });
    it('should resolve to null if neither keep nor toBucket defined', function(){
	return zipBucket({fromBucket:'eaftc-nonexistent-test-bucket', fromPath:''}).then(
	    function(result){
		assert.ok(result===null);
	    });
    });
    it('simple request to zip all files in bucket succeeds without error', function(){
	return zipBucket({
	    fromBucket,
	    fromPath: "",
	    toBucket,
	    toPath:"all.zip"
	}).then((result)=>{
	    assert.ok(result.manifest.length>0);
	    return storage.bucket(bucket).file("all.zip").delete();
	});
    });
    it('simple request to zip all files, with progress messages enabled, succeeds without error', function(){
	return zipBucket({
	    fromBucket,
	    fromPath: "",
	    toBucket,
	    toPath:"all.zip",
	    progress: 1
	}).then(()=>(storage.bucket(bucket).file("all.zip").delete()));
    });
    it('zip files with mappper that rejects all files succeeds with error', function(){
	return zipBucket({
	    fromBucket,
	    fromPath: '',
	    toBucket,
	    toPath: "none.zip",
	    mapper: (fInBucket, fSuggested)=>(false)
	}).then((result)=>{
	    assert.ok(result.manifest.length===0);
	    return storage.bucket(bucket).file("none.zip").delete();
	});
    });
    it('delete test files', function(){
	return deleteFiles();
    });
    it('no files exist', function(){
	return filesExist(false).then(()=>(assertFileExists(toPath, false)));
    });
    it('create the files for testing', function(){
	return Promise.all([
	    pipeToStorage('Hello World '+Math.random(),bucket,file1),
	    pipeToStorage(new Date().toString(),bucket,file2),
	    pipeToStorage(()=>(fs.createReadStream("./index.js")), bucket, file3)
	]).then(function(info){
	    if (info.length!==3)
		throw new Error("expected info to be array of length 3, got: "+JSON.stringify(info));
	    const md5s = {};
	    info.forEach( (inf)=>{inf.file = fname(inf.file); } );
	    info.forEach( (inf)=>{ md5s[inf.file] = inf.md5; } );
	    return pipeToStorage(JSON.stringify(md5s),bucket,md5file);
	});
    });
    it('all of the input files exist', function(){
	return filesExist(true);
    });
    it('verifyBucketMD5 resolves to [true, ...]', function(){
	return (verifyBucketMD5(bucket,md5file)
		.then(function(status){
		    assert.ok(status[0]);
		})
	       );
    });
    it('zipBucket resolves without throwing error', function(){
	return zipBucket({fromBucket,fromPath,toBucket,toPath,keep });
    });
    it('zip file exists on storage', function(){
	return assertFileExists(toPath, true);
    });
    it('zip exists locally as '+keep, function(){
	return assert.ok(fs.existsSync(keep));
    });
    it('can unzip this file with unzip shell command', function(){
	return cmd('cd /tmp && unzip '+keep);
    });
    it('verifyDirMD5 resolves to [true, ...]', function(){
	return (verifyFSDirMD5('/tmp/zipfodder/md5.json')
		.then(function(status){
		    assert.ok(status[0]);
		})
	       );
    });
    it('delete test files', function(){
	return deleteFiles();
    });
    it('no files exist', function(){
	return filesExist(false).then(()=>(assertFileExists(toPath,false)));
    });
}

describe('bucketZip: ', suite);

