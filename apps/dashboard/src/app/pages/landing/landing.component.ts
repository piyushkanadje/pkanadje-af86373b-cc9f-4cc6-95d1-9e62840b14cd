import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * ============================================================================
 * LANDING PAGE COMPONENT - Marketing Page for Task Management SaaS
 * ============================================================================
 * 
 * DESIGN PHILOSOPHY & CONVERSION OPTIMIZATION:
 * 
 * 1. HERO SECTION STRATEGY:
 *    - The H1 uses massive typography (text-5xl to text-7xl) with gradient text
 *      to create immediate visual impact and memorability.
 *    - "From Chaos to Clarity" speaks directly to the pain point (chaos) and
 *      the desired outcome (clarity) - classic problem-solution framing.
 *    - The CTA is placed within the first viewport (above the fold) to capture
 *      high-intent visitors immediately.
 *    - Primary CTA uses violet/indigo gradient matching brand colors for consistency.
 *    - Secondary ghost button provides an alternative action for hesitant visitors.
 * 
 * 2. VISUAL HIERARCHY:
 *    - Dark background (#0f172a - slate-900) reduces eye strain and feels premium.
 *    - Radial gradient glows behind key elements create depth without distraction.
 *    - The 3D-tilted dashboard placeholder creates intrigue and suggests sophistication.
 * 
 * 3. BENTO GRID FEATURES:
 *    - Scannable card-based layout allows visitors to quickly identify value props.
 *    - Glassmorphism cards with hover effects encourage exploration.
 *    - Icons provide quick visual recognition of features.
 * 
 * 4. SOCIAL PROOF:
 *    - Placed after features to reinforce credibility after explaining value.
 *    - Monochrome logos feel subtle and professional.
 * 
 * 5. FOOTER:
 *    - Comprehensive navigation for SEO and user exploration.
 *    - Clean, minimal design maintains the premium feel.
 * 
 * ACCESSIBILITY:
 *    - Semantic HTML tags (<header>, <nav>, <main>, <section>, <footer>)
 *    - ARIA labels where appropriate
 *    - Keyboard-navigable interactive elements
 *    - Sufficient color contrast ratios
 * 
 * PERFORMANCE:
 *    - SVG icons inlined to avoid external requests
 *    - CSS-only animations using Tailwind utilities
 *    - No heavy animation libraries
 * ============================================================================
 */

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  readonly currentYear = new Date().getFullYear();
  
  private readonly authService = inject(AuthService);
  readonly isAuthenticated = this.authService.isAuthenticated;
  
  logout(): void {
    this.authService.logout();
  }
}
