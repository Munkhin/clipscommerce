'use client';

import { Button } from "@/components/ui/button";
import { Tier } from "@/lib/supabase/queries/pricing";
import { CheckCircle2, Zap } from "lucide-react";

interface PricingCardProps {
  tier: Tier & {
    stripePriceId?: string;
  };
  previousTierName: string | null;
}

export default function PricingCard({ tier, previousTierName }: PricingCardProps) {
  return (
    <div className="relative bg-gray-800/50 hover:bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-xl p-8 transition-all duration-300 h-full">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-white">
            {tier.currency} {tier.price}
          </span>
          <span className="text-gray-400 mb-1">/month</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {previousTierName && (
          <li className="text-gray-400 text-sm">
            Includes all {previousTierName} features +
          </li>
        )}
        {tier.benefits.map((benefit, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
            <span className="text-gray-300">{benefit.description}</span>
          </li>
        ))}
      </ul>

      <a 
        href={tier.stripePriceId ? `/api/checkout?price_id=${tier.stripePriceId}` : '/dashboard'}
        className="w-full block"
      >
        <Button className="w-full group" size="lg">
          <span className="bg-clip-text text-transparent text-[#3D7BF4]">
            {tier.stripePriceId ? 'Get Started' : 'Contact Sales'}
          </span>
          <Zap className="w-4 h-4 ml-2 text-[#3D7BF4] group-hover:text-[#3D7BF4] transition-colors" />
        </Button>
      </a>
      {tier.stripePriceId && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Start your journey today
        </p>
      )}

      {tier.name === 'Enterprise' && (
        <div className="absolute top-4 right-4 bg-gray-900/50 px-3 py-1 rounded-full text-sm text-gray-300">
          Custom Solutions
        </div>
      )}
    </div>
  );
}
