"use client";

import dynamic from "next/dynamic";

/** react-markdown + remark-gfm load only when the assistant panel renders messages. */
export default dynamic(() => import("./ChatMessage"), {
  ssr: false,
  loading: () => null,
});
