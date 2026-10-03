'use client';
import Link from 'next/link';
export default function CatalogueError({reset}:{reset:()=>void}) {return <main className="mx-auto max-w-3xl px-5 py-14"><h1 className="text-2xl font-bold">상품 정보를 불러오지 못했습니다.</h1><p role="alert" className="mt-4 text-stone-600">연결을 확인한 뒤 다시 시도해 주세요. / Please try again.</p><div className="mt-6 flex gap-4"><button onClick={reset} className="rounded bg-green-900 px-5 py-3 text-white">다시 시도</button><Link href="/wholesale" className="rounded border px-5 py-3">구매 문의</Link></div></main>;}
