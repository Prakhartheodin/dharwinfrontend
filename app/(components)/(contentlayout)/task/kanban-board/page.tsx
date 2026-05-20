"use client";

import dynamic from "next/dynamic";

const TaskBoardPage = dynamic(() => import("./_features/task-board/TaskBoardPage"), {
  ssr: false,
});

export default function Page() {
  return <TaskBoardPage />;
}
