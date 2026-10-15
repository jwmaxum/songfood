/** @jest-environment jsdom */
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { prepareImageUpload } from '@/lib/image-upload-client';
jest.mock('@/lib/image-upload-client', () => ({ ...jest.requireActual('@/lib/image-upload-client'), prepareImageUpload: jest.fn() }));
const prepare = prepareImageUpload as jest.MockedFunction<typeof prepareImageUpload>;
const normalized = new File(['jpeg'], 'normalized.jpg', { type: 'image/jpeg' });
let change: jest.Mock, busy: jest.Mock, fetcher: jest.Mock, status: number;
const response = (body: unknown, code = 200) => ({ ok: code < 400, status: code, json: async () => body });
function Host() { const [url, setUrl] = useState('/old-photo.png'); return <ImageUploadField label="대표 사진" value={url} onChange={next => { change(next); setUrl(next); }} onBusyChange={busy} />; }
beforeEach(() => {
 change = jest.fn(); busy = jest.fn(); status = 200; prepare.mockReset().mockResolvedValue({ file: normalized, width: 1000, height: 800 });
 Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: jest.fn(() => 'blob:local-preview') });
 Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
 fetcher = jest.fn(async (input: string) => input.startsWith('/api/media') ? response({ success: true, data: [
  { id: 'image', name: '등록된 사진', type: 'image', url: '/library-photo.png' },
  { id: 'video', name: '제외 동영상', type: 'video', url: '/movie.mp4' },
  { id: 'svg', name: '제외 SVG', type: 'image', url: '/vector.svg' },
  { id: 'unsafe', name: '제외 주소', type: 'image', url: 'javascript:alert(1)' },
 ] }) : response(status === 200 ? { success: true, data: { id: 'saved-image', type: 'image', url: '/stored-photo.jpg' } } : { error: '업로드 오류' }, status));
 global.fetch = fetcher;
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });
const pick = () => fireEvent.change(screen.getByLabelText('대표 사진 파일 선택'), { target: { files: [new File(['png'], 'original.png', { type: 'image/png' })] } });
test('upload normalizes the file and changes the controlled URL only after Storage and media DB success', async () => {
 render(<Host />); pick(); await screen.findByText(/업로드 완료/);
 expect(prepare).toHaveBeenCalledWith(expect.any(File), { preserveTransparency: true });
 const options = fetcher.mock.calls[0][1]; expect(options).toMatchObject({ method: 'POST', credentials: 'same-origin' }); expect(options.body.get('file')).toBe(normalized);
 expect(change).toHaveBeenCalledWith('/stored-photo.jpg'); expect(screen.getByRole('img', { name: '대표 사진 현재 선택 이미지' })).toHaveAttribute('src', '/stored-photo.jpg');
 expect(busy.mock.calls).toEqual([[true], [false]]); await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
 expect(screen.getByLabelText('대표 사진 현재 이미지 주소')).toHaveAttribute('readonly');
});
test('preparing and uploading keep the old URL and prevent replacement actions until completion', async () => {
 let complete!: (value: { file: File; width: number; height: number }) => void;
 prepare.mockReturnValueOnce(new Promise(resolve => { complete = resolve; })); render(<Host />); pick();
 expect(screen.getByRole('img', { name: '대표 사진 현재 선택 이미지' })).toHaveAttribute('src', '/old-photo.png');
 expect(screen.getByRole('img', { name: '대표 사진 선택한 파일 미리보기' })).toBeVisible();
 expect(screen.getByLabelText('대표 사진 파일 선택')).toBeDisabled(); expect(screen.getByRole('button', { name: '대표 사진 제외' })).toBeDisabled(); expect(change).not.toHaveBeenCalled();
 await act(async () => complete({ file: normalized, width: 1000, height: 800 })); await screen.findByText(/업로드 완료/);
});
test('a failed upload preserves the prior URL and supports retry using the same selected file', async () => {
 status = 403; render(<Host />); pick(); expect(await screen.findByRole('alert')).toHaveTextContent('다시 로그인');
 expect(change).not.toHaveBeenCalled(); expect(screen.getByRole('img', { name: '대표 사진 현재 선택 이미지' })).toHaveAttribute('src', '/old-photo.png');
 status = 200; fireEvent.click(screen.getByRole('button', { name: '대표 사진 업로드 다시 시도' })); await screen.findByText(/업로드 완료/);
 expect(change).toHaveBeenCalledTimes(1); expect(fetcher).toHaveBeenCalledTimes(2);
});
test('the media picker only offers safe images and selection does not upload or delete a file', async () => {
 render(<Host />); fireEvent.click(screen.getByRole('button', { name: '대표 사진 기존 이미지 선택' }));
 fireEvent.click(await screen.findByRole('button', { name: '등록된 사진 이미지 선택' }));
 expect(change).toHaveBeenCalledWith('/library-photo.png'); expect(fetcher).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[0][0]).toBe('/api/media?mode=admin&type=image'); expect(screen.queryByRole('region', { name: '대표 사진 기존 이미지 목록' })).not.toBeInTheDocument();
});
test('clearing a reference retains the original media asset and performs no DELETE request', () => {
 render(<Host />); fireEvent.click(screen.getByRole('button', { name: '대표 사진 제외' }));
 expect(change).toHaveBeenCalledWith(''); expect(fetcher).not.toHaveBeenCalled(); expect(screen.getByText(/미디어에 보존/)).toBeInTheDocument();
});
test('unsupported source files are rejected without normalizing or issuing a request', async () => {
 render(<Host />); fireEvent.change(screen.getByLabelText('대표 사진 파일 선택'), { target: { files: [new File(['svg'], 'unsafe.svg', { type: 'image/svg+xml' })] } });
 expect(await screen.findByRole('alert')).toHaveTextContent('SVG'); expect(prepare).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
});
