import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-lg min-h-screen flex items-center justify-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🎄</div>
          <CardTitle>Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
