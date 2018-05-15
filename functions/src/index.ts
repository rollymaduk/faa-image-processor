import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as storage from '@google-cloud/storage';
import * as unzipper from 'unzipper';
const stream = require('stream');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
admin.initializeApp();

const BUCKET = 'faac-image-viewer-react.appspot.com';
const EXT:string [] = ['zip', 'gzip'];

const isCompressed = (filename:string) => {
  const fileExt = filename.split('.').pop();
  return EXT.indexOf(fileExt)>0;
};




const getBucketFile = (bucket, path) => storage().bucket(bucket).file(path);

const getReadStream = (bucket, path) => getBucketFile(bucket, path).createReadStream();

const getWriteStream = (bucket, path) => getBucketFile(bucket, path).createWriteStream();

exports.unzipStoredZipFiles = functions.storage
    .bucket(BUCKET)
  .object().onFinalize((object) => {
    if (object.resourceState === 'not_exists') {
      console.log('this is a delete action');
      return null;
    }
    if (object.name && isCompressed(object.name)) {
      getReadStream(object.bucket, object.name)
        .pipe(unzipper.Parse())
        .pipe(stream.Transform({
            objectMode:true,
            transform:(entry, e, cb) => {
                const { path, type } = entry;
                console.log(`Found ${type}: ${path}`);
                entry.pipe(getWriteStream(object.bucket, object.name))
                    .on('error', error => console.log(`Error: ${error}`))
                    .on('finish', () => {
                        console.log('Complete');
                        cb();
                    });
            }
        }));
    }
    return null;
  });

