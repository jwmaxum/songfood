import {formatLabelForExcel,generateMultiCountryExcelWorkbook} from '@/lib/export/excel-generator';
import {emptyBuyer} from '@/components/labels/spec-sheet/BuyerToFillForm';
import type {FoodLabel} from '@/types/label';
import * as XLSX from 'xlsx';
const label:FoodLabel={id:'qa-label',version:1,productId:'test',country:'US',importerInfo:{name:'Old importer fallback'},status:'compliant'};
test('explicit blank buyer never falls back to an old importer and export is marked draft',()=>{
 const row=formatLabelForExcel(label,emptyBuyer);expect(row.importerCompany).toBe('');expect(row.importerRegNo).toBe('');expect(row.documentNotice).toContain('DRAFT');expect(row.documentNotice).toContain('require verification');
});
test('summary and country XLSX carry entered phone, email and PO with verification notice',()=>{
 const buyer={...emptyBuyer,companyName:'QA ONLY',phone:'QA ONLY phone',email:'qa@example.invalid',poNumber:'QA ONLY PO'};const wb=generateMultiCountryExcelWorkbook([label],buyer);
 for(const key of ['Master_Catalog_Summary','US_FDA_Spec']){const rows=XLSX.utils.sheet_to_json(wb.Sheets[key]);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({importerCompany:buyer.companyName,importerPhone:buyer.phone,importerEmail:buyer.email,purchaseOrder:buyer.poNumber,documentNotice:expect.stringContaining('DRAFT')});}
});
