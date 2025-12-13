import StartTransformationBtn from "@/components/StartTransformationBtn";
import { MdOutlineSouthEast } from "react-icons/md";

const Home = () => {
  return (
    <section className="bg-[url('/hero-background.webp')] min-h-screen w-full bg-cover bg-center relative text-white overflow-hidden">
      <div className="grid place-content-center gap-y-3 p-8 w-full h-full top-0 absolute text-center">
        <h1 className="font-satoshi text-2xl font-normal leading-tight md:text-4xl xl:text-5xl 2xl:text-6xl mx-auto">
          The <span className="font-medium">Fitness App</span> That Feels Like
          an <span className="italic">Unfair Advantage</span>
        </h1>
        <p className="font-satoshi text-sm md:text-base xl:text-xl 2xl:text-2xl mx-auto">
          Smarter habit-building. Adaptive training. Personalized nutrition. All
          powered by an AI coach that never stops leveling up.
        </p>
        <StartTransformationBtn />
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-2 animate-pulse text-base md:text-lg 2xl:text-lg">
        [Scroll]
      </div>

      <MdOutlineSouthEast className="absolute w-12 h-12 bottom-0 right-0 md:w-14 md:h-14 lg:w-16 lg:h-16" />
    </section>
  );
};

export default Home;
