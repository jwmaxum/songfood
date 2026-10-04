import type {Instrumentation} from 'next';
export const onRequestError:Instrumentation.onRequestError=(_error,_request,context)=>{
 // Route templates contain no concrete record IDs, query strings or personal data.
 console.error(JSON.stringify({event:'songfood_request_failed',route:context.routePath,type:context.routeType}));
};
