# Dashboard Redesign UI Specification and Implementation Plan

## 1. Vision and Principles

*   **Goal:** To transform the entire user experience, from the landing page to the individual and team dashboards, into a clean, modern, dark-themed interface. This redesign will apply contemporary web design principles for enhanced clarity, ease of navigation, and visual appeal, specifically tailoring the experience to the distinct needs of e-commerce sellers and agency professionals.
*   **Core Principles:**
    *   **User-Centric Customization:** Design an experience that feels personalized from the first interaction, addressing specific pain points of each audience segment.
    *   **Impact Maximization:** Clearly demonstrate the value and impact of the service across all touchpoints.
    *   **Clarity & Actionability:** Prioritize clear, actionable insights and streamlined workflows, especially within the dashboards.
    *   **Minimalism:** Reduce visual clutter, focusing on essential information and actions.
    *   **Negative Space:** Utilize ample negative space to improve readability and create a sense of calm.
    *   **Bold Typography:** Employ strong, legible typography to establish clear hierarchy and visual interest.
    *   **Glassmorphism:** Apply frosted glass effects for depth and subtle transparency.
    *   **Micro-animations:** Integrate subtle, thoughtful animations to enhance responsiveness and delight.
    *   **Vibrant Accents:** Use carefully chosen vibrant colors to highlight key elements and provide visual cues.
    *   **Hierarchy, Contrast, Balance, Movement:** Ensure all design elements contribute to a harmonious and intuitive user experience.

## 2. UI Specification

### 2.1. Global Design Elements (Applicable to all interfaces)

These elements will ensure a cohesive brand identity across the entire platform.

*   **Color Palette Recommendations:**
    *   **Primary Background:** Deep charcoal or almost-black (`#1A1A2E` or `#0F0F1A`) – for a sophisticated and modern feel. This will be a subtle radial or linear gradient to add depth (e.g., `radial-gradient(ellipse at center, #1A1A2E 0%, #0F0F1A 100%)`).
        *   **Darkest Shade:** `#0D0D15` (for deepest shadows/backgrounds)
        *   **Medium Dark:** `#1A1A2E` (main background)
        *   **Slightly Lighter Dark:** `#24243F` (for card/panel base)
    *   **Secondary Backgrounds (Card/Panel):** Slightly lighter dark tones with a hint of transparency for glassmorphism (`rgba(30, 30, 50, 0.6)`). These will have a subtle, blurred light source effect from behind.
        *   **Glassmorphic Base:** `rgba(30, 30, 50, 0.6)`
        *   **Hover/Active Glassmorphic:** `rgba(40, 40, 65, 0.7)` (deeper transparency, slight tint)
    *   **Text Colors:**
        *   **Primary Text:** Soft white or light gray (`#E0E0E0`, `#C0C0C0`) for readability, ensuring high contrast.
            *   `#E0E0E0` (main headings, important text)
            *   `#C0C0C0` (secondary headings, prominent labels)
        *   **Secondary Text/Descriptions:** Muted gray (`#A0A0A0`, `#808080`) for less prominent information.
            *   `#A0A0A0` (body text, descriptions)
            *   `#808080` (timestamps, subtle notes)
        *   **Accent Text:** Use vibrant accent colors for highlighted text or interactive elements (e.g., glowing text for active navigation items).
    *   **Accent Colors:** A limited palette of vibrant, contrasting colors for key interactive elements, progress bars, and alerts. These colors will also be used in subtle gradients within glassmorphic elements.
        *   **Primary Accent (Interactive/Positive):** A vibrant blue or purple (`#8A2BE2` - Amethyst, `#4A90E2` - Cerulean Blue). Used for primary buttons, active states, positive trends.
            *   **Amethyst Purple:** `#8A2BE2` (buttons, active states, positive trends)
            *   **Cerulean Blue:** `#4A90E2` (alternative primary, charts, links)
        *   **Secondary Accent (Warning/Neutral):** A soft orange or yellow (`#FFA726` - Orange Peel, `#FFD700` - Gold). Used for warnings, pending states, secondary call-outs.
            *   **Orange Peel:** `#FFA726` (warnings, pending)
            *   **Gold:** `#FFD700` (highlights, secondary call-outs)
        *   **Success:** A muted green (`#66BB6A`). Used for successful operations, positive status.
            *   **Success Green:** `#66BB6A`
        *   **Error/Alert:** A subtle red (`#EF5350`). Used for errors, critical alerts, negative trends.
            *   **Error Red:** `#EF5350`
    *   **Border Colors:** Very subtle, thin lines using slightly lighter background shades with transparency (`rgba(255, 255, 255, 0.05)`). These borders will gain a subtle glow on hover for interactive elements.
        *   **Default Border:** `rgba(255, 255, 255, 0.05)`
        *   **Interactive Border Glow:** `rgba(138, 43, 226, 0.3)` (Amethyst glow)
*   **Typography Choices:**
    *   Prioritize readability and modern aesthetics.
    *   **Headings (H1, H2, H3):** `Inter` or `Manrope` (bold weights: 700, 800). Use larger sizes for primary headings (e.g., H1: `text-5xl` for landing, `text-3xl` for dashboards) and slightly smaller for sub-headings.
    *   **Body Text:** `Open Sans` or `Roboto` (regular weight: 400). Used for paragraphs, descriptions, and standard content. `text-base` or `text-sm`.
    *   **Numbers/Data:** `Space Mono` or `Fira Code` (monospaced) for metrics and data displays to ensure perfect alignment and a technical feel. `text-2xl` to `text-4xl` for key metrics.
    *   **Font Sizes:** Establish a clear typographic scale, utilizing larger sizes for primary headings and smaller, legible sizes for secondary information.
*   **Example Micro-interactions (Global):**
    *   **Button Click/Hover:**
        *   **Hover:** Background color subtly brightens with a quick, linear gradient sweep animation. Text color slightly changes (e.g., to a lighter accent). A very quick, small upward translation (`translateY(-2px)`) for a "lift" effect, combined with a subtle `box-shadow` expansion.
        *   **Click:** A quick, satisfying press-down animation (`scale(0.98)`) and a brief, strong accent color ring pulse.
    *   **Input Field Focus:**
        *   Border color animates to a vibrant accent color (e.g., Amethyst purple) using a smooth `transition`.
        *   Placeholder text subtly shrinks and moves up as a floating label (`transform: translateY(-100%) scale(0.8)`), fading slightly in color.
    *   **Toggle/Switch:**
        *   A satisfying "snap" animation when toggled, with the background filling smoothly from one accent color to another. The thumb will slide with a subtle squash-and-stretch effect.
    *   **Notifications:**
        *   Slide-in animation from the top or side with a gentle `ease-out` curve.
        *   Subtle bounce or pulse effect on new notification badge, drawing attention.
    *   **Card Hover Effect (Glassmorphism, refined):**
        *   On hover, a card subtly scales up (`scale(1.01)` or `scale(1.02)`), the `backdrop-filter: blur` intensity slightly increases, and the `background-color` transparency deepens. A subtle, animated glowing border appears (using `box-shadow` with `rgba` and an `inset` for a subtle inner glow). Icons within the card might subtly rotate or pulsate once.

### 2.2. Landing Page Design - Tailored for E-commerce Sellers & Agency Employees
---
**Audience Focus:** E-commerce Sellers & Agency Employees. The landing page will adapt its messaging and visual emphasis to resonate with both audiences, demonstrating maximal impact.

*   **Layout Structure:**
    *   **Hero Section (Dynamic & Immersive):**
        *   **Visuals:** A full-width, low-opacity background video loop showcasing a dynamic blend of e-commerce product shots and sleek, abstract data visualizations. The video will change subtly based on inferred user intent (e.g., if UTM parameters suggest "agency").
        *   **Headline:** A large, bold, glassmorphic text overlay. The headline will use a A/B tested dynamic string (e.g., "Unlock E-commerce Growth with AI-Powered Content" vs. "Scale Your Agency's Marketing with Intelligent Automation"). Sub-headline will reinforce specific pain points and benefits.
        *   **Call-to-Action (CTA):** Two prominent, `AnimatedButton` components side-by-side or stacked on mobile. One primary CTA (e.g., "Start Free Trial" for sellers, "Request a Demo" for agencies) and a secondary (e.g., "Learn More about E-commerce Features" or "Explore Agency Solutions"). CTAs will have distinct, vibrant accent colors (e.g., blue for sellers, purple for agencies).
    *   **Problem/Solution Sections (Tailored Narratives):**
        *   Two distinct, vertically stacked sections, each dedicated to an audience. Each section will have a clear, empathetic headline (e.g., "Tired of Manual Content Creation?" for sellers; "Struggling to Scale Client Campaigns?" for agencies).
        *   Content will use icon-driven bullet points and concise paragraphs, specifically addressing 3-4 key pain points for that audience and immediately presenting the service's solution. Visuals will be dynamic, illustrating the "before" (pain point) and "after" (solution).
    *   **Feature Showcase (Interactive Demos & Visual Workflows):**
        *   Instead of static images, include interactive mini-applications or embedded video demonstrations.
        *   **E-commerce Workflow Demo:** A simplified click-through simulation of AI content generation for a product, showing the input (product image/description) and output (optimized listing copy/video script).
        *   **Agency Client Management Demo:** A short, animated visualization of how multiple client campaigns can be managed and tracked from a single interface, emphasizing automation and reporting.
        *   Each demo section will have clear, inviting CTAs to "Try it Now" or "See it in Action."
    *   **Testimonials/Case Studies (Quantifiable Impact):**
        *   A horizontal scrolling carousel of `GlassCard` testimonials. Each card features a client's quote, photo, and *quantifiable results* (e.g., "+30% Sales, -50% Content Time").
        *   Include distinct sections for e-commerce and agency case studies, or filterable content.
    *   **Pricing/Plans (Adaptive & Transparent):**
        *   A toggle or tabbed interface allowing users to select "Individual Seller" or "Agency/Team" plans.
        *   Each plan will be presented in a `GlassCard` with clear features, pricing, and a compelling call to action.
    *   **Footer:** Standard navigation, contact, and legal information, with social media links using animated icons.
*   **Visual Elements & Micro-interactions (Landing Page Specific):**
    *   **Hero Section Particle Effects:** Subtle, slow-moving particles or light trails in the background, hinting at data flow or AI processing.
    *   **Scroll-triggered Animations:** Sections will fade in and slide up smoothly as the user scrolls, controlled by `framer-motion`'s `useScroll` hook.
    *   **Feature Demo Interaction:** When a user hovers over a demo area, a play icon or a "launch" button will subtly pulse and scale.
    *   **Pricing Plan Selection:** When a plan type is selected (Individual/Agency), the content of the pricing section will smoothly cross-fade or slide, with the selected tab having a glowing border.

### 2.3. Individual Dashboard Design - Optimized for E-commerce/Service Sellers
---
**Audience Focus:** E-commerce/service sellers who prefer clarity, actionable insights, and a clear workflow.

*   **Layout Structure:**
    *   **Global Navigation (Sidebar):** A left-aligned, collapsible sidebar. Icons for main sections (Home, Content Creation, Product Optimization, Campaign Management, Analytics, Scheduler, Settings). Active link will have a vibrant accent color glow and a subtle animated underline. On collapse, only icons will remain, with tooltips on hover.
    *   **Main Content Area:** A responsive grid-based layout prioritizing immediate value and workflow, designed for single-user focus.
        *   **Header:** Persistent header with user greeting (`Good morning, [User Name]!`), simplified search (focus on product/content search), notifications (pulsing badge for new alerts), and user profile (avatar, plan tier, with quick access to settings on click).
        *   **Key Metrics (Prominent & Interactive):** Inspired by the provided image's "Views, Followers, Reposts" section, these will be large, bold, numerical displays within `GlassCard` components.
            *   **Metrics:** Revenue, Orders, Conversion Rate, Visitors. Each will have:
                *   Large, monospaced `text-4xl` value (e.g., "$27,6M").
                *   Smaller `text-sm` descriptive label below (e.g., "Total Revenue This Month").
                *   A dynamic change indicator (`+X.X%` or `-X.X%`) with `TrendingUp`/`TrendingDown` icon, colored green for positive, red for negative.
                *   On value update, a subtle count-up animation will occur for the number.
                *   On hover, a sparkline chart for the last 7 days will appear as a tooltip, and the card will exhibit the global glassmorphism hover effect.
        *   **Quick Actions (Workflow-oriented Cards):** A prominent section of 3-5 action-oriented `GlassCard` components. Each card represents a core workflow step.
            *   **Examples:** "Upload New Product Video," "Optimize Listing for SEO," "Generate AI Content Ideas," "Schedule Social Posts."
            *   Each card will have a large, relevant Lucide icon (e.g., `Upload`, `Sparkles`, `Bot`, `Calendar`), a concise title, and a one-sentence description emphasizing the *benefit* or *next step*.
            *   On hover, the icon will gently pulsate or rotate, and the card will subtly lift, transitioning to a more vibrant accent color border. A clear "Start Workflow" or "Go to Tool" button will appear on hover.
        *   **Performance Trends (Detailed Charts):** A dedicated section for interactive charts, similar to the "Activity" chart in the provided image.
            *   **Chart Types:** Line charts for trends (e.g., "Revenue over Time," "Conversion Rate Weekly"), Bar charts for comparisons (e.g., "Sales by Product Category").
            *   **Design:** Glassmorphic background for the chart area. Vibrant accent colors for lines/bars (e.g., Amethyst purple for revenue, Cerulean blue for orders). Faint, dashed grid lines.
            *   **Interactivity:** On hover, a clean, minimal tooltip will display specific data points (like the "32210 Views / Hour" in the image), with a subtle vertical line guiding the eye.
            *   **Time Range Selector:** A prominent dropdown (e.g., "01-07 May" in image) allowing users to select date ranges for the charts.
        *   **Recent Activity Feed (Personalized Events):** A streamlined, scrollable list of personal activities and system notifications.
            *   Each entry will be concise: an icon (e.g., `DollarSign` for sales, `Sparkles` for optimization, `Bell` for alerts), a short title (e.g., "New Sale Generated," "Listing Optimized"), and a relative timestamp (e.g., "2 minutes ago").
            *   Subtle fade-in animations for new entries.
        *   **Actionable Insights/Recommendations (AI-Driven):** A dedicated `GlassCard` widget providing personalized, AI-driven recommendations.
            *   **Content:** Short, clear insights (e.g., "Product X has low conversion, consider new video," "Your best performing post used [keyword], try more like this").
            *   Each insight will have a direct "Take Action" button leading to the relevant tool or workflow, or a "Dismiss" option.
            *   Subtle AI-themed iconography (e.g., a small `Sparkles` icon next to the heading).
        *   **Workflow Task List & Initiation:** A dedicated section displaying a list of unfinished tasks from the previous workflow cycle. Each task will be a clear, concise entry with a checkbox for completion. A prominent `AnimatedButton` will be available to "Start New Workflow," which will automatically generate a new set of tasks, appending them to the existing list.
        *   **Content Calendar Enhancements (within Scheduler):**
            *   **Zoom-in Feature:** The content calendar (accessed via the Scheduler navigation) will have a "zoom-in" capability, allowing users to view a detailed, per-hour breakdown of scheduled posts within a selected date.
            *   **Time Adjustment:** Within the zoomed-in view, users can adjust the precise posting time of scheduled content by dragging a time slider or using direct input fields.
            *   **Drag-and-Drop Scheduling:** Users will be able to drag brief content descriptors (e.g., video thumbnails or titles) from a "pending content" area onto specific dates in the calendar. When dropped, the video will automatically be scheduled for a pre-defined optimal time on that date. There will be two distinct content descriptors for video briefs: one for general video content and another for product-focused video content.

*   **Tone & Language:** Empowering, directive, and encouraging. Focus on helping the seller achieve their immediate business goals through clear, concise instructions and impactful data.

### 2.4. Team Dashboard Design - Centralized for Agency Employees
---
**Audience Focus:** Agency employees needing an uncluttered birds-eye view of multiple clients, with the ability to zoom in for deeper understanding.

*   **Layout Structure:**
    *   **Global Navigation (Sidebar):** Similar to individual dashboard, but with "Clients" or "Team Management" as a top-level navigation item. This section will have sub-navigation for "All Clients," "Add New Client," "Team Members."
    *   **Main Content Area:** Designed for high-level oversight with powerful drill-down capabilities.
        *   **Header:** Persistent header with team/agency name, a prominent "Search Clients" input, aggregated notifications (e.g., "3 new client alerts"), and agency profile/settings.
        *   **Aggregated Performance Metrics (Team KPIs):** A row of large `GlassCard` components displaying overall agency performance across all clients.
            *   **Metrics:** "Total Revenue Managed," "Average Client Conversion Rate," "Total Campaigns Active," "Overall Content Volume Produced."
            *   These will use the same large typography and trend indicators as the individual dashboard, but reflecting cumulative agency performance.
        *   **Client Overview Grid (Central Feature with Zoom-in):** The main area will feature a responsive, sortable, and filterable grid of `GlassCard` components, each representing a *single client*.
            *   **Client Card Design:** Inspired by the "Top Performers" and "Channels" sections in the provided image. Each client card will be a `GlassCard` with:
                *   **Client Logo/Avatar:** Prominently displayed.
                *   **Client Name:** Bold typography.
                *   **Key Aggregated Metrics:** 2-3 essential high-level metrics (e.g., "Overall Performance Score: 85%," "Active Campaigns: 5," "Last Activity: 2 hours ago"). These will be smaller, legible numbers.
                *   **Status Indicator:** A small, color-coded dot or mini-sparkline chart (inspired by the chart lines in the original image) indicating client health or recent performance trend (e.g., green for healthy, orange for attention, red for critical).
                *   **Micro-interaction (Hover for Drill-down):** On hover, the client card will subtly expand (`scale(1.01)`), and a clear, animated "View Client Details" `AnimatedButton` will appear, or an `ArrowRight` icon will animate in. A subtle accent-colored glow will emanate from the card, especially if the client needs attention.
                *   **Filtering/Sorting:** Prominent filter (by client status, industry, assigned team member) and sort (by performance, name, last activity) options above the grid.
        *   **Team Activity Stream (Cross-Client Events):** A consolidated, filterable feed of significant activities across *all* clients.
            *   Entries will include client name, activity type (e.g., "Campaign 'Summer Sale' for Client 'Alpha' completed"), relevant icon, and timestamp.
        *   **Workflow Status Overview (Bulk Operations):** A dedicated section summarizing the progress of ongoing bulk operations or automated workflows across clients.
            *   **Examples:** "Bulk Video Processing: 7/12 clients complete," "Auto-posting scheduled for next week: 90% completed." Use animated progress bars (`GlassCard` style) for these summaries.
        *   **Client Detail View (Dynamic Route):**
            *   Clicking on a client card will trigger a smooth, cinematic "zoom-in" transition (`framer-motion` layout animations) to a dedicated dynamic route (`/team-dashboard/[clientId]`).
            *   This page will inherit the individual seller dashboard's structure but *all data will be scoped to the selected client only*. It will have its own header (e.g., "Client [Client Name] Dashboard") and full access to client-specific metrics, content, analytics, and workflows.
            *   A prominent "Back to Team Overview" `AnimatedButton` will be present in the header or sidebar, enabling easy navigation back.
*   **Visual Elements & Micro-interactions (Team Dashboard Specific):**
    *   **Client Card Status Visuals:** Small, embedded, color-coded mini-charts or heatmaps within the client cards provide quick visual summaries of performance.
    *   **Filter/Sort Interaction:** When filters are applied, the client grid will smoothly re-arrange with `framer-motion`'s `AnimatePresence`.
    *   **"Zoom-in" Transition:** When drilling down into a client, the transition will feel fluid, as if the overview card expands to fill the screen, revealing the detailed dashboard within. This can be achieved with `framer-motion`'s shared layout animations.
*   **Tone & Language:** Professional, efficient, and collaborative. Focus on providing clear oversight, powerful management tools, and demonstrable value for agency operations.

## 3. Implementation Plan: Detailed Breakdown (Revised & Expanded)

This revised plan incorporates the more specific design choices and the distinct needs of each dashboard/landing page.

### Checkpoint 1: Global Setup and Core Layouts (Est. 3-4 days)
---
*   **Subtask 1.1: Project Setup and Dependencies**
    *   **Action:** Verify Next.js environment. Install/Update `tailwindcss`, `postcss`, `autoprefixer`.
    *   **Action:** Install `framer-motion` for advanced animations (`npm install framer-motion`).
    *   **Action:** Install/Verify `lucide-react` (ensure latest version) for a comprehensive icon set (`npm install lucide-react`).
*   **Subtask 1.2: Global Styles and Dark Theme System**
    *   **Action:** Define base dark theme in `src/app/globals.css` using CSS variables (e.g., `--background-primary: #1A1A2E; --text-light: #E0E0E0; --accent-blue: #4A90E2;`). Implement subtle background gradient as specified.
    *   **Action:** Implement a robust `ThemeProvider` (if not already present, e.g., using `next-themes` or a custom Context API provider) to manage theme switching (defaulting to dark).
    *   **Action:** Refactor `tailwind.config.js` to extend the theme with the new, specific color palette, typography scale (e.g., `fontFamily: { display: ['Inter', 'sans-serif'], body: ['Open Sans', 'sans-serif'], mono: ['Space Mono', 'monospace'] }`), and any new spacing/sizing rules.
*   **Subtask 1.3: Responsive Layout Structure (Base Components)**
    *   **Action:** Create a foundational `src/components/layout/AppLayout.tsx` component. This component will conditionally render different header/navigation based on the current route (e.g., minimal header for landing, full header/sidebar for dashboards) and screen size.
    *   **Action:** Develop a common `src/components/common/Header.tsx` component. This component will accept props to customize its appearance and functionality for the landing page (minimalist) and dashboards (with search, notifications, profile).
    *   **Action:** Implement a reusable, responsive `src/components/common/Sidebar.tsx` component for dashboard navigation. Ensure it's collapsible, uses icons with text labels, and adapts to mobile (e.g., a hamburger menu overlay).

### Checkpoint 2: Core UI Components (Glassmorphism & Interactions) (Est. 4-5 days)
---
*   **Subtask 2.1: Glassmorphic Card Component**
    *   **Action:** Create a highly flexible `src/components/ui/GlassCard.tsx` component. This component will utilize `backdrop-filter: blur(12px);`, `background-color: rgba(30, 30, 50, 0.6);`, `border: 1px solid rgba(255, 255, 255, 0.1);`, and `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);`.
    *   **Action:** Integrate `framer-motion` into `GlassCard.tsx` for the refined hover states (subtle `scale(1.01)`, increased blur, subtle glowing border with `inset` shadow, transparency deepening) and initial load animations (e.g., `opacity: 0` to `1`, `y: 20` to `0`).
    *   **Action:** Systematically replace *all* existing `Card` usages (from `ui/card` or similar) in `src/app/dashboard/page.tsx`, `src/app/team-dashboard/page.tsx`, and all `src/components/dashboard/*Component.tsx` files with the new `GlassCard` component.
*   **Subtask 2.2: Animated Button Component**
    *   **Action:** Enhance or create `src/components/ui/AnimatedButton.tsx`. This component will wrap `html <button>` and use `framer-motion` for hover (subtle `translateY(-2px)`, `box-shadow` expansion, gradient sweep on background) and click (quick `scale(0.98)` and accent color ring pulse) micro-animations.
    *   **Action:** Define variations as props (e.g., `variant="primary"`, `variant="secondary"`, `variant="ghost"`, `variant="destructive"`) to control accent colors and styles.
    *   **Action:** Update all `Button` usages across the application (landing page, dashboards, internal components) to `AnimatedButton`, ensuring consistent and delightful interaction feedback.
*   **Subtask 2.3: Enhanced Input and Form Elements**
    *   **Action:** Redesign `Input` components (`src/components/ui/GlassInput.tsx`). Implement animated borders on focus (transitioning to a vibrant accent color, e.g., `focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30`) and the floating placeholder labels using `position: absolute`, `transform`, and `transition`.
    *   **Action:** Apply consistent dark theme styling to all other core form elements (checkboxes, radio buttons, select dropdowns, textareas) in `globals.css` or dedicated UI components.
    *   **Action:** Update search bars on both the landing page (if applicable) and dashboard headers to use the new `GlassInput` styling.
*   **Subtask 2.4: Typography Application**
    *   **Action:** Integrate chosen fonts (`Inter`, `Open Sans`, `Space Mono`) into the Next.js project. If using Google Fonts, add them to `_document.tsx` or `_app.tsx`. If self-hosting, ensure proper font file loading.
    *   **Action:** Systematically apply new Tailwind CSS typography classes (e.g., `text-display`, `text-h1`, `font-bold`, `font-mono`) to all text elements across the entire UI, following the defined typographic scale. Conduct visual QA to ensure hierarchy and readability.

### Checkpoint 3: Landing Page Implementation (Est. 3-4 days)
---
*   **Subtask 3.1: Hero Section Development (`src/app/page.tsx`)**
    *   **Action:** Implement a full-width hero section with a `div` containing a low-opacity, looping background video (optimized `webm`/`mp4` for performance).
    *   **Action:** Develop dynamic headline and subtext components that can switch content based on A/B testing or URL parameters (e.g., `useEffect` to parse query params and set state). Headlines will be `text-display` size, with glassmorphic `background` and `backdrop-filter`.
    *   **Action:** Create distinct `AnimatedButton` CTAs for each audience, using specific accent colors and hover effects as defined.
*   **Subtask 3.2: Problem/Solution & Feature Showcase Sections**
    *   **Action:** Design and implement dedicated sections using responsive two-column layouts (e.g., `grid grid-cols-1 md:grid-cols-2`). Each column will use `GlassCard`s or similar containers for content.
    *   **Action:** Develop interactive feature demonstration components. For the AI Content Generator, this could be a controlled `iframe` or a simulated UI with step-by-step animations triggered by user clicks. For Agency, a series of animated SVG or Lottie animations illustrating workflow.
*   **Subtask 3.3: Testimonials, Pricing, and Footer**
    *   **Action:** Implement a responsive testimonials section with a horizontal scrolling carousel using `framer-motion`'s drag capabilities. Each testimonial will be a `GlassCard`.
    *   **Action:** Design an adaptive pricing section. This could use a `Tabs` component (e.g., from `shadcn/ui` or custom) to switch between individual and team plans. Each plan will be presented in a `GlassCard` with features, pricing, and an `AnimatedButton` CTA.
    *   **Action:** Develop a clean, functional footer with a dark background, minimal text, and animated social media icons (e.g., `onHover` scale effect).
*   **Subtask 3.4: A/B Testing & Personalization Logic (Initial)**
    *   **Action:** Implement basic client-side logic (e.g., using `next/router` to read query parameters or a simple cookie) to set a 'user_segment' state (e.g., 'ecommerce' or 'agency').
    *   **Action:** Use this `user_segment` state to conditionally render content and adjust headlines/CTAs in the Hero and Problem/Solution sections.

### Checkpoint 4: Individual Dashboard Redesign (E-commerce Sellers) (Est. 5-7 days)
---
*   **Subtask 4.1: Header & Navigation Refinement (`src/app/dashboard/page.tsx`, `src/components/common/Header.tsx`, `src/components/common/Sidebar.tsx`)**
    *   **Action:** Integrate the globally defined `Header.tsx` into `src/app/dashboard/page.tsx`, passing props to enable seller-specific search, notifications, and profile.
    *   **Action:** Refine `Sidebar.tsx` for seller navigation: clear icons for `Home`, `Content` (for creation), `Products` (for optimization), `Analytics`, `Schedule`, `Settings`. Ensure active states use the primary accent color glow.
*   **Subtask 4.2: Key Metrics Section (`src/app/dashboard/page.tsx`)**
    *   **Action:** Implement `mainMetrics` array. Each metric will be rendered as a `GlassCard`.
    *   **Action:** Within each `GlassCard`: display value with `font-mono` and `text-4xl`, description with `text-sm`, and `AnimatedPresence` for count-up animations on value changes.
    *   **Action:** Integrate `TrendingUp`/`TrendingDown` icons with dynamic coloring (green/red) based on `trend` property.
    *   **Action:** Implement the sparkline chart tooltip on hover for each metric card. This can be a simple `recharts` or `nivo` chart rendered conditionally.
*   **Subtask 4.3: Quick Actions Section (`src/app/dashboard/page.tsx`)**
    *   **Action:** Redesign `quickActions` as a grid of interactive `GlassCard` components.
    *   **Action:** Each card will contain a large Lucide icon, a bold title, a concise description, and an `AnimatedButton` (e.g., "Start") that is visible on hover.
    *   **Action:** Implement specific hover animations: icon rotation/pulse, card lift, and border glow for each action card.
*   **Subtask 4.4: Performance Trends & Activity Feed**
    *   **Action:** Update `src/components/dashboard/charts.tsx`. Ensure charts have glassmorphic backgrounds. Use vibrant accent colors for lines/bars (e.g., `--accent-purple` for key lines). Implement subtle data point animations.
    *   **Action:** Redesign `recentActivity` items within a scrollable `GlassCard` container. Each item will have a small, relevant icon, a bold title, and a muted timestamp. Implement subtle fade-in animations for new entries using `framer-motion`'s `AnimatePresence`.
*   **Subtask 4.5: Actionable Insights Widget**
    *   **Action:** Develop a new `src/components/dashboard/ActionableInsights.tsx` component. This will be a `GlassCard` displaying AI-driven recommendations.
    *   **Action:** Each insight will have a concise text, a small AI/sparkles icon, and an `AnimatedButton` linking directly to the recommended action or tool. Include a "Dismiss" button.
*   **Subtask 4.6: Workflow Task List and New Workflow Initiation**
    *   **Action:** Implement a `src/components/dashboard/WorkflowTaskList.tsx` component. This component will fetch and display unfinished tasks, allowing users to mark them as complete. Use `AnimatedPresence` for task removal animations.
    *   **Action:** Add an `AnimatedButton` to the dashboard main page to trigger the "Start New Workflow" action, which will call an API to generate new tasks and update the task list.
*   **Subtask 4.7: Content Calendar (`src/components/dashboard/ContentCalendar.tsx`) Enhancements**
    *   **Action:** Enhance the `ContentCalendar` component to include a "zoom-in" feature for daily views, displaying hourly slots. Implement time adjustment by dragging elements within the hour slots or direct input.
    *   **Action:** Integrate drag-and-drop functionality for content descriptors. When a descriptor is dropped onto a date, an API call will schedule the associated video at a pre-defined optimal time for that day. Ensure visual feedback for drag (e.g., ghost image) and drop (e.g., subtle animation of content appearing).
    *   **Action:** Create two distinct, draggable `BriefContentDescriptor` components, one for general video content and another for product-focused video content, allowing users to differentiate between the types of content being scheduled.

### Checkpoint 5: Team Dashboard Redesign (Agency Employees) (Est. 6-8 days)
---
*   **Subtask 5.1: High-Level Client Overview (`src/app/team-dashboard/page.tsx`)**
    *   **Action:** Implement the central `ClientOverviewGrid` as a responsive CSS Grid using `GlassCard` components for each client.
    *   **Action:** Design client cards to include client logo/avatar, client name (bold), 2-3 key aggregated metrics (e.g., "Performance Score," "Active Campaigns," "Last Update") using `text-sm` and `font-mono`.
    *   **Action:** Integrate a small status indicator (colored dot or mini-sparkline chart, similar to the "Channels" section in the image but more data-focused) on each card to quickly convey client health.
    *   **Action:** Implement hover effects: subtle card expansion (`scale(1.01)`), and an `AnimatedButton` (e.g., "View Details") appearing with a subtle accent glow, or an animating `ArrowRight` icon.
    *   **Action:** Implement filtering and sorting options (e.g., dropdowns, tag filters) above the grid, using `framer-motion`'s `AnimatePresence` for smooth re-arrangement of the client cards.
*   **Subtask 5.2: Aggregated Performance Metrics & Team Activity Stream**
    *   **Action:** Develop components to display overall agency performance using a row of large `GlassCard`s, similar to the main metrics on the individual dashboard but representing consolidated agency data.
    *   **Action:** Implement a `TeamActivityStream` component, a scrollable list of cross-client events. Ensure it's filterable by client or activity type.
*   **Subtask 5.3: Workflow Status Overview**
    *   **Action:** Create a dedicated `GlassCard` section summarizing ongoing bulk operations and automated workflows.
    *   **Action:** Use animated progress bars (`GlassCard` style with vibrant accents) to clearly show completion status (e.g., "Bulk Video Processing: 7/12 complete").
*   **Subtask 5.4: Client Detail View Implementation (`src/app/team-dashboard/[clientId]/page.tsx`)**
    *   **Action:** Create a dynamic route (`[clientId]`) and page for individual client drill-down.
    *   **Action:** Adapt components from the individual seller dashboard (Key Metrics, Quick Actions, Performance Trends, Activity Feed) to display client-specific data within this view. This will involve passing `clientId` as a prop or context.
    *   **Action:** Ensure a prominent "Back to Team Overview" `AnimatedButton` will be present in the header or sidebar for easy navigation.
    *   **Action:** Implement a smooth "zoom-in" transition effect (`framer-motion`'s `layout` prop with custom transitions) when navigating to a client's detail view, making it feel like "entering" the client's specific workspace.

### Checkpoint 6: Integration, Testing, and Refinement (Est. 3-4 days)
---
*   **Subtask 6.1: Full Integration & Responsiveness**
    *   **Action:** Conduct comprehensive testing to ensure seamless integration of all redesigned components across the landing page, individual, and team dashboards.
    *   **Action:** Address all visual inconsistencies and layout issues across various screen sizes and devices (mobile, tablet, desktop, large monitors).
*   **Subtask 6.2: Performance Optimization**
    *   **Action:** Profile animations and general UI performance using browser developer tools. Optimize `framer-motion` animations for smooth 60fps performance, especially on lower-end devices (e.g., using `will-change` properties strategically, `requestAnimationFrame`).
    *   **Action:** Implement lazy loading for images, videos, and non-critical components (e.g., `next/image`, dynamic imports for components, `IntersectionObserver`).
*   **Subtask 6.3: Cross-Browser & Accessibility Testing**
    *   **Action:** Conduct thorough testing across major browsers (Chrome, Firefox, Edge, Safari) and their latest versions.
    *   **Action:** Perform accessibility audits (e.g., Lighthouse, Axe DevTools) to ensure WCAG AA compliance. Rectify identified issues related to color contrast, keyboard navigation, and ARIA labels.
*   **Subtask 6.4: Comprehensive UX Review & Iteration**
    *   **Action:** Conduct internal reviews with a focus on user flows: onboarding, daily use for sellers, daily use for agencies, drill-down for agencies.
    *   **Action:** Potentially conduct limited external user testing to gather feedback on clarity, ease of navigation, and overall user satisfaction for all user flows.
    *   **Action:** Systematically gather feedback and iterate on design and functionality based on findings.
    *   **Action:** Remove deprecated code, unused CSS classes, and components.
    *   **Action:** Add comprehensive comments for complex UI logic, animations, and design patterns, especially for `GlassCard`, `AnimatedButton`, and dynamic layout components.
    *   **Action:** Update `README.md` with new setup instructions, design guidelines, and important notes for contributors regarding the new UI architecture and theme.

## 4. Wireframe/Mockup Description (Conceptual)

### 4.1. Landing Page - Conceptual Wireframe
---
Imagine a dynamic, full-screen experience. The **Hero Section** (`src/app/page.tsx`) dominates the initial view with a subtle, dark, looping background video showing abstract data flow mixed with product shots. A large, bold, **glassmorphic headline** (`text-5xl Inter Bold`) dynamically switches between "Unlock E-commerce Growth" and "Scale Your Agency with AI." Below it, two distinct, pulsing `AnimatedButton` CTAs (e.g., "Start Selling Smarter" in blue, "Request Agency Demo" in purple). As the user scrolls, sections like **"Your Pain Points, Our Solutions"** (`grid grid-cols-2`) animate in. For sellers, this highlights "manual content creation" with an icon of a person struggling, then "AI-Powered Content Generation" with an icon of a smooth workflow. For agencies, "managing multiple clients" transforms into "unified client management." The **"Feature Showcase"** includes interactive mini-app simulations – a click-through for content generation, and an animated flow for bulk video processing, making the user feel the service's impact immediately. The **"Testimonials"** are a sleek, horizontal carousel of `GlassCard`s, each showing a smiling client and a significant statistic (e.g., "+45% Revenue in 3 Months"). The **"Pricing"** section uses a clear tab interface (`Individual` vs. `Agency`) to present plans in distinct `GlassCard`s.

### 4.2. Individual Dashboard - Conceptual Wireframe
---
A personal command center (`src/app/dashboard/page.tsx`). The left **Sidebar** (`src/components/common/Sidebar.tsx`) is minimal, with clean Lucide icons (e.g., `Home`, `Content`, `BarChart3` for Analytics, `Calendar` for Scheduler). The active icon emits a subtle purple glow and has a thin animated underline. The main area starts with a welcoming **Header** (`src/components/common/Header.tsx`) showing "Good morning, [User Name]!" and a pulsing notification bell. Below, four large, prominent **Key Metrics** are displayed in `GlassCard`s (`grid grid-cols-2 lg:grid-cols-4`). Each card features a `text-4xl Space Mono` number (e.g., "$27,6M"), a smaller label, and a dynamic `+X.X%` change with `TrendingUp`/`Down` icon. On hover, a tiny sparkline chart (like the "Activity" chart in the original image but minimal) appears, showing recent trends. The **Quick Actions** section (`grid grid-cols-2 md:grid-cols-3`) presents `GlassCard`s for "Upload New Video," "Optimize Listing," "Generate Ideas." On hover, the icon subtly spins, and a "Start" button appears. The **Performance Trends** area features crisp, glassmorphic line charts (`src/components/dashboard/charts.tsx`) using vibrant purple and blue accents, showing daily activity or revenue, with clean tooltips on hover (like the "32210 Views / Hour" in the original image). A small, personalized **Actionable Insights** `GlassCard` provides AI recommendations.

### 4.3. Team Dashboard - Conceptual Wireframe
---
A high-level operations desk (`src/app/team-dashboard/page.tsx`). The **Header** (`src/components/common/Header.tsx`) prominently displays "My Agency Dashboard" and a "Search Clients" input. Below, a row of large `GlassCard`s shows **Aggregated Performance Metrics** like "Total Revenue Managed" and "Total Active Campaigns." The central view is a flexible `grid` of **Client Overview Grid** `GlassCard`s. Each client card (inspired by the "Top Performers" in the image, but for clients) features the client's logo, name, 2-3 key metrics (e.g., "Overall Score: 85%," "Campaigns: 5"), and a small, color-coded status circle. On hover, the card slightly expands, and an `AnimatedButton` "View Details" appears. Clicking this button triggers a smooth, cinematic **"zoom-in" transition** (`framer-motion` shared layout animation) into the **Client Detail View** (`src/app/team-dashboard/[clientId]/page.tsx`). This client-specific view mirrors the individual seller dashboard, but all data (metrics, quick actions, charts, activity feed) is filtered for that single client. A clear "Back to Team Overview" button is always present in the header of this detailed view. A **Workflow Status Overview** `GlassCard` summarizes bulk operations with animated progress bars (e.g., "Bulk Video Processing: 7/12 complete").