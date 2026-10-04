// Log only fixed categories/status. Never serialize errors, URLs, headers or user data.
export function reportOperationalFailure(category:'service'|'pricing'|'crm',status:number){
 if(status>=500)console.error(JSON.stringify({event:'songfood_operation_failed',category,status}));
}
