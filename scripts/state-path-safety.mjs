import {
 constants as fsConstants, closeSync, fstatSync, fsyncSync, lstatSync,
 mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync
} from "node:fs";
import {basename, dirname, isAbsolute, join, resolve, sep} from "node:path";
import {randomBytes} from "node:crypto";

const macOSAliases=new Map([["/var","/private/var"],["/tmp","/private/tmp"],["/etc","/private/etc"]]);
const inside=(root,path)=>path===root||path.startsWith(root.endsWith(sep)?root:root+sep);
const lstatOrNull=path=>{try{return lstatSync(path);}catch(error){if(error.code==="ENOENT")return null;throw error;}};

function inspectDirectoryPath(directory,{create=false}={}){
 const absolute=resolve(directory),root=absolute.startsWith(sep)?sep:"";
 let current=root;
 for(const part of absolute.slice(root.length).split(sep).filter(Boolean)){
  const next=join(current,part);
  let info=lstatOrNull(next);
  if(!info&&create){
   try{mkdirSync(next,{mode:0o700});}catch(error){if(error.code!=="EEXIST")throw error;}
   info=lstatOrNull(next);
  }
  if(!info){current=next;continue;}
  if(info.isSymbolicLink()){
   const target=realpathSync.native(next);
   if(process.platform==="darwin"&&macOSAliases.get(next)===target){current=next;continue;}
   throw new Error("Unsafe state path: symbolic link in directory path: "+next);
  }
  if(!info.isDirectory())throw new Error("Unsafe state path: parent component is not a directory: "+next);
  assertTrustedDirectory(next,info);
  current=next;
 }
 return current||sep;
}

function assertTrustedDirectory(path,info,{stateRoot=false}={}){
 const mode=info.mode&0o7777,uid=typeof process.getuid==="function"?process.getuid():null;
 const ownerTrusted=uid===null||info.uid===uid||info.uid===0;
 const rootStickyTemp=info.uid===0&&(mode&0o1000)!==0&&(path==="/tmp"||path==="/private/tmp");
 if(!ownerTrusted||((mode&0o022)!==0&&!rootStickyTemp))
  throw new Error("Unsafe state path: directory is writable by an untrusted user: "+path);
 if(stateRoot&&(info.uid!==uid||(mode&0o077)!==0))
  throw new Error("Unsafe state path: state root must be owned by the current user and private (0700): "+path);
}

function assertRegularFileOrMissing(path){
 const info=lstatOrNull(path);
 if(!info)return;
 if(info.isSymbolicLink())throw new Error("Unsafe state path: symbolic link file is not allowed: "+path);
 if(!info.isFile())throw new Error("Unsafe state path: expected a regular file: "+path);
}

export function resolveSafeStatePath(value=".draft/candidates-state.json",cwd=process.cwd()){
 if(typeof value!=="string"||value.length===0)throw new Error("--state must be a non-empty file path");
 const workingRoot=resolve(cwd),absolute=resolve(workingRoot,value);
 if(!isAbsolute(value)&&!inside(workingRoot,absolute))
  throw new Error("Unsafe state path: relative --state paths must remain within the current working directory");
 const parent=inspectDirectoryPath(dirname(absolute));
 const statePath=join(parent,basename(absolute));
 assertRegularFileOrMissing(statePath);
 return statePath;
}

export function assertSafeStatePath(statePath){
 inspectDirectoryPath(dirname(statePath));
 assertRegularFileOrMissing(statePath);
 return statePath;
}

export function ensureSafeStateParent(statePath){
 inspectDirectoryPath(dirname(statePath),{create:true});
 const parent=dirname(statePath),info=lstatOrNull(parent);
 if(info?.uid===0&&(info.mode&0o1000)!==0&&(parent==="/tmp"||parent==="/private/tmp"))
  throw new Error("Unsafe state path: use a private subdirectory below the shared temporary directory");
 assertTrustedDirectory(parent,info,{stateRoot:basename(parent)===".draft"});
 assertSafeStatePath(statePath);
}

export function readSafeStateFile(statePath){
 assertSafeStatePath(statePath);
 const noFollow=fsConstants.O_NOFOLLOW;
 if(typeof noFollow!=="number")throw new Error("Safe state reads require O_NOFOLLOW support from the operating system");
 const fd=openSync(statePath,fsConstants.O_RDONLY|noFollow);
 try{
  if(!fstatSync(fd).isFile())throw new Error("Unsafe state path: state is not a regular file");
  const contents=readFileSync(fd,"utf8");
  assertSafeStatePath(statePath);
  return contents;
 }finally{closeSync(fd);}
}

export function acquireSafeStateLock(statePath){
 assertSafeStatePath(statePath);
 const lockPath=statePath+".lock";
 assertRegularFileOrMissing(lockPath);
 const fd=openSync(lockPath,"wx",0o600);
 let identity;
 try{
  identity=fstatSync(fd);
  assertSafeStatePath(statePath);
  assertRegularFileOrMissing(lockPath);
  return {fd,lockPath,device:identity.dev,inode:identity.ino};
 }catch(error){
  closeSync(fd);
  try{
   inspectDirectoryPath(dirname(lockPath));
   const info=lstatOrNull(lockPath);
   if(identity&&info?.dev===identity.dev&&info?.ino===identity.ino)unlinkSync(lockPath);
  }catch{}
  throw error;
 }
}

export function releaseSafeStateLock(lock){
 if(!lock)return;
 try{closeSync(lock.fd);}catch{}
 try{
  inspectDirectoryPath(dirname(lock.lockPath));
  const info=lstatOrNull(lock.lockPath);
  if(info?.isFile()&&info.dev===lock.device&&info.ino===lock.inode)unlinkSync(lock.lockPath);
 }catch{}
}

export function writeSafeStateAtomically(statePath,contents){
 assertSafeStatePath(statePath);
 const tempPath=statePath+"."+randomBytes(6).toString("hex")+".tmp";
 let fd,created=false,identity;
 try{
  assertSafeStatePath(statePath);
  fd=openSync(tempPath,"wx",0o600);
  created=true;
  identity=fstatSync(fd);
  writeFileSync(fd,contents);
  fsyncSync(fd);
  closeSync(fd);fd=undefined;
  assertSafeStatePath(statePath);
  const tempInfo=lstatOrNull(tempPath);
  if(!tempInfo?.isFile()||tempInfo.dev!==identity.dev||tempInfo.ino!==identity.ino)
   throw new Error("Unsafe state path: temporary file changed before atomic replacement");
  renameSync(tempPath,statePath);
  created=false;
  assertSafeStatePath(statePath);
  const stateInfo=lstatOrNull(statePath);
  if(!stateInfo?.isFile()||stateInfo.dev!==identity.dev||stateInfo.ino!==identity.ino)
   throw new Error("Unsafe state path: atomic replacement did not persist the expected file");
 }finally{
  if(fd!==undefined)try{closeSync(fd);}catch{}
  if(created)try{
   assertSafeStatePath(statePath);
   const info=lstatOrNull(tempPath);
   if(info?.isFile()&&identity&&info.dev===identity.dev&&info.ino===identity.ino)unlinkSync(tempPath);
  }catch{}
 }
}
