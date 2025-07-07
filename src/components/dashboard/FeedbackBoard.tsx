import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';

export default function FeedbackBoard() {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) {
        setSubmitted(true);
        setFeedback('');
        toast({ title: 'Thank you!', description: 'Your feedback has been sent.' });
      } else {
        toast({ title: 'Error', description: 'Failed to send feedback.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send feedback.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Thank you for your feedback!</h2>
        <p className="text-muted-foreground">We appreciate your input to improve the dashboard.</p>
        <Button className="mt-6" onClick={() => setSubmitted(false)}>Send more feedback</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4" aria-label="Feedback form">
      <h2 className="text-2xl font-bold mb-2">Feedback</h2>
      <Label htmlFor="feedback-textarea">Your feedback</Label>
      <Textarea
        id="feedback-textarea"
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="What can we improve? What do you love?"
        required
        minLength={3}
        maxLength={1000}
        className="resize-vertical min-h-[100px]"
        aria-required="true"
        aria-label="Your feedback"
        disabled={submitting}
      />
      <Button type="submit" disabled={submitting || !feedback.trim()} className="w-full">
        {submitting ? 'Sending...' : 'Send Feedback'}
      </Button>
    </form>
  );
} 