/** @jest-environment jsdom */
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import BuyerToFillForm,{emptyBuyer} from '@/components/labels/spec-sheet/BuyerToFillForm';
test('actual document starts with empty buyer fields and has no synthetic preset',()=>{
 expect(Object.values(emptyBuyer).every(v=>v==='')).toBe(true);const change=jest.fn();render(<BuyerToFillForm targetCountry="US" data={emptyBuyer} onChange={change}/>);
 expect(screen.queryByText(/자동 입력/)).not.toBeInTheDocument();expect(screen.getAllByRole('textbox')).toHaveLength(9);expect(screen.getByLabelText('전화번호 (Phone)')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('발주 번호 (PO Number, 해당 시)'),{target:{value:'Operator actual PO'}});expect(change).toHaveBeenCalledWith('poNumber','Operator actual PO');
});
