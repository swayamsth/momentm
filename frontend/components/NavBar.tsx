"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`bg-secondary text-white shadow-md sticky top-0 z-50 transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-xl md:text-2xl font-bold hover:opacity-90 transition-opacity">
            momentm
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            <Link href="/ai-insight" className="hover:underline transition-all">
              AI Insight
            </Link>
            <Link href="/signup" className="hover:underline transition-all">
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center">
              <span className={`block h-0.5 w-6 bg-white transition-transform duration-300 ${isOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`}></span>
              <span className={`block h-0.5 w-6 bg-white transition-opacity duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`block h-0.5 w-6 bg-white transition-transform duration-300 ${isOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`}></span>
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-white/20 mt-4">
            <div className="flex flex-col space-y-3">
              <Link
                href="/ai-insight"
                className="hover:underline transition-all py-2"
                onClick={() => setIsOpen(false)}
              >
                AI Insight
              </Link>
              <Link
                href="/signup"
                className="hover:underline transition-all py-2"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}