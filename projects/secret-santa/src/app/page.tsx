"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_RULES = `🎅 1. One Name, One Gift: You have one mission. Buy one gift. Don't overcomplicate it.
🤫 2. Shhh! It's a Secret: If you spill the beans, you're on the Naughty List. Forever.
💰 3. Respect the Budget: Stick to the limit. We love you, but not *that* much.
🧾 4. Receipts Required: Just in case they already have a singing fish.
🎁 5. Have Fun: Get creative! But remember, we have to look you in the eye next year.`;

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState(DEFAULT_RULES);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      budget: formData.get("budget") as string,
      eventDate: formData.get("eventDate") as string,
      rules: formData.get("rules") as string,
    };

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create event");
      }

      const result = await response.json();
      router.push(`/admin/${result.adminToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-red-700 mb-2">Secret Santa</h1>
        <p className="text-gray-600">Organize your gift exchange with ease</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Gift Exchange</CardTitle>
          <CardDescription>
            Set up your Secret Santa event and invite participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Family Christmas 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                name="budget"
                placeholder="$25"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">Rules & Guidelines</Label>
              <Textarea
                id="rules"
                name="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={6}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Already have an event? Use your admin link to manage it.</p>
      </div>
    </main>
  );
}
