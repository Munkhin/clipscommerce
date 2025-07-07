'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Zap, Target } from 'lucide-react';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasBeenWelcomed = localStorage.getItem('hasBeenWelcomed');
    if (!hasBeenWelcomed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasBeenWelcomed', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome to Clips Commerce!</DialogTitle>
          <DialogDescription className="text-center">
            Here are a few things to get you started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-4">
            <Rocket className="h-8 w-8 text-mint" />
            <div>
              <h3 className="font-semibold">Upload Your First Video</h3>
              <p className="text-sm text-muted-foreground">Head over to the Accelerate page to upload your first product video.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Zap className="h-8 w-8 text-mint" />
            <div>
              <h3 className="font-semibold">Generate AI Content</h3>
              <p className="text-sm text-muted-foreground">Use our AI tools to generate viral content ideas and scripts.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Target className="h-8 w-8 text-mint" />
            <div>
              <h3 className="font-semibold">Schedule Your Posts</h3>
              <p className="text-sm text-muted-foreground">Plan your content calendar and automate your social media presence.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full bg-[#8D5AFF] text-white hover:bg-[#8D5AFF]/90">Get Started!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
