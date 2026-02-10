import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

const NavBar = () => {
  return (
    <header>
      <nav className="flex items-center justify-between m-3 text-black font-satoshi text-sm md:text-base xl:text-xl 2xl:text-2xl">
        <Link href="/" className="text-3xl font-bold">
          momentm
        </Link>
        <ul className="flex gap-8 font-light">
          <Link href="/about">about</Link>
          <Link href="/features">features</Link>
          <Link href="/subscription">subscription</Link>
          <Link href="/contact">contact</Link>
        </ul>
        <Link href="/login" className="flex gap-4 items-center w-fit">
          <p className="font-light">log in</p>
          <FiArrowRight className="bg-secondary text-white rounded-full w-8 h-8 p-1" />
        </Link>
      </nav>
    </header>
  );
};

export default NavBar;
