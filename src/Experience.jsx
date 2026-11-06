import { useRef, useState } from 'react'
import udacityCertificate from './assets/udacity-challenger-certificate.png'

// From the CV, newest first. Each company can hold several roles.
const experience = [
  {
    company: 'Centro CDX',
    location: 'Cairo, Egypt',
    roles: [
      {
        title: 'Quality Control Specialist',
        period: 'April 2026 – Present',
        points: [
          'Ensure high-quality standards and maintain strict operational compliance within the team.',
          'Evaluate processes and report on quality metrics to improve overall efficiency.',
        ],
      },
      {
        title: 'SRX Agent',
        period: 'September 2025 – March 2026',
        points: [
          'Managed daily operational tasks and resolved technical issues effectively.',
          'Collaborated with team members to deliver consistent operational support and client satisfaction.',
        ],
      },
    ],
  },
  {
    company: 'UI Group - IT',
    location: 'Cairo, Egypt',
    roles: [
      {
        title: 'IT Junior',
        period: 'March 2017 – October 2024',
        points: [
          'Managed daily IT operations and resolved technical issues effectively over a 7-year tenure.',
          'Collaborated with team members to deliver consistent operational support and client satisfaction.',
        ],
      },
    ],
  },
]

// Add url: 'https://...' to link a certificate; image adds a "Show certificate" button that opens a view-only viewer
const certifications = [
  {
    name: 'Challenger Degree — Web Design',
    issuer: 'Udacity',
    date: 'December 2021',
    url: null,
    image: udacityCertificate,
    imageAlt: 'Udacity and Egypt FWD certificate of completion for the Web Development Challenger Track, awarded to Mostafa Habib, December 2021',
  },
]

export default function Experience() {
  const [openCert, setOpenCert] = useState(null)
  const dialogRef = useRef(null)

  const showCert = (cert) => {
    setOpenCert(cert)
    dialogRef.current.showModal() // native modal: Esc closes it and focus stays inside
  }

  return (
    <section id="experience" className="experience">
      <h2 data-avoid>Experience &amp; Certifications</h2>

      <div className="experience-grid">
        <div className="info-card" data-avoid>
          <h3>Experience</h3>
          <div className="experience-list">
            {experience.map((job) => (
              <div key={job.company} className="company-block">
                <div className="row">
                  <h4>{job.company}</h4>
                  <span className="company">{job.location}</span>
                </div>
                <ol className="timeline">
                  {job.roles.map((role) => (
                    <li key={role.title + role.period}>
                      <div className="row">
                        <span className="role">{role.title}</span>
                        <span className="period">{role.period}</span>
                      </div>
                      <ul className="job-points">
                        {role.points.map((point) => <li key={point}>{point}</li>)}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card" data-avoid>
          <h3>Certifications</h3>
          <ul className="cert-list">
            {certifications.map((cert, i) => (
              <li key={i}>
                <div className="row">
                  <div>
                    <h4>{cert.url ? <a href={cert.url} target="_blank" rel="noreferrer">{cert.name}</a> : cert.name}</h4>
                    <span className="company">{cert.issuer}</span>
                    {cert.image && (
                      <button type="button" className="show-cert" onClick={() => showCert(cert)}>
                        Show certificate
                      </button>
                    )}
                  </div>
                  {cert.date && <span className="period">{cert.date}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* View-only certificate viewer. Clicking the dark backdrop closes it. */}
      <dialog
        ref={dialogRef}
        className="cert-viewer"
        aria-label={openCert ? `${openCert.name} certificate` : 'Certificate'}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        onClose={() => setOpenCert(null)}
      >
        {openCert && (
          <>
            <div className="cert-viewer-bar">
              <span>{openCert.name} · {openCert.issuer}</span>
              <button type="button" onClick={() => dialogRef.current.close()} aria-label="Close certificate">✕</button>
            </div>
            {/* shortcut: blocks right-click "Save image" and drag-to-desktop only; screenshots and dev tools still work */}
            <img
              src={openCert.image}
              alt={openCert.imageAlt}
              width="1436"
              height="936"
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
            />
          </>
        )}
      </dialog>
    </section>
  )
}
