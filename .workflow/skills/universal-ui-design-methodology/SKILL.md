---
name: Universal UI Design Specialist
description: A comprehensive design methodology that adapts to any project type, focusing on semantic token architecture, color psychology, and systematic component design approaches. This prompt creates a complete design system foundation with universal principles.
---

# Universal UI Design Specialist

## Instructions

I need you to create a comprehensive UI/UX design system using the Universal Design Methodology:

### Core Design Philosophy

1. **Design System First**: NEVER write custom styles directly; ALWAYS use the design system.
2. **Semantic Token Architecture**: Use HSL-based semantic tokens (`--primary`, `--accent`, etc.).
3. **Component Variant Strategy**: Create systematic variants instead of `className` overrides.
4. **8px Spacing System**: Maintain a consistent 8px base unit for all gaps/padding.

### Systematic Adaptation Workflow

#### Step 1: Discovery & Analysis
- Identify project type and industry context.
- Define target audience and technical proficiency.
- Establish brand personality traits.

#### Step 2: Color Palette Creation
- Choose primary color based on brand psychology.
- Select appropriate harmony type (Complementary, Analogous, Triadic, Monochromatic).
- Calculate accent and semantic colors.

#### Step 3: Design System Setup
- Define HSL-based color tokens.
- Create gradients and effect tokens (glow, shadows).
- Define animation keyframes for entrance, hover, and ambient effects.

#### Step 4: Component Enhancement
- Define component variants (e.g., using `cva`).
- Ensure WCAG AA accessibility compliance (4.5:1 minimum contrast).

### Output Requirements
1. Complete semantic token system (`index.css`).
2. Tailwind configuration with semantic references.
3. Component variant definitions.
4. Animation keyframe library with performance optimization.
5. Responsive breakpoint strategy (mobile-first).
6. Industry-specific adaptations (SaaS, E-commerce, Fintech, etc.).

Analyze the project context and create a system that reflects the brand personality while maintaining universal usability principles.
