import {ApiError} from '../request-security';
import {MAX_MULTIPART_BYTES} from './validation';
/** Bound the actual incoming stream before the multipart parser allocates files. */
export async function readUploadFile(request: Request): Promise<File> {
  const contentType = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data\s*;/i.test(contentType) || !/boundary=/i.test(contentType)) throw new ApiError(415, '파일 업로드 형식으로 요청해 주세요.');
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_MULTIPART_BYTES)) throw new ApiError(413, '업로드 요청이 너무 큽니다.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, '업로드할 파일이 없습니다.');
  let size = 0, exceeded = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) { controller.close(); return; }
        size += next.value.byteLength;
        if (size > MAX_MULTIPART_BYTES) { exceeded = true; await reader.cancel(); controller.error(new Error('Upload limit')); return; }
        controller.enqueue(next.value);
      } catch (error) { controller.error(error); }
    },
    async cancel(reason) { await reader.cancel(reason); },
  });
  try {
    const data = await new Response(stream,{headers:{'Content-Type':contentType}}).formData();
    if ([...data.keys()].some(key => key !== 'file') || data.getAll('file').length !== 1) throw new ApiError(400, '파일을 한 개씩 선택해 주세요.');
    const file = data.get('file');
    if (!(file instanceof File)) throw new ApiError(400, '업로드할 파일을 선택해 주세요.');
    return file;
  } catch (error) {
    if (exceeded) throw new ApiError(413, '업로드 요청이 너무 큽니다.');
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, '파일 요청을 읽지 못했습니다. 다시 선택해 주세요.');
  } finally { reader.releaseLock(); }
}
