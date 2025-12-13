"use client";
import { FiArrowUpRight } from "react-icons/fi";

const StartTransformationBtn = () => {
  return (
    <button
      type="button"
      id="startTransformation-btn"
      className="mt-4 mx-auto px-6 py-4 bg-secondary text-white rounded-lg"
    >
      <a
        href="/signup"
        className="flex items-center gap-2 font-helvetica text-sm font-bold whitespace-nowrap xl:text-base"
      >
        Start Your Transformation
        <FiArrowUpRight className="w-6 h-6 stroke-2" />
      </a>
    </button>
  );
};

export default StartTransformationBtn;
