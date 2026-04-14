"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaFacebookF } from "react-icons/fa";

export default function SignupPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row overflow-hidden relative bg-[#1c1f1e]">
      
      {/* Floating Logo */}
      <div className="absolute top-6 left-6 z-20 text-white text-3xl font-bold tracking-tight">
        momentm
      </div>

      {/* LEFT: Hero Section - Cyclist Background */}
      <section
        className="relative hidden lg:flex flex-[1.2] bg-cover bg-center"
        style={{ backgroundImage: "url('/cyclist.png')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex items-center justify-center px-16 text-center">
          <h1 className="text-white text-4xl lg:text-7xl font-bold font-satoshi leading-[1.1] max-w-2xl">
            Level Up <span className="italic font-medium">Your Life</span> <br />
            Like It&apos;s a Game
          </h1>
        </div>
      </section>

      {/* RIGHT: Signup Section */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-12 shadow-2xl">
          
          <header className="mb-8">
            <h2 className="text-3xl font-bold font-rethink-sans text-black mb-2">
              Create an account
            </h2>
            <p className="text-sm text-gray-500 font-rethink-sans">
              Start your personalized, AI-powered fitness journey
            </p>
          </header>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="First Name"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-rethink-sans text-black outline-none focus:ring-2 focus:ring-black/5 transition-all"
              />
              <input
                type="text"
                placeholder="Last Name"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-rethink-sans text-black outline-none focus:ring-2 focus:ring-black/5 transition-all"
              />
            </div>

            <input
              type="email"
              placeholder="hello123@gmail.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-rethink-sans text-black outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-rethink-sans text-black outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />

            <input
              type="password"
              placeholder="Confirm password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-rethink-sans text-black outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />

            <label className="flex items-start gap-3 text-xs text-gray-500 py-2 cursor-pointer font-rethink-sans">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-black" />
              <span className="leading-normal">
                By signing up, you agree to our{" "}
                <button type="button" className="text-blue-600 font-semibold hover:underline">Terms</button> and{" "}
                <button type="button" className="text-blue-600 font-semibold hover:underline">Privacy Policy</button>.
              </span>
            </label>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-[0.98] font-rethink-sans mt-2 shadow-lg shadow-black/10"
            >
              Create a new account
            </button>
          </form>

          <p className="text-sm text-gray-600 text-center mt-8 font-rethink-sans">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-blue-600 font-bold hover:underline"
            >
              Login
            </button>
          </p>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-rethink-sans">or register with</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Social Buttons with React Icons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-black hover:bg-gray-50 transition-colors font-rethink-sans group">
              <FaGoogle className="text-[#DB4437] text-lg transition-transform group-hover:scale-110" />
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-black hover:bg-gray-50 transition-colors font-rethink-sans group">
              <FaFacebookF className="text-[#4267B2] text-lg transition-transform group-hover:scale-110" />
              Facebook
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}