// Small dependency-free Chrome DevTools helper for local browser verification.
import fs from 'node:fs';
export const base=process.env.FF_TEST_BASE||'http://127.0.0.1:8080';
const targets=await(await fetch((process.env.FF_CDP_URL||'http://127.0.0.1:9222')+'/json/list')).json();
const target=targets.find(t=>t.type==='page');
if(!target)throw new Error('Launch a dedicated Chrome test profile on port 9222.');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let nextId=0;const pending=new Map();export const errors=[];
ws.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id){const p=pending.get(value.id);if(p){pending.delete(value.id);value.error?p.reject(new Error(value.error.message)):p.resolve(value.result);}}else if(value.method==='Runtime.exceptionThrown')errors.push(value.params.exceptionDetails.exception?.description||value.params.exceptionDetails.text);else if(value.method==='Log.entryAdded'&&value.params.entry.level==='error')errors.push(value.params.entry.text);});
export function command(method,params={}){const id=++nextId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});}
export async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function waitFor(expression){for(let i=0;i<300;i++){if(await evaluate(expression))return;await delay(150);}throw new Error('Timed out waiting for '+expression);}
export async function navigate(path,ready='document.readyState==="complete"'){await command('Page.navigate',{url:base+path});await waitFor('location.href==='+JSON.stringify(base+path)+'&&document.readyState==="complete"');await waitFor(ready);if(await evaluate('!!document.querySelector("#content")'))await waitFor('document.documentElement.dataset.appReady==="true"||!!document.querySelector("#notice")?.textContent');await evaluate('document.fonts.ready.then(()=>true)');}
export async function viewport(width){await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});}
export async function screenshot(name){fs.mkdirSync('test-results/redesign',{recursive:true});const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync('test-results/redesign/'+name+'.png',Buffer.from(shot.data,'base64'));}
let checks=0;
export function check(value,label){if(!value)throw new Error(label);checks++;console.log('PASS',label);}
export function finish(){console.log('PASS:',checks,'browser checks');ws.close();}
await command('Page.enable');await command('Runtime.enable');await command('Log.enable');
