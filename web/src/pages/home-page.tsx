import { useLocation } from "wouter";
import React from "react";
import { Ticket, ArrowRight } from "lucide-react";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Welcome to E-Ticket System
      </h1>
      <p className="max-w-[600px] text-lg text-muted-foreground">
        A modern solution for public transport ticketing and revenue management.
        Issue tickets, track revenue, and monitor station activity seamlessly.
      </p>
      
      <div className="flex gap-4 mt-8">
        <button
          onClick={() => setLocation("/ticketing")}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Ticket className="mr-2 h-4 w-4" />
          Issue Ticket
        </button>
        <button
          onClick={() => setLocation("/overview")}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          View Overview
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
