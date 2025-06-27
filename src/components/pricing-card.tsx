"use client";

import { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PricingCard({
  item,
  user,
}: {
  item: any;
  user: User | null;
}) {
  // Handle checkout process
  const handleCheckout = async (priceId: string) => {
    if (!user) {
      // Redirect to login if user is not authenticated
      window.location.href = "/sign-in?redirect=pricing";
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-checkout",
        {
          body: {
            price_id: priceId,
            user_id: user.id,
            return_url: `${window.location.origin}/dashboard`,
          },
          headers: {
            "X-Customer-Email": user.email || "",
          },
        },
      );

      if (error) {
        throw error;
      }

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  // Define features based on plan tier
  const getPlanFeatures = (planName: string | undefined) => {
    const freeFeatures = [
      "Idea Generator (3 uses)",
      "10 autoposts/month",
    ];

    const proFeatures = [
      "Viral Blitz Cycle Framework",
      "Idea Generator Framework (unlimited)",
      "Unlimited posts",
      "1 set of accounts",
      "E-commerce integration",
    ];

    const teamFeatures = [
      "Everything in Pro",
      "Manage unlimited accounts",
      "Brand Voice AI (for consistency)",
      "Team collaboration mode",
      "Advanced analytics & reporting",
    ];

    // Check if planName exists before calling toLowerCase
    if (!planName) return freeFeatures;

    const planNameLower = planName.toLowerCase();
    if (planNameLower.includes("free")) return freeFeatures;
    if (planNameLower.includes("pro")) return proFeatures;
    if (planNameLower.includes("team")) return teamFeatures;
    return freeFeatures;
  };

  const features = getPlanFeatures(item?.name);

  // Format price display based on interval
  const formatPrice = () => {
    if (!item?.amount) return "$0";

    const price = item.amount / 100;
    const interval = item?.interval?.toLowerCase() || "month";

    if (interval === "year") {
      return `${price} / year`;
    } else {
      return `${price} / month`;
    }
  };

  // Calculate monthly equivalent for yearly plans
  const monthlyEquivalent = () => {
    if (
      !item?.amount ||
      !item?.interval ||
      item.interval.toLowerCase() !== "year"
    )
      return null;

    const yearlyPrice = item.amount / 100;
    const monthlyPrice = Math.round((yearlyPrice / 12) * 100) / 100;
    const currency = item?.currency?.toLowerCase() || "usd";
    const currencySymbol =
      currency === "eur" ? "€" : currency === "gbp" ? "£" : "$";

    return `${currencySymbol}${monthlyPrice}/mo`;
  };

  return (
    <Card
      className={`w-full max-w-[350px] relative overflow-hidden mb-6 bg-dominator-dark/80 backdrop-blur-sm border ${item?.popular ? "border-dominator-blue shadow-glow-blue" : "border-dominator-dark/50"} transition-all duration-300 hover:shadow-glow-blue hover:border-dominator-blue/50`}
    >
      {item?.popular && (
        <div className="absolute inset-0 bg-gradient-to-br from-dominator-blue/5 via-transparent to-dominator-magenta/5" />
      )}
      <CardHeader className="relative">
        {item?.popular && (
          <div className="inline-flex items-center px-4 py-1.5 text-xs font-medium text-dominator-light bg-gradient-to-r from-dominator-blue to-dominator-magenta rounded-full w-fit mb-4">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span>Most Popular</span>
          </div>
        )}
        <CardTitle className="text-2xl font-bold tracking-tight text-dominator-light">
          {item?.name || "Plan"}
        </CardTitle>
        <div className="mt-2">
          <span className="text-4xl font-bold bg-gradient-to-r from-dominator-blue to-dominator-magenta bg-clip-text text-transparent">
            {formatPrice()}
          </span>
          {monthlyEquivalent() && (
            <CardDescription className="text-dominator-light/60">
              ({monthlyEquivalent()} billed annually)
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <ul className="space-y-3 mt-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start group">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-dominator-dark border border-dominator-blue/20 group-hover:border-dominator-blue/50 flex items-center justify-center mr-2 mt-0.5 transition-colors">
                <Check className="h-3 w-3 text-dominator-blue opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-dominator-light/80 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="relative">
        <Button
          onClick={async () => {
            if (item?.id) {
              await handleCheckout(item.id);
            }
          }}
          className={`w-full py-6 text-lg font-medium transition-all duration-300 ${
            item?.popular 
              ? 'bg-gradient-to-r from-dominator-blue to-dominator-magenta text-dominator-black hover:shadow-glow-blue' 
              : 'bg-dominator-dark/50 text-dominator-light border border-dominator-blue/30 hover:border-dominator-blue/70 hover:bg-dominator-dark/80'
          }`}
          disabled={!item?.id}
        >
          {item?.popular ? 'Get Started' : 'Choose Plan'}
          <ArrowRight className={`ml-2 h-4 w-4 transition-transform ${
            item?.popular ? 'group-hover:translate-x-1' : 'group-hover:translate-x-0.5'
          }`} />
        </Button>
      </CardFooter>
    </Card>
  );
}
