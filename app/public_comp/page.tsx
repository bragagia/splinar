"use client";

import dynamic from "next/dynamic";

const Comp = dynamic(() => import("./comp"), {
  ssr: false,
});

export default function DemoStackPage() {
  return <Comp />;
}
