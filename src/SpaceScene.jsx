import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Muted, modern finishes: mostly neutrals with one soft accent
const finishes = {
  chrome: { color: 0xe8e8ec, metalness: 1, roughness: 0.12 },
  graphite: { color: 0x2b2b30, metalness: 0.7, roughness: 0.3 },
  matte: { color: 0xf0f0f2, metalness: 0, roughness: 0.45 },
  accent: { color: 0xa79fd6, metalness: 0.2, roughness: 0.3 },
}

// [shape, finish, home spot as a fraction of the screen (-1..1), kept clear of the centred text]
const objects = [
  [() => new THREE.TorusKnotGeometry(0.55, 0.18, 128, 16), 'chrome', [-0.72, 0.5]],
  [() => new THREE.IcosahedronGeometry(0.75, 0), 'graphite', [0.7, -0.4]],
  [() => new THREE.TorusGeometry(0.6, 0.16, 20, 64), 'matte', [0.55, 0.62]],
  [() => new THREE.SphereGeometry(0.5, 40, 24), 'chrome', [-0.5, -0.6]],
  [() => new THREE.CapsuleGeometry(0.25, 0.8, 8, 24), 'accent', [0.85, 0.05]],
  [() => new THREE.OctahedronGeometry(0.55, 0), 'matte', [-0.88, -0.1]],
  [() => new THREE.BoxGeometry(0.8, 0.8, 0.8), 'graphite', [-0.4, 0.72]],
  [() => new THREE.ConeGeometry(0.45, 0.9, 40), 'chrome', [0.4, -0.72]],
  [() => new THREE.SphereGeometry(0.28, 32, 16), 'accent', [-0.15, -0.8]],
]

const CAMERA_Z = 13
const FPS = 30 // the objects move slowly, so 30 draws a second still looks smooth
const CURSOR_RADIUS = 2.2
const CURSOR_PUSH = 9
const BOB_HEIGHT = 0.25 // how far each object floats up and down
const RETURN_SPRING = 1.5 // how strongly a pushed object glides back home
const AVOID_PUSH = 14 // how hard content (text, cards) pushes objects out of its way
const OBJECT_RADIUS = 0.75 // rough object size in world units, used as breathing room around content
// Content the objects steer around: only the section currently on screen, plus the nav bar
const AVOID_SELECTOR = '.site-header, .is-active [data-avoid]'

// Background light: soft glow, slowly turning rays and a four-point star, drawn behind the objects.
// Done in a shader so it shares one picture with the 3D scene instead of stacking CSS layers.
const lightVertex = `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); } // covers the whole screen, ignores the camera
`
const lightFragment = `
  uniform vec3 uBg;
  uniform vec3 uAccent;
  uniform vec2 uStar;   // star position in device pixels, from the bottom-left
  uniform float uScale; // device pixels per CSS pixel
  uniform float uTime;

  float ray(float angle, float count, float turn) {
    return pow(0.5 + 0.5 * cos(angle * count + turn), 12.0);
  }

  void main() {
    vec2 p = (gl_FragCoord.xy - uStar) / uScale; // CSS pixels from the star
    float d = length(p);
    float angle = atan(p.y, p.x);

    float glow = 0.08 * exp(-d * d / 180000.0) * (0.85 + 0.15 * sin(uTime * 0.7));
    float rays = 0.05 * (0.6 * ray(angle, 24.0, uTime * 0.03) + 0.4 * ray(angle, 17.0, -uTime * 0.02)) * exp(-d / 420.0);

    float twinkle = 0.8 + 0.2 * sin(uTime * 1.1);
    vec2 a = abs(p);
    vec2 r = abs(mat2(0.7071, -0.7071, 0.7071, 0.7071) * p); // rotated 45deg for the diagonal spikes
    float spikes = exp(-a.y / 1.2) * exp(-a.x / 110.0) + exp(-a.x / 1.2) * exp(-a.y / 110.0)
                 + 0.5 * (exp(-r.y / 1.2) * exp(-r.x / 45.0) + exp(-r.x / 1.2) * exp(-r.y / 45.0));
    float core = exp(-d / 10.0);
    float star = (0.3 * spikes + 0.35 * core) * twinkle;

    float light = clamp(glow + rays + star, 0.0, 1.0);
    vec3 tint = mix(uAccent, vec3(1.0), core * 0.6); // the very centre runs a little whiter
    vec3 color = mix(uBg, tint, light);

    // Tiny per-pixel noise (dithering) hides colour banding in the faint gradients
    float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    gl_FragColor = vec4(color + (noise - 0.5) / 255.0, 1.0);
  }
`

export default function SpaceScene() {
  const canvasRef = useRef(null)
  // Bumped when the browser drops the 3D context (e.g. window moved to a screen on another graphics card),
  // which gives a fresh canvas and rebuilds the scene
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const onContextLost = (e) => {
      e.preventDefault()
      setGeneration((g) => g + 1)
    }
    canvas.addEventListener('webglcontextlost', onContextLost)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // preserveDrawingBuffer keeps the last frame so the theme-switch snapshot captures the objects
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.toneMapping = THREE.ACESFilmicToneMapping

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100) // narrow lens so shapes near the edges don't stretch
    camera.position.z = CAMERA_Z
    const light = new THREE.DirectionalLight(0xffffff, 1.2)
    light.position.set(3, 5, 6)
    scene.add(light)

    const lightUniforms = {
      uBg: { value: new THREE.Vector3() },
      uAccent: { value: new THREE.Vector3() },
      uStar: { value: new THREE.Vector2() },
      uScale: { value: 1 },
      uTime: { value: 0 },
    }
    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: lightVertex, fragmentShader: lightFragment, uniforms: lightUniforms, depthTest: false, depthWrite: false }),
    )
    background.frustumCulled = false
    background.renderOrder = -1 // always drawn first, behind the objects
    scene.add(background)

    // Use the page's own colours, so it matches light and dark mode
    const readColors = () => {
      const css = getComputedStyle(document.documentElement)
      const toVec = (name, target) => {
        const rgb = {}
        new THREE.Color(css.getPropertyValue(name).trim()).getRGB(rgb, THREE.SRGBColorSpace)
        target.set(rgb.r, rgb.g, rgb.b)
      }
      toVec('--bg', lightUniforms.uBg.value)
      toVec('--accent', lightUniforms.uAccent.value)
    }
    readColors()
    const onThemeChange = () => {
      readColors()
      renderer.render(scene, camera) // repaint now, even when the scene is held still
    }
    const themeObserver = new MutationObserver(onThemeChange)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // Put the star where the name sits at the top of the page; the backdrop is fixed, so it stays there while scrolling
    const placeStar = () => {
      const n = document.querySelector('.hero h1')?.getBoundingClientRect()
      const x = n ? n.left + n.width / 2 : canvas.clientWidth / 2
      const y = n ? n.top + window.scrollY + n.height / 2 : canvas.clientHeight / 2
      const scale = renderer.getPixelRatio()
      lightUniforms.uScale.value = scale
      lightUniforms.uStar.value.set(x * scale, (canvas.clientHeight - y) * scale)
    }

    // Half the visible width/height at a given depth, so home spots map to the real screen edges
    const halfView = (z) => {
      const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (CAMERA_Z - z)
      return [h * camera.aspect, h]
    }

    const pixelRatio = () => Math.min(window.devicePixelRatio, 1.5) // sharp enough for soft shapes, far fewer pixels to draw
    const resize = () => {
      renderer.setPixelRatio(pixelRatio())
      const { clientWidth: w, clientHeight: h } = canvas
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      placeStar()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    const meshes = objects.map(([makeGeometry, finish, home]) => {
      const mesh = new THREE.Mesh(makeGeometry(), new THREE.MeshStandardMaterial(finishes[finish]))
      mesh.position.z = -2 + Math.random() * 3
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0)
      mesh.userData = {
        home,
        offset: new THREE.Vector2(), // how far the cursor has pushed it from home
        velocity: new THREE.Vector2(),
        bobSpeed: 0.5 + Math.random() * 0.4,
        bobPhase: Math.random() * Math.PI * 2,
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.4),
      }
      scene.add(mesh)
      return mesh
    })

    // Cursor in -1..1 screen coords; null once it leaves the window
    let pointer = null
    const onPointerMove = (e) => {
      pointer = { x: (e.clientX / canvas.clientWidth) * 2 - 1, y: -((e.clientY / canvas.clientHeight) * 2 - 1) }
    }
    const onPointerLeave = () => (pointer = null)
    // A finger never "leaves" the window, so let go of the push when it lifts or starts scrolling
    const onTouchEnd = (e) => e.pointerType !== 'mouse' && (pointer = null)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onTouchEnd)
    window.addEventListener('pointercancel', onTouchEnd)
    document.documentElement.addEventListener('pointerleave', onPointerLeave)

    const onScreen = new THREE.Vector3()

    const step = (dt, time) => {
      const { clientWidth: W, clientHeight: H } = canvas
      const obstacles = [...document.querySelectorAll(AVOID_SELECTOR)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.bottom > 0 && r.top < H)

      for (const mesh of meshes) {
        const { home, offset, velocity, bobSpeed, bobPhase, spin } = mesh.userData
        const [hw, hh] = halfView(mesh.position.z)
        const homeX = home[0] * hw
        const homeY = home[1] * hh

        // Content in the way pushes the object out toward its nearest edge or corner
        onScreen.copy(mesh.position).project(camera)
        const sx = ((onScreen.x + 1) / 2) * W
        const sy = ((1 - onScreen.y) / 2) * H
        const margin = OBJECT_RADIUS / ((2 * hh) / H) // object radius in screen pixels
        for (const r of obstacles) {
          const halfW = r.width / 2 + margin
          const halfH = r.height / 2 + margin
          const nx = (sx - (r.left + r.width / 2)) / halfW // -1..1 across the padded box
          const ny = (sy - (r.top + r.height / 2)) / halfH
          if (Math.abs(nx) >= 1 || Math.abs(ny) >= 1) continue
          const len = Math.hypot(nx, ny) || 1
          // Push grows from zero at the box edge to full strength a quarter of the way in. An on/off push
          // made objects bounce in and out of the edge (the "vibrating" look) when they couldn't escape.
          const depth = Math.min(1, (1 - Math.max(Math.abs(nx), Math.abs(ny))) * 4)
          velocity.x += (nx / len) * AVOID_PUSH * depth * dt
          velocity.y -= (ny / len) * AVOID_PUSH * depth * dt // screen y points down, world y points up
          velocity.multiplyScalar(1 - Math.min(1, dt * 4 * depth)) // extra drag while pressed against content, so it settles
        }

        // The cursor nudges objects away, as if pushing them in zero gravity
        if (pointer) {
          const dx = homeX + offset.x - pointer.x * hw
          const dy = homeY + offset.y - pointer.y * hh
          const dist = Math.hypot(dx, dy)
          if (dist < CURSOR_RADIUS && dist > 0.001) {
            const force = ((CURSOR_RADIUS - dist) / CURSOR_RADIUS) * CURSOR_PUSH * dt
            velocity.x += (dx / dist) * force
            velocity.y += (dy / dist) * force
          }
        }

        // Soft spring back home, with damping so it settles instead of wobbling
        velocity.addScaledVector(offset, -RETURN_SPRING * dt)
        velocity.multiplyScalar(1 - Math.min(1, dt * 1.5))
        offset.addScaledVector(velocity, dt)

        // Never get pushed off screen; stop dead at the edge instead of building up speed against it
        const clampedX = THREE.MathUtils.clamp(offset.x, -hw + 0.6 - homeX, hw - 0.6 - homeX)
        const clampedY = THREE.MathUtils.clamp(offset.y, -hh + 0.6 - homeY, hh - 0.6 - homeY)
        if (clampedX !== offset.x) velocity.x = 0
        if (clampedY !== offset.y) velocity.y = 0
        offset.set(clampedX, clampedY)

        const bob = Math.sin(time * bobSpeed + bobPhase) * BOB_HEIGHT
        mesh.position.x = homeX + offset.x
        mesh.position.y = homeY + offset.y + bob
        mesh.rotation.x += spin.x * dt
        mesh.rotation.y += spin.y * dt
        mesh.rotation.z += spin.z * dt
      }
    }

    const clock = new THREE.Clock()
    let frame, timer
    // Wake up only when it's time to draw. Asking for every screen refresh (up to 240Hz) forces the
    // browser to rebuild the whole page frame each time, which was the main cost.
    const loop = () => {
      if (pixelRatio() !== renderer.getPixelRatio()) resize() // moved to a screen with different scaling
      const dt = Math.min(clock.getDelta(), 0.05) // clamp avoids big jumps after a paused tab
      step(dt, clock.elapsedTime)
      lightUniforms.uTime.value = clock.elapsedTime
      renderer.render(scene, camera)
      timer = setTimeout(() => (frame = requestAnimationFrame(loop)), 1000 / FPS)
    }
    if (reduceMotion) {
      step(0, 0) // place objects at their home spots, then hold still
      renderer.render(scene, camera)
    }
    else frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onTouchEnd)
      window.removeEventListener('pointercancel', onTouchEnd)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      background.geometry.dispose()
      background.material.dispose()
      meshes.forEach((m) => {
        m.geometry.dispose()
        m.material.dispose()
      })
      scene.environment.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [generation])

  return <canvas key={generation} ref={canvasRef} className="space-scene" aria-hidden="true" />
}
