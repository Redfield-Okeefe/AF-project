import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
// Local design preview stays at /; GitHub Pages gets a separate subdirectory.
const pages=process.env.GITHUB_PAGES==='true'
export default defineConfig({
 plugins:[react()],
 base:pages?'/AF-project/frontend-design/':'/',
 define:{'import.meta.env.VITE_API_URL':JSON.stringify(''),'import.meta.env.VITE_DESIGN_PREVIEW':JSON.stringify('true'),'import.meta.env.VITE_DESIGN_HASH_ROUTER':JSON.stringify(pages?'true':'false')}
})
