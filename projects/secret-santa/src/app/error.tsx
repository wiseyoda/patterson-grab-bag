"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg min-h-screen flex items-center justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            We encountered an unexpected error. Please try again.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          )}
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
