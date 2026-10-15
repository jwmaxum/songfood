import 'server-only';
import {cache} from 'react';
import {getAllContentBlocks} from './content-blocks-db';
import {emptySiteImages,projectSiteImages} from './site-images';
export const getSiteImages=cache(async()=>{
 try{return projectSiteImages(await getAllContentBlocks());}catch{return emptySiteImages;}
});
