"use client";
import { CONSOLE_KEYFRAMES } from "./tokens";

// Inject scoped console keyframes + utilities once per chatbot mount.
export function ConsoleStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CONSOLE_KEYFRAMES }} />;
}
