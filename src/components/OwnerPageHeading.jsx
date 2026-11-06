import OwnerIcon from './OwnerIcon.jsx'

/** Heading sekunder khusus seluruh halaman Owner; konsisten dan responsif. */
export default function OwnerPageHeading({ icon, title, description, meta, actions }) {
  return <div className="owner-page-heading">
    <div className="owner-page-heading-main">
      <span className="owner-page-heading-icon"><OwnerIcon name={icon} size={22}/></span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </div>
    <div className="owner-page-heading-right">{meta && <span className="owner-page-meta">{meta}</span>}{actions}</div>
  </div>
}
