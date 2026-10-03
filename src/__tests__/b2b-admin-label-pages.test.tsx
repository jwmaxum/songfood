import { notFound } from 'next/navigation';
import StudioPage from '@/app/admin/labels/[productId]/page';
import SpecPage from '@/app/admin/labels/[productId]/spec/page';
import { staffPageAccess } from '@/lib/staff-page';
import { getProductById } from '@/lib/products-db';
import { getFoodLabelsByProductId } from '@/lib/labels-db';
import type { ProductItem } from '@/lib/types';

jest.mock('next/navigation', () => ({ notFound: jest.fn(() => { throw new Error('NOT_FOUND'); }) }));
jest.mock('@/lib/staff-page', () => ({ staffPageAccess: jest.fn() }));
jest.mock('@/lib/products-db', () => ({ getProductById: jest.fn() }));
jest.mock('@/lib/labels-db', () => ({ getFoodLabelsByProductId: jest.fn() }));
jest.mock('@/components/admin/labels/LabelStudioClient', () => ({ __esModule: true, default: () => null }));
jest.mock('@/app/admin/labels/[productId]/spec/SpecSheetClient', () => ({ __esModule: true, default: () => null }));

const access = jest.mocked(staffPageAccess);
const productRead = jest.mocked(getProductById);
const labelRead = jest.mocked(getFoodLabelsByProductId);
const product = { id: 'test-product', name: '테스트 상품', name_en: 'Test product', category: 'dumplings' } as ProductItem;

beforeEach(() => {
  jest.clearAllMocks();
  access.mockResolvedValue({ staff: null, allowed: false });
  productRead.mockResolvedValue(product);
  labelRead.mockResolvedValue([]);
});

describe.each([
  ['label studio', StudioPage, '/admin/labels/[productId]'],
  ['spec sheet', SpecPage, '/admin/labels/[productId]/spec'],
] as const)('%s request-time data access', (_name, Page, path) => {
  test('does not read product or label data without staff access', async () => {
    await Page({ params: Promise.resolve({ productId: product.id }) });
    expect(access).toHaveBeenCalledWith(path);
    expect(productRead).not.toHaveBeenCalled();
    expect(labelRead).not.toHaveBeenCalled();
  });

  test('loads the requested product and labels after staff access is granted', async () => {
    access.mockResolvedValue({ staff: null, allowed: true });
    await Page({ params: Promise.resolve({ productId: product.id }) });
    expect(productRead).toHaveBeenCalledWith(product.id);
    expect(labelRead).toHaveBeenCalledWith(product.id);
    expect(access.mock.invocationCallOrder[0]).toBeLessThan(productRead.mock.invocationCallOrder[0]);
    expect(productRead.mock.invocationCallOrder[0]).toBeLessThan(labelRead.mock.invocationCallOrder[0]);
  });

  test('returns not found without loading labels for a missing product', async () => {
    access.mockResolvedValue({ staff: null, allowed: true });
    productRead.mockResolvedValue(null);
    await expect(Page({ params: Promise.resolve({ productId: 'missing' }) })).rejects.toThrow('NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(labelRead).not.toHaveBeenCalled();
  });
});
