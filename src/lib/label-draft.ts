import type {FoodLabel,ExportCountry} from '@/types/label';
import type {ProductItem} from './types';
/** An unreviewed draft must never fabricate ingredients, nutrition, origin or certification. */
export function createLabelDrafts(productId:string,product:ProductItem):Record<ExportCountry,FoodLabel>{
 return Object.fromEntries((['US','CN','JP','EU','UAE'] as const).map(country=>[country,{
  id:'label-'+productId+'-'+country,productId,country,version:1,status:'draft',
  header:{hsCode:product.hs_code||'',productNameKo:product.name,productNameEn:product.name_en||'',productNameTarget:country==='US'||country==='EU'?product.name_en||'':'',legalProductType:''},
  pdp:{claimHighlights:[],certifications:[]},informationPanel:{manufacturerName:product.manufacturer||'',storageConditionKo:product.storage||''},
  ingredients:[],datingLot:{},barcodeMarking:{registrationNumbers:{},recyclingMarks:[]}
 }])) as unknown as Record<ExportCountry,FoodLabel>;
}
