import {PDFDocument, PDFString, rgb, type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {brandLabel, categoryLabel, collectionLabel} from '../catalogue-taxonomy';
import {MAX_CATALOGUE_PRODUCTS, type CatalogueImage, type CatalogueSnapshot} from './types';

/** Pure browser-compatible renderer. No prices, draft sources, stock or payment data enter this model. */
export async function renderCataloguePdf(snapshot: CatalogueSnapshot, fontBytes: Uint8Array, images = new Map<string, CatalogueImage>()) {
  if (snapshot.version !== 1 || !['ko', 'en'].includes(snapshot.language) || !snapshot.products.length || snapshot.products.length > MAX_CATALOGUE_PRODUCTS) {
    throw new Error('카탈로그 자료를 다시 불러와 주세요.');
  }
  const pdf = await PDFDocument.create({updateMetadata: false});
  pdf.registerFontkit(fontkit);
  // The bundled CJK font has known missing glyphs when subset. Keep full embedding as in PI PDFs.
  const font = await pdf.embedFont(fontBytes, {subset: false});
  const supported = new Set(font.getCharacterSet());
  const en = snapshot.language === 'en';
  const ink = rgb(.12, .18, .15), muted = rgb(.39, .44, .41), green = rgb(.13, .35, .25);
  const pale = rgb(.95, .97, .95), border = rgb(.81, .86, .82);
  const width = 595.28, height = 841.89, left = 36, gap = 14, cardWidth = (width - 2 * left - gap) / 2, cardHeight = 303;
  let page!: PDFPage;
  let replacedGlyph = false;
  function clean(value: string) {
    return Array.from(String(value || '').normalize('NFC').replaceAll('\u2103', '\u00b0C').replaceAll('\u2109', '\u00b0F').replace(/[\u0000-\u001f\u007f]/g, ' '))
      .map(char => { if (supported.has(char.codePointAt(0)!)) return char; replacedGlyph = true; return '?'; }).join('');
  }
  function lines(value: string, max: number, size: number, count: number) {
    const text = clean(value), result: string[] = [];
    // Keep Latin words and quantities together. CJK and overlong tokens still wrap by glyph.
    const tokens = text.match(/[A-Za-z0-9]+(?:[.'%/+\-][A-Za-z0-9]+)*|\s+|[^\s]/gu) || [];
    let row = '', overflow = false;
    function nextRow() { result.push(row.trimEnd()); row = ''; return result.length < count; }
    outer: for (const token of tokens) {
      if (!row && !token.trim()) continue;
      if (font.widthOfTextAtSize(row + token, size) <= max) { row += token; continue; }
      if (font.widthOfTextAtSize(token.trimStart(), size) <= max) {
        if (row && !nextRow()) { overflow = true; break; }
        row = token.trimStart();
      } else for (const char of token) {
        if (font.widthOfTextAtSize(row + char, size) > max && row) {
          if (!nextRow()) { overflow = true; break outer; }
        }
        if (row || char.trim()) row += char;
      }
    }
    if (row && result.length < count) result.push(row.trimEnd());
    if (overflow) {
      let last = result[count - 1] || '';
      while (last && font.widthOfTextAtSize(last + '...', size) > max) last = last.slice(0, -1);
      result[count - 1] = last + '...';
    }
    return result.length ? result : [''];
  }
  function text(value: string, x: number, y: number, size = 9, color = ink) {
    page.drawText(clean(value), {x, y, size, font, color});
  }
  function block(value: string, x: number, y: number, max: number, size: number, count: number, color = ink) {
    const rows = lines(value, max, size, count);
    rows.forEach((row, index) => text(row, x, y - index * (size + 3), size, color));
    return rows.length * (size + 3);
  }
  const date = new Date(snapshot.generated_at);
  if (!Number.isFinite(date.getTime())) throw new Error('카탈로그 생성일을 확인해 주세요.');
  const dateLabel = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'}).format(date);
  const title = en ? 'PRODUCT CATALOGUE' : '상품 카탈로그';
  const missing = en ? 'To be confirmed' : '확인 필요';
  pdf.setTitle((snapshot.seller.name || 'SONGFOOD') + ' - ' + title);
  pdf.setAuthor(snapshot.seller.name || 'SONGFOOD');
  pdf.setCreator('SONGFOOD'); pdf.setProducer('SONGFOOD catalogue renderer v1');
  pdf.setCreationDate(date); pdf.setModificationDate(date);
  const embedded = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>> | null>();
  for (const [url, image] of images) {
    try { embedded.set(url, image.kind === 'png' ? await pdf.embedPng(image.bytes) : await pdf.embedJpg(image.bytes)); }
    catch { embedded.set(url, null); }
  }
  const pages = Math.ceil(snapshot.products.length / 4);
  for (let start = 0; start < snapshot.products.length; start += 4) {
    page = pdf.addPage([width, height]);
    page.drawRectangle({x: 0, y: height - 9, width, height: 9, color: green});
    block(snapshot.seller.name || 'SONGFOOD', left, 803, width - 2 * left, 11, 1, green);
    text(title, left, 773, 24, green);
    text(dateLabel + ' KST  |  ' + snapshot.products.length + (en ? ' products' : '개 상품'), left, 751, 9, muted);
    text(en ? 'Registered product information. Missing details require confirmation.' : '등록 상품정보 기준입니다. 누락 정보는 담당자 확인이 필요합니다.', left, 734, 8, muted);
    text(en ? 'Prices and sales approval excluded. This is not a quotation or Proforma Invoice.' : '가격·판매 승인은 포함하지 않습니다. 견적서 또는 Proforma Invoice가 아닙니다.', left, 721, 8, muted);
    for (let index = start; index < Math.min(start + 4, snapshot.products.length); index++) {
      const p = snapshot.products[index], slot = index - start;
      const x = left + (slot % 2) * (cardWidth + gap), top = 700 - Math.floor(slot / 2) * (cardHeight + gap), bottom = top - cardHeight;
      page.drawRectangle({x, y: bottom, width: cardWidth, height: cardHeight, color: rgb(1, 1, 1), borderColor: border, borderWidth: .7});
      page.drawRectangle({x: x + 12, y: top - 100, width: 86, height: 86, color: pale});
      const image = embedded.get(p.image_url);
      if (image) {
        const scale = Math.min(82 / image.width, 82 / image.height);
        const w = image.width * scale, h = image.height * scale;
        page.drawImage(image, {x: x + 14 + (82 - w) / 2, y: top - 98 + (82 - h) / 2, width: w, height: h});
      } else block(en ? 'Image pending' : '이미지 확인 필요', x + 18, top - 56, 74, 8, 2, muted);
      const name = (en ? p.name_en || p.name : p.name || p.name_en) || missing;
      let nameY = top - 25;
      nameY -= block((index + 1) + '. ' + name, x + 110, nameY, cardWidth - 122, 11, 3);
      const other = en ? p.name : p.name_en;
      if (other && other !== name) nameY -= block(other, x + 110, nameY - 2, cardWidth - 122, 8, 2, muted) + 2;
      block('SKU: ' + (p.sku || missing), x + 110, Math.min(nameY - 4, top - 77), cardWidth - 122, 7, 2, muted);
      let y = top - 119;
      const specs: [string, string, number][] = [
        [en ? 'Category' : '분류', [p.collection && collectionLabel(p.collection, snapshot.language), p.category && categoryLabel(p.category, snapshot.language)].filter(Boolean).join(' / ') || (en ? 'Unclassified' : '미분류'), 2],
        [en ? 'Brand' : '브랜드', p.brand ? brandLabel(p.brand, snapshot.language) : missing, 1],
        [en ? 'Size / pack' : '규격 / 포장', [p.net_weight, p.package_size || p.format].filter(Boolean).join(' / ') || missing, 2],
        [en ? 'Maker / origin' : '제조 / 원산지', [p.manufacturer, p.country_of_origin || p.origin].filter(Boolean).join(' / ') || missing, 2],
        [en ? 'Storage' : '보관', p.storage || missing, 2],
        [en ? 'Shelf life' : '소비기한', p.shelf_life || missing, 2],
      ];
      for (const [label, value, maxLines] of specs) {
        y -= block(label + ': ' + value, x + 12, y, cardWidth - 24, 8, maxLines) + 4;
      }
      const linkLabel = en ? 'View product details online' : '온라인 상품 상세 보기';
      text(linkLabel, x + 12, bottom + 14, 8, green);
      const base = new URL(snapshot.site_origin);
      if (['https:', 'http:'].includes(base.protocol)) {
        const href = new URL('/products/' + encodeURIComponent(p.id), base.origin);
        href.searchParams.set('lang', snapshot.language);
        page.node.addAnnot(pdf.context.register(pdf.context.obj({Type: 'Annot', Subtype: 'Link', Rect: [x + 10, bottom + 10, x + cardWidth - 10, bottom + 27], Border: [0, 0, 0], A: {Type: 'Action', S: 'URI', URI: PDFString.of(href.toString())}})));
      }
    }
    page.drawLine({start: {x: left, y: 61}, end: {x: width - left, y: 61}, color: border, thickness: .5});
    const contact = [snapshot.seller.email, en ? snapshot.seller.export_phone || snapshot.seller.phone : snapshot.seller.phone || snapshot.seller.export_phone].filter(Boolean).join(' | ');
    block(contact, left, 46, width - 2 * left - 65, 8, 1, muted);
    text((start / 4 + 1) + ' / ' + pages, width - left - 38, 46, 8, muted);
  }
  if (replacedGlyph) for (const p of pdf.getPages()) { page = p; text(en ? 'Unsupported font characters are shown as ?.' : '글꼴 미지원 문자는 ?로 표시했습니다.', left, 29, 7, muted); }
  return pdf.save({useObjectStreams: true});
}
