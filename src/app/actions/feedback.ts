'use server';

export async function submitFeedback(feedback: string) {
  // TODO: Send email to owner or store in DB
  console.log('User feedback:', feedback);
  return { success: true };
} 