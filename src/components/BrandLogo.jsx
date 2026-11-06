// Logo akademi (file: public/logo.png). Untuk mengganti logo, timpa file itu dengan gambar baru.
export const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`

export default function BrandLogo({ className = 'logo-img', ...props }) {
  return <img className={className} src={LOGO_URL} alt="Logo B.N.R Academy" draggable={false} {...props} />
}
