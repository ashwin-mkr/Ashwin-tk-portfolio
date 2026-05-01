import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'portfolio';

  // ── Three.js ──────────────────────────────────────────────
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particles!: THREE.Points;
  private animationFrameId!: number;
  private mouse = { x: 0, y: 0 };
  private clock = new THREE.Clock();

  // ── Contact Form ──────────────────────────────────────────
  contactForm = {
    name: '',
    email: '',
    message: '',
    rememberMe: false
  };
  formState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  formErrorMsg = '';

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.setupNavScroll();
    this.setupSmoothScroll();
    this.setupScrollAnimations();
  }

  // ── Form submission ───────────────────────────────────────
  async onSubmitContact(): Promise<void> {
    const { name, email } = this.contactForm;

    if (!name.trim() || !email.trim()) {
      this.formErrorMsg = 'Please fill in Name and Email.';
      this.formState = 'error';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.formErrorMsg = 'Please enter a valid email address.';
      this.formState = 'error';
      return;
    }

    this.formState = 'loading';
    this.formErrorMsg = '';

    try {
      await this.firebaseService.submitContactForm({ ...this.contactForm });
      this.formState = 'success';
      this.contactForm = { name: '', email: '', message: '', rememberMe: false };
    } catch (err: any) {
      console.error('Firestore error:', err);
      this.formErrorMsg = err.message || 'Something went wrong. Please try again.';
      this.formState = 'error';
    }
  }

  resetForm(): void {
    this.formState = 'idle';
    this.formErrorMsg = '';
  }

  // ── Three.js setup ────────────────────────────────────────
  @HostListener('window:resize')
  onResize(): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private initThreeJS(): void {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 60;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.createParticles();
    this.createNetworkLines();
    this.animate();
  }

  private createParticles(): void {
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0xec4899),
      new THREE.Color(0x6366f1),
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 100 + 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = (radius * Math.cos(phi)) * 0.5;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.35, vertexColors: true, transparent: true, opacity: 0.75, sizeAttenuation: true
    }));
    this.scene.add(this.particles);
  }

  private createNetworkLines(): void {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 6);
    const spread = 80;
    for (let i = 0; i < count; i++) {
      const i6 = i * 6;
      pos[i6]   = (Math.random() - .5) * spread; pos[i6+1] = (Math.random() - .5) * spread; pos[i6+2] = (Math.random() - .5) * 20;
      pos[i6+3] = (Math.random() - .5) * spread; pos[i6+4] = (Math.random() - .5) * spread; pos[i6+5] = (Math.random() - .5) * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.06 })));
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    const e = this.clock.getElapsedTime();
    if (this.particles) { this.particles.rotation.y = e * 0.05; this.particles.rotation.x = e * 0.02; }
    this.camera.position.x += (this.mouse.x * 5 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouse.y * 3 - this.camera.position.y) * 0.02;
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
  }

  private setupNavScroll(): void {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // ── FIXED: only intercept internal #hash links, not external URLs ──
  private setupSmoothScroll(): void {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') ?? '';

        // Guard: skip if it's not a pure hash link (e.g. external http links)
        if (!href.startsWith('#') || href.length <= 1) return;

        e.preventDefault();
        const target = document.querySelector(href);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  private setupScrollAnimations(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Animate only once
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }
}