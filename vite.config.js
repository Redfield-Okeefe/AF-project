import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig(({command,mode}) => ({
 plugins:[react()],
 base:process.env.GITHUB_PAGES==='true'?'/AF-project/':'/',
 ...(mode==='design-preview'?{define:{'import.meta.env.VITE_API_URL':JSON.stringify(''),'import.meta.env.VITE_DESIGN_PREVIEW':JSON.stringify('true')}}:{}),
 ...(command==='serve'&&mode==='local-api'?{define:{'import.meta.env.VITE_API_URL':JSON.stringify('http://127.0.0.1:3001')}}:{}),
}))
