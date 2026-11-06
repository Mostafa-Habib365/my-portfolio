import { useEffect, useRef, useState } from 'react'

const GITHUB_USER = 'Mostafa-Habib365'
const MAX_PROJECTS = 9
const CACHE_KEY = `github-repos-v3:${GITHUB_USER}` // bump the version when the saved shape changes

const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#663399',
}

// Extra details from the CV, keyed by the exact repo name (Pages links are case-sensitive). Repos not listed here still show with their GitHub info.
const projectDetails = {
  'Bus-Booking-Project': {
    name: 'Bus-Booking Web Application',
    description: 'Developed the backend architecture for a dynamic booking system using the Flask web framework.',
    tags: ['Python', 'Flask'],
    language: 'HTML',
  },
  'E-commerce-website': {
    name: 'E-Commerce Website',
    description: 'Designed and implemented the main landing page, focusing on user experience, responsive layout and visual hierarchy.',
    tags: ['Web Design', 'UI/UX'],
    pages: true,
  },
  'Ecommerce-tech-frontpage-design': {
    name: 'E-Commerce Tech',
    description: 'Created the main page design for a specialized electronics e-commerce platform.',
    tags: ['Web Design'],
    language: 'HTML',
    pages: true,
  },
}

// Shown when GitHub can't be reached (e.g. its 60-requests-an-hour limit), so the grid is never empty
const fallbackProjects = Object.entries(projectDetails).map(([slug, details]) => ({
  id: slug,
  ...details,
  url: `https://github.com/${GITHUB_USER}/${slug}`,
  demo: details.pages ? `https://${GITHUB_USER.toLowerCase()}.github.io/${slug}/` : null,
}))

// "task-management-app" -> "Task Management App"
const prettyName = (name) => name.replace(/[-_]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())

// Live link: the repo's "Website" field if set, otherwise its GitHub Pages site if Pages is turned on
function demoLink(repo) {
  if (repo.homepage) return repo.homepage.startsWith('http') ? repo.homepage : `https://${repo.homepage}`
  if (repo.has_pages) return `https://${GITHUB_USER.toLowerCase()}.github.io/${repo.name}/`
  return null
}

async function loadRepos(signal) {
  // Cached per browser tab: GitHub allows only 60 requests an hour per visitor without a login
  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) return JSON.parse(cached)

  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`, { signal })
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
  const repos = (await res.json())
    .filter((r) => !r.fork && r.name.toLowerCase() !== GITHUB_USER.toLowerCase()) // skip forks and the profile README repo
    .slice(0, MAX_PROJECTS)
    .map((r) => ({
      id: r.id,
      name: prettyName(r.name),
      description: r.description,
      ...projectDetails[r.name], // CV details win over GitHub's
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
      demo: demoLink(r),
    }))
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(repos))
  return repos
}

export default function Projects() {
  const [repos, setRepos] = useState(null)
  const gridRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    loadRepos(controller.signal)
      .then(setRepos)
      .catch((e) => e.name !== 'AbortError' && setRepos(fallbackProjects))
    return () => controller.abort()
  }, [])

  // Reveal each card as it scrolls into view
  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll('.project-card')
    if (!cards?.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('visible')
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.15 },
    )
    cards.forEach((card) => io.observe(card))
    return () => io.disconnect()
  }, [repos])

  // Light that follows the cursor across the card
  const onPointerMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
  }

  return (
    <section id="projects" className="projects">
      <h2 data-avoid>Projects</h2>

      <div className="project-grid" ref={gridRef} aria-busy={!repos}>
        {!repos && Array.from({ length: 6 }, (_, i) => <div key={i} className="project-card skeleton" />)}

        {repos?.map((repo, i) => (
          <article key={repo.id} className="project-card" data-avoid style={{ '--i': i % 3 }} onPointerMove={onPointerMove}>
            <h3>{repo.name}</h3>
            {/* Empty when the repo has no description, but still fills space so the links line up */}
            <p>{repo.description}</p>
            {repo.tags && (
              <ul className="project-tags">
                {repo.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            )}
            <div className="project-meta">
              {repo.language && (
                <span>
                  <span className="lang-dot" style={{ background: languageColors[repo.language] ?? 'var(--accent)' }} />
                  {repo.language}
                </span>
              )}
              {repo.stars > 0 && <span>★ {repo.stars}</span>}
            </div>
            <div className="project-links">
              <a href={repo.url} target="_blank" rel="noreferrer">Code</a>
              {repo.demo && <a href={repo.demo} target="_blank" rel="noreferrer">Live demo</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
