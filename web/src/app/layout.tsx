import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { RouteAlert } from "@/components/route-alert";

export const metadata: Metadata = {
  title: "RFID Attendance Management System",
  description: "Next.js and Supabase-powered RFID attendance system"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <RouteAlert />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
