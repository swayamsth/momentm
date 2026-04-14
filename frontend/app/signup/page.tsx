"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row overflow-hidden relative">
      
      {/* Logo */}
      <div className="absolute top-6 left-6 z-20 text-white text-3xl font-bold">
        momentm
      </div>

      {/* LEFT: Hero Section - Hidden on mobile, flex on desktop */}
      <section
        className="relative hidden lg:flex flex-1 bg-cover bg-center"
        style={{ backgroundImage: "url('/cyclist.png')" }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Hero Text with Satoshi Font */}
        <div className="relative z-10 h-full flex items-center justify-center px-8 text-center">
          <h1 className="text-white text-4xl sm:text-5xl lg:text-7xl font-bold font-satoshi leading-tight max-w-2xl">
            Level Up <span className="italic">Your Life</span> <br />
            Like It&apos;s a Game
          </h1>
        </div>
      </section>

      {/* RIGHT: Signup Section */}
      <section className="flex-1 bg-[#1c1f1e] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 sm:p-10 shadow-2xl">
          
          {/* Header with Rethink Sans */}
          <h2 className="text-2xl sm:text-3xl font-bold font-rethink-sans mb-2 text-black">
            Create an account
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-rethink-sans mb-6">
            Start your personalized, AI-powered fitness journey
          </p>

          {/* Form */}
          <form className="space-y-3">
            {/* Name row - Stacks on mobile, side-by-side on sm screens */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="First Name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-3 text-sm font-rethink-sans text-black"
              />
              <input
                type="text"
                placeholder="Last Name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-3 text-sm font-rethink-sans text-black"
              />
            </div>

            <input
              type="email"
              placeholder="hello123@gmail.com"
              className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm font-rethink-sans text-black"
            />

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm font-rethink-sans text-black"
            />

            <input
              type="password"
              placeholder="Confirm password"
              className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm font-rethink-sans text-black"
            />

            {/* Terms */}
            <label className="flex items-start gap-2 text-xs text-gray-600 mt-2 font-rethink-sans">
              <input type="checkbox" className="mt-1" />
              <span>
                By signing up, you agree to our{" "}
                <span className="text-blue-600 cursor-pointer hover:underline">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-blue-600 cursor-pointer hover:underline">
                  Privacy Policy
                </span>.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="mt-4 w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-black/90 transition font-rethink-sans"
            >
              Create a new account
            </button>
          </form>

          {/* Login Redirect */}
          <p className="text-sm sm:text-base text-gray-600 text-center mt-5 font-rethink-sans">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-blue-600 font-medium hover:underline"
            >
              Login
            </button>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6 text-xs text-gray-400 font-rethink-sans uppercase tracking-wider">
            <div className="flex-1 h-px bg-gray-300" />
            or register with
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* Social Buttons with standard <img> or Next/Image */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2.5 text-sm hover:bg-gray-50 transition font-rethink-sans text-black"
            >
              <Image src="/google-logo.png" alt="Google" width={18} height={18} />
              Google
            </button>

            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2.5 text-sm hover:bg-gray-50 transition font-rethink-sans text-black"
            >
              <Image src="/facebook-logo.png" alt="Facebook" width={18} height={18} />
              Facebook
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}