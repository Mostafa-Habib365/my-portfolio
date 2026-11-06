import './App.css'
import { lazy, Suspense, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import Projects from './Projects.jsx'
import Experience from './Experience.jsx'

// Loaded separately so the page text appears before the 3D library finishes downloading
const SpaceScene = lazy(() => import('./SpaceScene.jsx'))

function App() {
  useActiveSection()
  useScrolledHeader()

  return (
    <>
      {/* Fixed backdrop behind the whole site: light, star and floating objects */}
      <Suspense fallback={null}>
        <SpaceScene />
      </Suspense>
      <header className="site-header">
        <nav>
          <a href="#" className="logo">Mostafa Habib</a>
          <ul>
            <li><a href="#about">About</a></li>
            <li><a href="#experience">Experience</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <ThemeToggle />
        </nav>
      </header>
      <main>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Contact />
      </main>
    </>
  )
}

// Marks the section crossing the middle of the screen as active; CSS fades the others out
function useActiveSection() {
  useEffect(() => {
    const sections = document.querySelectorAll('main > section')
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          sections.forEach((s) => s.classList.toggle('is-active', s === entry.target))
          // Highlight the nav link for the section on screen
          document.querySelectorAll('.site-header ul a').forEach((a) => {
            const isCurrent = a.getAttribute('href') === `#${entry.target.id}`
            a.classList.toggle('active', isCurrent)
            if (isCurrent) a.setAttribute('aria-current', 'location')
            else a.removeAttribute('aria-current')
          })
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }, // a thin line across the middle of the screen
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  const next = theme === 'dark' ? 'light' : 'dark'

  const applyTheme = () => {
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    flushSync(() => setTheme(next)) // update the icon now, so it's part of the new snapshot
  }

  // The new theme spreads in a circle from the button. Instant where unsupported or motion is reduced.
  const toggle = (e) => {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return applyTheme()

    const button = e.currentTarget.getBoundingClientRect()
    const x = button.left + button.width / 2
    const y = button.top + button.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) // reach the farthest corner

    document.startViewTransition(applyTheme).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? (
        // Sun: shown in dark mode, switches to light
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon: shown in light mode, switches to dark
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      )}
    </button>
  )
}

// Gives the nav bar a solid background once the page is scrolled
function useScrolledHeader() {
  useEffect(() => {
    const header = document.querySelector('.site-header')
    const update = () => header.classList.toggle('scrolled', window.scrollY > 8)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
}

function Hero() {
  return (
    <section className="hero is-active">
      <div className="hero-content" data-avoid>
        <h1>Mostafa Habib</h1>
        <p className="hero-title">Web Developer &amp; Cyber Security Undergraduate</p>
        <p>Building secure, resilient digital solutions.</p>
        <a href="#contact" className="hero-cta">Get in touch</a>
      </div>
    </section>
  )
}

function About() {
  const skills = ['Python Programming', 'Web Development', 'Unity Engine', 'Music/Sound Production', 'Quality Control', 'IT Operations']
  const education = [
    { degree: 'B.Sc. Cyber Security', school: 'University of East London (EUE)', when: 'Expected graduation 2027–2028' },
    { degree: 'International Foundation Program', school: 'University of London (EUE)', when: 'Oct 2023 – Jun 2024' },
  ]
  const languages = [
    ['Arabic', 'Native'],
    ['English', 'Advanced'],
  ]

  return (
    <section id="about" className="about">
      <h2 data-avoid>About Me</h2>
      <p data-avoid>
        Detail-oriented Web Developer and Cyber Security undergraduate at the
        University of East London (EUE). Passionate about combining secure software
        development practices with robust network defense to build resilient digital
        solutions. Brings over 8 years of professional experience in operations, IT
        and quality control.
      </p>
      <ul className="skills" data-avoid>
        {skills.map((skill) => <li key={skill}>{skill}</li>)}
      </ul>
      <div className="about-facts">
        <div className="info-card" data-avoid>
          <h3>Education</h3>
          {education.map((e) => (
            <div key={e.degree} className="fact">
              <strong>{e.degree}</strong>
              <span>{e.school}</span>
              <span className="period">{e.when}</span>
            </div>
          ))}
        </div>
        <div className="info-card" data-avoid>
          <h3>Languages</h3>
          {languages.map(([lang, level]) => (
            <div key={lang} className="fact fact-row">
              <strong>{lang}</strong>
              <span>{level}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const details = [
    { label: 'Email', value: 'mostafahabib4811@outlook.com', href: 'mailto:mostafahabib4811@outlook.com' },
    { label: 'Phone', value: '+20 102 115 5496', href: 'tel:+201021155496' },
    { label: 'Location', value: 'Fifth Settlement, New Cairo, Egypt' },
    { label: 'GitHub', value: 'Mostafa-Habib365', href: 'https://github.com/Mostafa-Habib365' },
  ]

  return (
    <section id="contact" className="contact">
      <h2 data-avoid>Get in Touch</h2>
      <p data-avoid>Open to web development and cyber security opportunities. Feel free to reach out.</p>
      <ul className="contact-grid">
        {details.map((d) => (
          <li key={d.label} className="info-card contact-card" data-avoid>
            <span className="period">{d.label}</span>
            {d.href ? (
              <a href={d.href} target={d.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{d.value}</a>
            ) : (
              <span>{d.value}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default App
