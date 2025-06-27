export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-graphite to-graphite-dark">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-mint/30 border-t-mint rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
