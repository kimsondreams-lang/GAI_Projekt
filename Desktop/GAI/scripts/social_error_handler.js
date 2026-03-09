module.exports={logError:function(p,e,c){console.error('['+p+']',e);},withRetry:async function(fn){return await fn();}}
