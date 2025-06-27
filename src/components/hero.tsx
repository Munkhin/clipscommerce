import Link from "next/link";
import { ArrowRight, Check, Zap, BarChart, TrendingUp, Users } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-dominator-black">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] [mask-image:radial-gradient(ellipse_at_center,white,transparent_90%)]"></div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-dominator-blue/5 via-transparent to-dominator-magenta/5"></div>

      <div className="relative pt-24 pb-20 sm:pt-28 sm:pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-dominator-blue/10 text-dominator-blue text-sm font-medium mb-6 border border-dominator-blue/20">
              <Zap className="w-4 h-4 mr-2" />
              <span>Join 10,000+ creators growing with Dominator</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-dominator-light mb-6">
              The <span className="text-dominator-blue">Dominator Loop</span>: Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-dominator-blue to-dominator-magenta">
                Viral Growth Engine
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-dominator-light/80 max-w-3xl mx-auto mb-10 leading-relaxed">
              Our proprietary 4-step system guarantees <span className="font-medium text-dominator-green">30%+ higher view duration</span>, 
              <span className="font-medium text-dominator-blue"> 2x faster growth</span>, and <span className="font-medium text-dominator-magenta">3x your engagement</span> 
              -or your next month is on us.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/dashboard"
                className="group relative flex items-center justify-center px-8 py-4 text-lg font-medium text-dominator-black bg-gradient-to-r from-dominator-blue to-dominator-green hover:from-dominator-blue/90 hover:to-dominator-green/90 rounded-lg hover:shadow-glow-blue transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Start Your Free 14-Day Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center px-8 py-4 text-lg font-medium text-dominator-light hover:text-dominator-blue transition-colors group"
              >
                <span className="group-hover:underline">See How It Works</span> <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            {/* Social Proof & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { 
                  icon: BarChart, 
                  stat: '30%+', 
                  label: 'Higher View Duration',
                  desc: 'AI-optimized hooks keep viewers watching longer',
                  color: 'blue'
                },
                { 
                  icon: TrendingUp, 
                  stat: '2x', 
                  label: 'Faster Growth',
                  desc: 'Ride trends before they peak with our early detection',
                  color: 'green'
                },
                { 
                  icon: Users, 
                  stat: '3x', 
                  label: 'Engagement Score',
                  desc: 'Our proprietary metric predicts virality potential',
                  color: 'magenta'
                },
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-6 bg-dominator-dark/80 backdrop-blur-sm rounded-xl border border-dominator-dark/50 hover:border-dominator-${item.color}/30 transition-all duration-300 text-left group`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-dominator-dark/50 border border-dominator-${item.color}/20 flex items-center justify-center mb-4 group-hover:border-dominator-${item.color}/50 transition-colors`}>
                    <item.icon className={`w-6 h-6 text-dominator-${item.color}`} />
                  </div>
                  <p className={`text-3xl font-bold mb-1 text-dominator-${item.color}`}>{item.stat}</p>
                  <p className="text-sm font-medium text-dominator-light/90 mb-2">{item.label}</p>
                  <p className="text-sm text-dominator-light/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guarantee Badge */}
      <div className="relative bg-dominator-dark/80 backdrop-blur-sm py-4 border-t border-dominator-dark">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-dominator-light/70">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-dominator-green mr-2" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-dominator-light/20"></div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-dominator-green mr-2" />
              <span>No credit card required</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-dominator-light/20"></div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-dominator-green mr-2" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
