import {ApiError,textField,uuidField} from '../request-security';
import {LABELS,type Mode} from './types';
export function opsQuery(url:string,mode:Mode){
 const q=new URL(url).searchParams,page=Number(q.get('page')||1),category=q.get('category')||'',assigned=q.get('assigned')||'',due=q.get('due')||'',kind=q.get('kind')||'';
 if(!Number.isInteger(page)||page<1||page>100000)throw new ApiError(400,'페이지를 확인해 주세요.');
 if(category&&!Object.hasOwn(LABELS[mode],category))throw new ApiError(400,'업무 분류를 확인해 주세요.');
 if(assigned&&!['mine','unassigned','reassign'].includes(assigned))uuidField(assigned);
 if(!['','overdue','soon','unset','active'].includes(due)||!['','inquiry','order'].includes(kind))throw new ApiError(400,'검색 조건을 확인해 주세요.');
 return {p_q:textField(q.get('q')||'','검색어',120,0),p_category:category,p_assigned:assigned,p_due:due,p_kind:kind,p_page:page};
}
export function workPlan(body:Record<string,unknown>){
 const kind=body.kind;if(kind!=='inquiry'&&kind!=='order')throw new ApiError(400,'업무 종류를 확인해 주세요.');
 if(!Number.isInteger(body.revision)||Number(body.revision)<1)throw new ApiError(400,'최신 업무 버전을 확인해 주세요.');
 let due:string|null=null;
 if(body.due_at!==null&&body.due_at!==''){
 if(typeof body.due_at!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(body.due_at)||!Number.isFinite(Date.parse(body.due_at)))throw new ApiError(400,'마감 시각을 확인해 주세요.');
 due=new Date(body.due_at).toISOString();if(due<'2000-01-01'||due>'2100-01-01')throw new ApiError(400,'마감 시각 범위를 확인해 주세요.');}
 return {p_kind:kind,p_id:uuidField(body.id),p_expected:Number(body.revision),p_assigned:body.assigned_to===null||body.assigned_to===''?null:uuidField(body.assigned_to),
 p_due:due,p_message:textField(body.message,'인수인계·다음 행동',2000,3),p_key:uuidField(body.request_key)};
}
