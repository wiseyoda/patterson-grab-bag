import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-lg min-h-screen flex items-center justify-center">
      <Card className="w-full">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
