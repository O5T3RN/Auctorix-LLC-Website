// ==========================================================
// AUCTORIX v2 — 3D interaction layer
// ==========================================================
(function(){
  "use strict";

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================================================================
  // THREE.JS HERO — Wireframe 3D logo mark + particle field
  // ================================================================
  (function initHero(){
    if (typeof THREE === 'undefined') return;

    const canvas  = document.getElementById('heroCanvas');
    const hero    = document.getElementById('hero');
    if (!canvas || !hero) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 0, 8.5);

    function resize(){
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Auctorix mark geometry (two interlocked triangles, extruded) ---
    // Outer triangle + inner cutout, hand-traced from the logo shape
    const SIGNAL = new THREE.Color(0xFF4D2E);
    const WHITE  = new THREE.Color(0xffffff);

    // Build the logo outline as a THREE.Shape with the inner negative
    const shape = new THREE.Shape();
    // Outer triangle (normalised coords, centred)
    shape.moveTo( 0,    1.1);
    shape.lineTo( 1.05,-0.7);
    shape.lineTo( 0.38,-0.7);
    shape.lineTo( 0,   -0.05);
    shape.lineTo(-0.38,-0.7);
    shape.lineTo(-1.05,-0.7);
    shape.closePath();
    // Inner hole (the "A" cutout)
    const hole = new THREE.Path();
    hole.moveTo( 0,    0.38);
    hole.lineTo( 0.45,-0.38);
    hole.lineTo(-0.45,-0.38);
    hole.closePath();
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 3,
    };

    // Solid extruded form (very dark, almost invisible — gives depth shadow)
    const solidGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const solidMat = new THREE.MeshPhongMaterial({
      color: 0x111114,
      specular: new THREE.Color(0xFF4D2E),
      shininess: 60,
      transparent: true,
      opacity: 0.45,
    });
    const solidMesh = new THREE.Mesh(solidGeo, solidMat);
    solidMesh.position.set(0, 0, -0.14);
    scene.add(solidMesh);

    // Wireframe edges on top
    const edgesGeo = new THREE.EdgesGeometry(solidGeo, 8);
    const edgesMat = new THREE.LineBasicMaterial({ color: SIGNAL, linewidth: 1.5, transparent: true, opacity: 0.9 });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    wireframe.position.copy(solidMesh.position);
    scene.add(wireframe);

    // Group for easy rotation
    const logoGroup = new THREE.Group();
    logoGroup.add(solidMesh);
    logoGroup.scale.set(0.72, 0.72, 0.72);
    logoGroup.position.set(0.4, -0.1, -1.5);
    logoGroup.add(wireframe);
    scene.add(logoGroup);

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0x111111, 1);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xff6644, 3.5);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x3a3d42, 1.5);
    rimLight.position.set(-3, -1, 2);
    scene.add(rimLight);

    // --- Particle field ---
    const PARTICLE_COUNT = window.innerWidth < 768 ? 600 : 1400;
    const positions  = new Float32Array(PARTICLE_COUNT * 3);
    const targets    = new Float32Array(PARTICLE_COUNT * 3); // logo edge positions
    const originals  = new Float32Array(PARTICLE_COUNT * 3); // scattered start

    // Sample points along the logo outline edges for particles to converge to
    const outlinePts = [];
    // Outer triangle edges
    const outerVerts = [
      [0, 1.1], [1.05,-0.7], [0.38,-0.7], [0,-0.05], [-0.38,-0.7], [-1.05,-0.7], [0, 1.1]
    ];
    for (let e = 0; e < outerVerts.length - 1; e++){
      const [x0,y0] = outerVerts[e], [x1,y1] = outerVerts[e+1];
      for (let t = 0; t <= 1; t += 0.04){
        outlinePts.push([x0+(x1-x0)*t, y0+(y1-y0)*t, 0]);
      }
    }
    const innerVerts = [[0,0.38],[0.45,-0.38],[-0.45,-0.38],[0,0.38]];
    for (let e = 0; e < innerVerts.length - 1; e++){
      const [x0,y0] = innerVerts[e], [x1,y1] = innerVerts[e+1];
      for (let t = 0; t <= 1; t += 0.06){
        outlinePts.push([x0+(x1-x0)*t, y0+(y1-y0)*t, 0]);
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++){
      const scatter = (Math.random() - 0.5);
      const ox = (Math.random() - 0.5) * 12;
      const oy = (Math.random() - 0.5) * 8;
      const oz = (Math.random() - 0.5) * 6;
      originals[i*3]   = ox;
      originals[i*3+1] = oy;
      originals[i*3+2] = oz;
      positions[i*3]   = ox;
      positions[i*3+1] = oy;
      positions[i*3+2] = oz;
      // target: a point on the logo outline (with slight z scatter)
      const pt = outlinePts[i % outlinePts.length];
      targets[i*3]   = pt[0] * 1.1 + (Math.random()-0.5)*0.06;
      targets[i*3+1] = pt[1] * 1.1 + (Math.random()-0.5)*0.06;
      targets[i*3+2] = (Math.random()-0.5) * 0.2;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: window.innerWidth < 768 ? 0.022 : 0.016,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // --- Animation state ---
    let formProgress  = 0;  // 0→1 particles converging on load
    let dispersed     = false; // after scroll, particles scatter again
    let mouse = { x: 0, y: 0, tx: 0, ty: 0 }; // smoothed mouse for logo tilt
    let scrollRot     = 0;  // additional rotation from scroll
    let animRunning   = true;

    // Mouse tracking (desktop only)
    if (!prefersReduced && window.innerWidth >= 768){
      window.addEventListener('mousemove', e => {
        mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      });
    }

    // Stop rendering canvas once hero scrolls fully out of view
    const canvasEl = canvas;
    function checkHeroVisible(){
      const heroBottom = hero.getBoundingClientRect().bottom;
      if (heroBottom < -100){
        canvasEl.classList.add('is-hidden');
        animRunning = false;
      } else {
        canvasEl.classList.remove('is-hidden');
        animRunning = true;
      }
    }
    window.addEventListener('scroll', () => {
      scrollRot = window.scrollY * 0.0012;
      checkHeroVisible();
    }, { passive: true });

    let clock = 0;
    function animate(){
      requestAnimationFrame(animate);
      if (!animRunning && clock > 3) return;
      clock += 0.016;

      // Particle convergence — ramp in over ~2.5 seconds
      if (!prefersReduced) formProgress = Math.min(1, formProgress + 0.008);

      // Smooth mouse
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      // Logo group rotation — idle drift + mouse parallax + scroll
      const idleDrift  = Math.sin(clock * 0.3) * 0.08;
      logoGroup.rotation.y = mouse.x * 0.35 + idleDrift + scrollRot;
      logoGroup.rotation.x = -mouse.y * 0.22 + Math.sin(clock * 0.2) * 0.04;

      // Particles: lerp from scattered to formed, then idle drift
      const pos = pGeo.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++){
        const i3 = i * 3;
        const ease = 1 - Math.pow(1 - formProgress, 3); // cubic ease-in-out
        // Add tiny idle drift so they shimmer after forming
        const drift = prefersReduced ? 0 : Math.sin(clock * 0.8 + i * 0.07) * 0.012 * formProgress;
        pos[i3]   = originals[i3]   + (targets[i3]   - originals[i3])   * ease + drift;
        pos[i3+1] = originals[i3+1] + (targets[i3+1] - originals[i3+1]) * ease + drift;
        pos[i3+2] = originals[i3+2] + (targets[i3+2] - originals[i3+2]) * ease;
      }
      pGeo.attributes.position.needsUpdate = true;

      // Particle rotate with logo, slightly slower
      particles.rotation.y = logoGroup.rotation.y * 0.6;
      particles.rotation.x = logoGroup.rotation.x * 0.6;

      renderer.render(scene, camera);
    }
    animate();
  })();

  // ================================================================
  // 3D TILT CARDS — mouse-tracked rotateX / rotateY with shine
  // ================================================================
  if (!prefersReduced && window.innerWidth >= 768){
    document.querySelectorAll('.tilt-card').forEach(card => {
      const inner = card.querySelector('.tilt-card__inner');
      const shine = card.querySelector('.tilt-card__shine');
      const MAX_TILT = 8; // degrees

      card.addEventListener('mousemove', e => {
        const rect   = card.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) / (rect.width  / 2);
        const dy     = (e.clientY - cy) / (rect.height / 2);
        const rotY   =  dx * MAX_TILT;
        const rotX   = -dy * MAX_TILT;
        inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
        // Shine tracks mouse position as a radial gradient source
        const shineX = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
        const shineY = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
        shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.07) 0%, transparent 65%)`;
      });

      card.addEventListener('mouseleave', () => {
        inner.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
        shine.style.background = '';
      });
    });
  }

  // ================================================================
  // ABOUT PORTRAIT — slow rotateY driven by scroll position
  // ================================================================
  const portraitFrame = document.getElementById('portraitFrame');
  if (portraitFrame && !prefersReduced){
    function updatePortrait(){
      const rect = portraitFrame.getBoundingClientRect();
      const vh   = window.innerHeight;
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height/2 - vh/2) / (vh/2)));
      const ry = progress * -18; // −18° to +18°
      const rx = progress *   5;
      portraitFrame.style.transform = `perspective(800px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
    }
    window.addEventListener('scroll', updatePortrait, { passive: true });
    updatePortrait();
  }

  // ================================================================
  // SCROLL WATERMARKS (section marks)
  // ================================================================
  const sectionMarks = Array.from(document.querySelectorAll('[data-mark]'));
  if (!prefersReduced){
    let markTicking = false;
    function animateMarks(){
      const vh = window.innerHeight;
      sectionMarks.forEach((el, i) => {
        const rect     = el.getBoundingClientRect();
        const center   = rect.top + rect.height / 2;
        const progress = Math.max(-1, Math.min(1, (center - vh/2) / (vh/2)));
        const dir      = i % 2 === 0 ? 1 : -1;
        el.style.setProperty('--mark-rot', (progress * 10 * dir).toFixed(2) + 'deg');
        el.style.setProperty('--mark-y',   (progress * 18).toFixed(1) + 'px');
      });
      markTicking = false;
    }
    window.addEventListener('scroll', () => {
      if (!markTicking){ requestAnimationFrame(animateMarks); markTicking = true; }
    }, { passive: true });
    animateMarks();
  }

  // ================================================================
  // NAV — scroll state + light/dark theme
  // ================================================================
  const nav = document.getElementById('nav');
  const railFill = document.getElementById('railFill');
  const lightSections  = document.querySelectorAll('.section--approach, .section--about');
  const contactSection = document.querySelector('.section--contact');

  function onScroll(){
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    railFill.style.width = (docH > 0 ? (scrollTop / docH) * 100 : 0) + '%';
    nav.classList.toggle('is-scrolled', scrollTop > 30);

    const navLine = 80;
    let isLight = false, isContact = false;
    lightSections.forEach(s => { const r = s.getBoundingClientRect(); if (r.top <= navLine && r.bottom >= navLine) isLight = true; });
    if (contactSection){ const r = contactSection.getBoundingClientRect(); if (r.top <= navLine && r.bottom >= navLine) isContact = true; }
    nav.classList.toggle('is-light',   isLight);
    nav.classList.toggle('is-contact', isContact);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active nav link
  const navLinkEls = document.querySelectorAll('.nav__links a[data-section], .mobile-menu a[data-section]');
  const sectionEls = ['work','approach','services','about','contact'].map(id => document.getElementById(id)).filter(Boolean);
  function updateActiveLink(){
    let current = null;
    sectionEls.forEach(s => { const r = s.getBoundingClientRect(); if (r.top <= 140 && r.bottom > 140) current = s.id; });
    navLinkEls.forEach(a => { a.style.color = (a.dataset.section === current) ? 'var(--signal)' : ''; });
  }
  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  // ================================================================
  // MOBILE MENU
  // ================================================================
  const burger     = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeMenu  = () => { mobileMenu.classList.remove('is-open'); mobileMenu.setAttribute('aria-hidden','true'); burger.setAttribute('aria-expanded','false'); document.body.style.overflow = ''; };
  const openMenu   = () => { mobileMenu.classList.add('is-open'); mobileMenu.setAttribute('aria-hidden','false'); burger.setAttribute('aria-expanded','true'); document.body.style.overflow = 'hidden'; };
  burger.addEventListener('click', () => mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu());
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ================================================================
  // SCROLL REVEAL (with 3D entrance for services + approach)
  // ================================================================
  const revealTargets = document.querySelectorAll(
    '.case, .approach__item, .service-row, .about__content p, .section__head, .about__portrait'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){ entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealTargets.forEach(el => revealObserver.observe(el));

  // ================================================================
  // CONTACT FORM
  // ================================================================
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    note.textContent = "Thanks — that landed. We'll reply within one business day.";
    note.classList.add('is-success');
    form.reset();
  });

})();
