import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-graphite to-graphite-dark text-white">
      <div className="max-w-2xl w-full p-8 rounded-xl bg-graphite-light/10 backdrop-blur-sm border border-mint/20 text-center">
        <h1 className="text-6xl font-bold text-mint mb-4">404</h1>
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild className="bg-mint text-graphite hover:bg-mint/90">
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-mint/50 text-mint hover:bg-mint/10">
            <Link href="/contact">
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
