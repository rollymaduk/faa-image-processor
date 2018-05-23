import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
import * as cors from 'cors'
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as storage from '@google-cloud/storage'
const express = require('express');
const rimraf = require('rimraf');
import * as pathExt from 'path';
const hexRgb = require('hex-rgb');

const BASEURL = 'https://storage.googleapis.com';
const ROOTDIR = '/tmp';
const DEFAULTBUCKET = 'faac-image-viewer-react.appspot.com'
const EXT = '.dzi';
const DEFAULT_EMBOSS_PATH = 'faac-emboss.png';
const overlayOptions = { gravity: sharp.gravity.southeast};
const DEFAULT_RGBA  = {r: 255, g: 255, b: 255, alpha: 0.2};

const app = express();

app.use(cors({origin:true}));

const getFilename=(path)=>pathExt.parse(path).name;

const getDir = (path:string)=>{
    const {name,dir} = pathExt.parse(path)
    return `${dir}/${name}`
}

const getExt =(path)=>pathExt.parse(path).ext;


const getViewerFilePath =(path)=>`${getDir(path)}/${getFilename(path)}${EXT}`;


const getSourceContent = (bucket,path,isContent:boolean=false)=>{
    if(!isContent){
        return `${BASEURL}/${bucket.name}${getViewerFilePath(path)}`
    }else{
        return bucket.file(getViewerFilePath(path))
            .download()
            .then((data)=>{
                return data[0].toString('utf8')
            })
    }

}

const getThumbnailSource = (bucket,thumbNailPath)=> {
    return `${BASEURL}/${bucket.name}${thumbNailPath}`
}



const deleteTempFile = (tempFile)=>{
    return new Promise((resolve,reject)=>{
       rimraf(tempFile, (error)=>{
           if(error){
               reject(error)
           }else{
               resolve('success deleting folder')
           }
       });
    })
};


const getAllFiles = (dir:string) =>
    fs.readdirSync(dir).reduce((files, file) => {
        const name = pathExt.join(dir, file);
        const isDirectory = fs.statSync(name).isDirectory();
        return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
    }, []);


const getFilesForUpload=(rootDir:string)=>{
     return new Promise((resolve,reject)=>{
         if(rootDir){
             try{
                 const files = getAllFiles(rootDir);
                 resolve(files)
             }catch(error){
                 reject(error)
             }
         }else{
             reject('Error: No Directory path given')
         }
    })
};

const getMainFile=(bucket,path,embossPath)=>{
    const asyncProcess = [bucket.file(path).download()];
    if(embossPath){
        asyncProcess.push(bucket.file(embossPath).download())
    }
    return Promise.all(asyncProcess);
};

const getImageProcessor = (data)=>{
    if(data.length>1){
        return sharp(data[0]).overlayWith(data[1],overlayOptions);
    }
    return sharp(data[0]);
};


const createFilesForViewer =(bucket,path,embossPath,isContent)=>{
    const fileName = getFilename(path)
    const tempFile = `${ROOTDIR}/${fileName}`;
    return  getMainFile(bucket,path,embossPath)
        .then((result)=>{
                const data = result.map(res =>res[0]);
               return getImageProcessor(data)
                   .withMetadata()
                   .tile({
                       size:512
                   })
                   .toFile(tempFile)
        })
        .then(()=>getFilesForUpload(ROOTDIR))
        .then((files:Array<string>)=> Promise.all(files.map(file=>bucket.upload(file,
            {destination:file.replace(ROOTDIR,getDir(path)),gzip:true}))))
        .then(()=>deleteTempFile(`${ROOTDIR}/*`))
        .then((deleted)=>{
            return getSourceContent(bucket,path,isContent)
        })
};

const prepareBgrdColor = (bgrd,transparency)=>{
    const {red:r,green:g,blue:b,alpha} =hexRgb(bgrd,{format:'Array'});
    console.log({r,g,b,alpha})
    return (transparency)?{r,g,b,alpha:+transparency}:{r,g,b,alpha}
}

const prepareThumbnailPath =(w,h,o,b,t,path)=>{
    const name = getFilename(path);
    const dir = getDir(path);
    return `${dir}/thumbs/${name}_w${w}_h${h}_o${o}_b${b}_t${t}.jpg`
}

const createThumbnail =(bucket,w,h,o,b,t,path)=>{
    const file = bucket.file(path);
    const thumbnailPath = prepareThumbnailPath(w,h,o,b,t,path);
    const thumbnail = bucket.file(thumbnailPath)
    const transformer = sharp()
        .resize(+w,+h)
        .background(prepareBgrdColor(b,t))[o]()
        .toFormat('jpeg');

    return new Promise((resolve,reject)=>{
        file.createReadStream().pipe(transformer)
            .pipe(thumbnail.createWriteStream({validation:false,
                public:true,gzip:true,metadata:{
                    contentType:'image/jpeg'
                }}))
            .on('error',(err)=>{
                reject(err)
            })
            .on('finish',()=>{
                resolve(getThumbnailSource(bucket,thumbnailPath))
            })
    })
};

app.get('/resize/:bucket',(req,res)=>{
    /* w for width,h for height & o for operation on image*/
    const bucketName=req.params.bucket;
    const {path,w,h,o,b,t,showImage,refresh} = req.query;
    if(!w || !h ||!path){
        res.status(400).send('Bad Request');
        res.end()
    }
    const _o = o || 'embed';
    const  _b = b || '#fff';
    const bucket = storage().bucket(bucketName);
    const thumbNailPath = prepareThumbnailPath(w,h,_o,_b,t,path);
    const thumbnail = bucket.file(thumbNailPath);

    bucket.exists()
        .then(bucketExists=>bucketExists[0] && thumbnail.exists())
        .then(thumbnailExists=>(!refresh && thumbnailExists[0]) && getThumbnailSource(bucket,thumbNailPath))
        .then(url => url || createThumbnail(bucket,w,h,_o,_b,t,path))
        .then(url=>(url && showImage)?thumbnail.download({validation:false}):url)
        .then(payload=>{
            console.log(payload);
            res.set('Content-Type', (showImage)?'image/jpeg':'text/plain');
            res.send(showImage?payload[0]:payload)
        })
        .catch(err=>{
            console.log(err)
            res.status(501).send(err)
        })

})

app.get('/:bucket',(req,res)=>{
    const bucketName=req.params.bucket;
    const {path,isContent,embossPath,refresh} = req.query;
    const _embossPath = embossPath || DEFAULT_EMBOSS_PATH;
    if(path){
        const bucket = storage().bucket(bucketName);
        const filesForViewer = bucket.file(getViewerFilePath(path));
        bucket.exists()
            .then((bucketExists)=>{
                return bucketExists[0] && filesForViewer.exists()
            })
            .then((fileExists)=>{
             return (!refresh && fileExists[0])  && getSourceContent(bucket,path,isContent)
        })
            .then((url)=>{
                return url || createFilesForViewer(bucket,path,_embossPath,isContent)
            })
            .then(payload=>{
                res.set('Content-Type', 'text/plain');
                res.send(payload)
            })
       .catch(err=>{
           res.status(501).send(err)
       })
    }else{
        res.status(400).send('Bad Request');
    }
})

export const processImageforViewer = functions.https.onRequest(app);