"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaFacebookF } from "react-icons/fa";

export default function SignupPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row bg-[#1c1f1e] overflow-x-hidden">
      
      {/* MOBILE HEADER: Logo and Heading (Visible ONLY on mobile/tablet) */}
      <div className="lg:hidden w-full p-6 text-center space-y-4">
        <div className="text-white text-3xl font-bold tracking-tight">
          momentm
        </div>
        <h1 className="text-white text-3xl font-bold font-satoshi leading-tight px-4">
          Level Up <span className="italic font-medium text-gray-300">Your Life</span> <br />
          Like It&apos;s a Game
        </h1>
      </div>

      {/* DESKTOP LEFT: Hero Section (Visible ONLY on Desktop) */}
      <section
        className="relative hidden lg:flex flex-[1.2] bg-cover bg-center"
        style={{ backgroundImage: "url('/cyclist.png')" }}
      >
        <div className="absolute top-8 left-8 z-20 text-white text-4xl font-bold tracking-tight">
          momentm
        </div>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex items-center justify-center px-16 text-center">
          <h1 className="text-white text-7xl font-bold font-satoshi leading-[1.1] max-w-2xl">
            Level Up <span className="italic font-medium">Your Life</span> <br />
            Like It&apos;s a Game
          </h1>
        </div>
      </section>

      {/* RIGHT: Signup Section (Always visible) */}
      <section className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-12">
        <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl">
          
          <header className="mb-6 sm:mb-8 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold font-rethink-sans text-black mb-2">
              Create an account
            </h2>
            <p className="text-sm text-gray-500 font-rethink-sans">
              Start your personalized, AI-powered fitness journey
            </p>
          </header>

          <form className="space-y-3 sm:space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="First Name"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-rethink-sans text-black focus:ring-2 focus:ring-black/5 outline-none"
              />
              <input
                type="text"
                placeholder="Last Name"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-rethink-sans text-black focus:ring-2 focus:ring-black/5 outline-none"
              />
            </div>

            <input
              type="email"
              placeholder="Email Address"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-rethink-sans text-black focus:ring-2 focus:ring-black/5 outline-none"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-rethink-sans text-black focus:ring-2 focus:ring-black/5 outline-none"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-rethink-sans text-black focus:ring-2 focus:ring-black/5 outline-none"
            />

            <label className="flex items-start gap-3 text-xs text-gray-500 py-1 cursor-pointer font-rethink-sans">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-black shrink-0" />
              <span>
                Agree to <button type="button" className="text-blue-600 font-semibold underline">Terms</button> & <button type="button" className="text-blue-600 font-semibold underline">Privacy</button>
              </span>
            </label>

            <button
              type="submit"
              className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-[0.98] font-rethink-sans shadow-lg shadow-black/10 mt-2"
            >
              Sign Up
            </button>
          </form>

          <p className="text-sm text-gray-600 text-center mt-6 font-rethink-sans">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-blue-600 font-bold hover:underline"
            >
              Login
            </button>
          </p>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-rethink-sans">OR</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-black hover:bg-gray-50 transition-colors font-rethink-sans">
              <FaGoogle className="text-[#DB4437]" /> Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-black hover:bg-gray-50 transition-colors font-rethink-sans">
              <FaFacebookF className="text-[#4267B2]" /> Facebook
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}