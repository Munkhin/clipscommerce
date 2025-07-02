import Link from 'next/link';
import { BouncingButton } from '@/components/ui/bouncing-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-graphite to-graphite-dark text-white">
      <AnimatedCard className="w-full max-w-md bg-graphite-light/10 backdrop-blur-sm border-mint/20 text-center">
        <CardHeader>
          <div className="mx-auto bg-mint/10 p-4 rounded-full">
            <SearchX className="w-16 h-16 text-mint" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mt-4">Page Not Found</CardTitle>
          <CardDescription className="text-muted-foreground">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-9xl font-bold text-mint">404</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
          <BouncingButton asChild className="bg-mint text-graphite hover:bg-mint/90">
            <Link href="/">
              Go to Homepage
            </Link>
          </BouncingButton>
          <BouncingButton asChild variant="outline" className="border-mint/50 text-mint hover:bg-mint/10 hover:text-mint">
            <Link href="/contact">
              Contact Support
            </Link>
          </BouncingButton>
        </CardFooter>
      </AnimatedCard>
    </div>
  );
}
