import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
// Frontend-only branch: always use simulated data, regardless of local .env.
export default defineConfig({plugins:[react()],base:'/',define:{'import.meta.env.VITE_API_URL':JSON.stringify(''),'import.meta.env.VITE_DESIGN_PREVIEW':JSON.stringify('true')}})
