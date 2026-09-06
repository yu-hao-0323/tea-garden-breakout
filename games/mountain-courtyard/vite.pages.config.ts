import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:'static-client',base:'/tea-garden-breakout/courtyard/',publicDir:'../public',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},define:{'import.meta.env.VITE_GAME_API_URL':JSON.stringify('https://mountain-courtyard.maureamarae2-9525.chatgpt.site')},build:{outDir:'../pages-dist',emptyOutDir:true}});
