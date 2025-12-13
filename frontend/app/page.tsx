import StartTransformationBtn from "@/components/StartTransformationBtn";

const Home = () => {
  return (
    <section className="bg-[url('/hero-background.webp')] min-h-screen w-full bg-cover bg-center relative text-white">
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
    </section>
  );
};

export default Home;
