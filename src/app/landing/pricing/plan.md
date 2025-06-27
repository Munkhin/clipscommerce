To create a pricing page for your Next.js project that displays three pricing tiers (Pro at $297, Team at $997, and Enterprise at $3500) with their respective benefits, styled with a dark, premium aesthetic using Tailwind CSS, and storing data in Supabase, you can follow a straightforward implementation plan. The page will feature three side-by-side sections, each detailing a tier’s price and benefits, with a clean, modular design that’s easy for another AI to implement directly into your codebase. Below, I outline the key steps and provide detailed code artifacts to ensure clarity and reusability.

### Key Points
- **Three Pricing Tiers**: Pro ($297), Team ($997), and Enterprise ($3500), displayed side by side, with benefits based on the provided product details.
- **Tech Stack**: Uses Next.js, TypeScript, Tailwind CSS, and Supabase, aligning with your specified preferences for modularity and minimal duplication.
- **Design**: A dark-themed, premium look with responsive layout, ensuring accessibility and a professional feel.
- **Data Storage**: Pricing data stored in Supabase for easy updates, fetched server-side for reliability.
- **Testing and Error Handling**: Includes Jest tests and error handling for robust implementation.

### Implementation Overview
The pricing page will be built as a Next.js page (`app/pricing/page.tsx`) that fetches tier data from Supabase and renders three `PricingCard` components. Each card displays the tier’s name, price, and benefits, with higher tiers indicating inclusion of lower-tier benefits. Tailwind CSS ensures a dark, premium aesthetic, and Jest tests verify functionality.

### Database Setup
Create two Supabase tables: `pricing_tiers` for tier details (name, price, currency, order) and `tier_benefits` for benefits linked to each tier. This structure minimizes duplication by storing only the additional benefits for higher tiers, with the UI handling the display of inherited benefits.

### Component Structure
- **PricingPage**: Fetches data and renders a responsive flex container with `PricingCard` components.
- **PricingCard**: Displays a single tier’s details, including a “Choose Plan” button styled with Tailwind CSS.
- **Supabase Queries**: Utility functions to fetch tier and benefit data, ensuring type safety with TypeScript.

### Styling
The design uses a dark color scheme (e.g., dark gray backgrounds, white text, deep blue accents) to convey a premium feel, distinct from competitors. Tailwind CSS classes ensure responsiveness, with cards stacking vertically on smaller screens.

### Artifacts
Code snippets are provided in `<xaiArtifact>` tags for key files, including SQL for database setup, the pricing page, the card component, Supabase queries, and Jest tests.

---

### Detailed Implementation Plan

This section provides a comprehensive guide to implementing the pricing page, ensuring modularity, reusability, and alignment with your tech stack (Next.js v15.3.2, React v19.1.0, TypeScript, Tailwind CSS, Supabase). The plan includes step-by-step instructions, code artifacts, and considerations for error handling and testing, making it actionable for another AI to integrate directly into your codebase.

#### 1. Set Up Supabase Database
To store pricing data, create two tables in Supabase:
- **pricing_tiers**: Stores tier details (id, name, price, currency, order).
- **tier_benefits**: Stores benefits linked to each tier, with descriptions based on the provided product details.

**Database Schema and Data**:
- The `pricing_tiers` table includes an `order` column to define the hierarchy (Pro: 1, Team: 2, Enterprise: 3).
- The `tier_benefits` table links benefits to their respective tiers, storing only the benefits introduced at each tier to avoid duplication.
- Benefits are derived from the provided details, with higher tiers (Team, Enterprise) including additional benefits on top of lower tiers.

```sql
-- Create pricing_tiers table
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

-- Create tier_benefits table
CREATE TABLE tier_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_id UUID REFERENCES pricing_tiers(id),
  description TEXT NOT NULL
);

-- Insert pricing tiers
INSERT INTO pricing_tiers (id, name, price, currency, "order") VALUES
  ('tier-pro-id', 'Pro', 297, 'USD', 1),
  ('tier-team-id', 'Team', 997, 'USD', 2),
  ('tier-enterprise-id', 'Enterprise', 3500, 'USD', 3);

-- Insert benefits for Pro tier
INSERT INTO tier_benefits (tier_id, description) VALUES
  ('tier-pro-id', 'Pitching audio, captions, hashtags: Content acceleration optimizing engine that accelerates platform-specific formatting and technical aspects. Saves numerous hours of research for every post ($1,000 value). Performs better than competitors ($1,000 value).'),
  ('tier-pro-id', 'Posting at the right time: Precise automated posting. Ensures content reaches the most audience even if you have something better to do ($600 value). Offers freedom to live life.'),
  ('tier-pro-id', 'Content generation, algorithm anxiety, analytics review: Viral cycle of improvements. Consistently improves posts without endless analytics ($500 value). Generates top-performing content ideas without the stress and anxiety of underperformance.');

-- Insert additional benefits for Team tier
INSERT INTO tier_benefits (tier_id, description) VALUES
  ('tier-team-id', 'Comprehensive Field Research: Distills all competitor tactics for use without a second spent ($500 value). Compiles all marketing specific to your niche ($500 value).');

-- Insert additional benefits for Enterprise tier
INSERT INTO tier_benefits (tier_id, description) VALUES
  ('tier-enterprise-id', 'Hash generator, Template generator: Boosts retention by 50% ($200 value). Helps avoid the need to figure out what works when boosting sales.'),
  ('tier-enterprise-id', 'X 10 for agencies + Custom AI model: Learns your brand voice ($1,000 value).');
```

#### 2. Fetch Data from Supabase
Create a utility file to handle Supabase queries, fetching all pricing tiers and their benefits. Use TypeScript for type safety and include error handling to manage potential database issues.

```typescript
import { createServerClient } from "@/lib/supabase/server";

export interface Tier {
  id: string;
  name: string;
  price: number;
  currency: string;
  order: number;
  benefits: { description: string }[];
}

// Fetch all pricing tiers with their benefits
export async function getPricingTiers(): Promise<Tier[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select(`
      id,
      name,
      price,
      currency,
      order,
      tier_benefits (description)
    `)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching pricing tiers:", error);
    return [];
  }

  return data.map((tier) => ({
    id: tier.id,
    name: tier.name,
    price: tier.price,
    currency: tier.currency,
    order: tier.order,
    benefits: tier.tier_benefits,
  }));
}
```

#### 3. Create the Pricing Page
In `app/pricing/page.tsx`, use `getServerSideProps` to fetch pricing data server-side, ensuring fresh data on each request. Render a flex container with three `PricingCard` components, passing each tier’s data and the previous tier’s name (if applicable) to indicate inherited benefits.

```typescript
import { getPricingTiers } from "@/lib/supabase/queries";
import PricingCard from "@/components/pricing/PricingCard";

interface Tier {
  id: string;
  name: string;
  price: number;
  currency: string;
  order: number;
  benefits: { description: string }[];
}

export async function getServerSideProps() {
  const tiers = await getPricingTiers();
  return { props: { tiers } };
}

export default function PricingPage({ tiers }: { tiers: Tier[] }) {
  if (tiers.length === 0) {
    return (
      <div className="text-red-500 text-center p-4">
        Error loading pricing information. Please try again later.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-white">
        Choose Your Plan
      </h1>
      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        {tiers.map((tier, index) => {
          const previousTierName = index > 0 ? tiers[index - 1].name : null;
          return (
            <PricingCard
              key={tier.id}
              tier={tier}
              previousTierName={previousTierName}
            />
          );
        })}
      </div>
    </div>
  );
}
```

#### 4. Implement the PricingCard Component
The `PricingCard` component (`components/pricing/PricingCard.tsx`) displays a single tier’s details in a card format. It shows the tier name, price, benefits, and a “Choose Plan” button. For Team and Enterprise tiers, it includes a note about inheriting lower-tier benefits.

```typescript
import { Button } from "@/components/ui/button";

interface Tier {
  name: string;
  price: number;
  currency: string;
  benefits: { description: string }[];
}

interface PricingCardProps {
  tier: Tier;
  previousTierName: string | null;
}

export default function PricingCard({ tier, previousTierName }: PricingCardProps) {
  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full md:w-1/3">
      <h2 className="text-2xl font-bold mb-4 text-center">{tier.name}</h2>
      <p className="text-4xl font-bold mb-6 text-center">
        {tier.currency} {tier.price}
      </p>
      <ul className="space-y-2 mb-6">
        {previousTierName && (
          <li className="text-gray-400 italic">
            Everything in {previousTierName} plus:
          </li>
        )}
        {tier.benefits.map((benefit, index) => (
          <li key={index} className="flex items-start">
            <span className="mr-2 text-blue-400">✓</span>
            <span>{benefit.description}</span>
          </li>
        ))}
      </ul>
      <Button className="bg-blue-600 hover:bg-blue-700 w-full text-white py-2 rounded">
        Choose Plan
      </Button>
    </div>
  );
}
```

#### 5. Style with Tailwind CSS
The design uses a dark color scheme to convey a premium, professional feel:
- **Background**: Dark gray (`bg-gray-900`) for the page, with slightly lighter gray (`bg-gray-800`) for cards.
- **Text**: White (`text-white`) for readability, with gray (`text-gray-400`) for secondary text.
- **Accents**: Deep blue (`bg-blue-600`, `hover:bg-blue-700`) for buttons and checkmarks (`text-blue-400`) to highlight benefits.
- **Layout**: Flexbox (`flex-col md:flex-row`) ensures side-by-side cards on desktop and stacked cards on mobile for responsiveness.

#### 6. Error Handling
- **Supabase Errors**: The `getPricingTiers` function returns an empty array if the query fails, and the `PricingPage` component displays an error message.
- **UI Feedback**: A user-friendly error message is shown if no tiers are loaded, ensuring a graceful fallback.

#### 7. Testing
Create a Jest test file to verify that the `PricingPage` and `PricingCard` components render correctly, including tier details and error states.

```typescript
import { render, screen } from "@testing-library/react";
import PricingPage from "./page";

const mockTiers = [
  {
    id: "1",
    name: "Pro",
    price: 297,
    currency: "USD",
    order: 1,
    benefits: [{ description: "Benefit 1" }, { description: "Benefit 2" }],
  },
  {
    id: "2",
    name: "Team",
    price: 997,
    currency: "USD",
    order: 2,
    benefits: [{ description: "Benefit 3" }],
  },
];

describe("PricingPage", () => {
  it("renders pricing tiers correctly", () => {
    render(<PricingPage tiers={mockTiers} />);
    expect(screen.getByText("Choose Your Plan")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("USD 297")).toBeInTheDocument();
    expect(screen.getByText("Everything in Pro plus:")).toBeInTheDocument();
  });

  it("displays error message when no tiers are loaded", () => {
    render(<PricingPage tiers={[]} />);
    expect(
      screen.getByText("Error loading pricing information. Please try again later.")
    ).toBeInTheDocument();
  });
});
```

#### 8. Deployment and Testing
- **Local Testing**: Run `npm run dev` to test the page locally.
- **Environment Variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local` for Supabase connectivity ([Supabase Environment Setup](https://supabase.com/docs/guides/getting-started)).
- **Database Initialization**: Execute the SQL script to set up tables and insert data.
- **Jest Tests**: Run `npm run test` to verify component rendering and error handling.
- **Styling Customization**: Adjust Tailwind CSS classes in `tailwind.config.js` if specific shades are needed (e.g., custom blue for accents).

#### Additional Considerations
- **Modularity**: The `PricingCard` component is reusable and can be adapted for other pages if needed.
- **Reusability**: Supabase queries are centralized in `lib/supabase/queries.ts`, making them reusable across the application.
- **Scalability**: The database schema supports adding new tiers or benefits without code changes.
- **Accessibility**: Use Radix UI’s `Button` component for accessible buttons, and ensure sufficient color contrast for readability.
- **Performance**: Server-side rendering with `getServerSideProps` ensures fast initial loads, but consider Incremental Static Regeneration (ISR) with `getStaticProps` and `revalidate` for static sites ([Next.js ISR](https://nextjs.org/docs/app-router/building-your-application/data-fetching/revalidating)).

#### Color Scheme Details
The chosen color scheme differentiates from competitors by using:
- **Dark Gray (`#1a1a1a`)**: Page background for a sleek, modern look.
- **Medium Gray (`#2a2a2a`)**: Card backgrounds for subtle contrast.
- **White (`#ffffff`)**: Primary text for clarity.
- **Deep Blue (`#0052cc`)**: Accents for buttons and highlights, evoking trust and professionalism.
These colors are implemented via Tailwind CSS classes (`bg-gray-900`, `bg-gray-800`, `text-white`, `bg-blue-600`). You can extend the Tailwind configuration to include custom colors if needed ([Tailwind Custom Colors](https://tailwindcss.com/docs/customizing-colors)).

#### Benefits Display
- **Pro Tier**: Lists three benefits related to content creation, posting optimization, and analytics.
- **Team Tier**: Shows “Everything in Pro plus:” followed by one additional benefit (field research).
- **Enterprise Tier**: Shows “Everything in Team plus:” followed by two additional benefits (hash/template generators, custom AI model).
This approach clearly communicates the value hierarchy while keeping the UI clean.

#### Potential Enhancements
- **Dynamic Pricing**: If prices vary (e.g., monthly vs. yearly), add a toggle and update the `pricing_tiers` table with a `billing_period` column.
- **Call-to-Action**: The “Choose Plan” button can link to a Stripe checkout page using your existing Stripe integration ([Stripe Checkout](https://stripe.com/docs/payments/checkout)).
- **Animations**: Add subtle Framer Motion animations for card entrances to enhance the premium feel ([Framer Motion](https://www.framer.com/motion/)).
- **Highlighting**: Highlight the Team tier (e.g., with a `border-blue-600`) 