export const MAIL_SUBJECT='송영민푸드 문의·문서 업데이트 | Song Young Min Food Account Update';
export function mailMessage(origin:string){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid mail origin');
 const link=url.origin+'/account';
 return {subject:MAIL_SUBJECT,link,text:'송영민푸드 문의 또는 문서가 업데이트되었습니다. 로그인 후 내 계정에서 확인해 주세요.\nYour inquiry or document has been updated. Sign in to your account to review it.\n'+link+'\nProforma Invoice는 최종 Commercial Invoice가 아닙니다. / A Proforma Invoice is not a final Commercial Invoice.',
 html:'<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px"><img alt="송영민푸드 Song Young Min Food" width="160" src="'+url.origin+'/logo.png"><h1 style="font-size:22px">송영민푸드 문의·문서 업데이트</h1><p>Your inquiry or document has been updated.</p><p>로그인 후 내 계정에서 확인해 주세요.</p><p><a href="'+link+'">내 계정에서 확인 / Review in your account</a></p><p>Proforma Invoice는 최종 Commercial Invoice가 아닙니다.<br>A Proforma Invoice is not a final Commercial Invoice.</p></div>'};
}
