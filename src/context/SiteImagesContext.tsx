'use client';
import {createContext,useContext,type ReactNode} from 'react';
import {emptySiteImages,type SiteImages} from '@/lib/site-images';
const SiteImagesContext=createContext<SiteImages>(emptySiteImages);
export function SiteImagesProvider({images,children}:{images:SiteImages;children:ReactNode}){return <SiteImagesContext.Provider value={images}>{children}</SiteImagesContext.Provider>;}
export function useSiteImages(){return useContext(SiteImagesContext);}
