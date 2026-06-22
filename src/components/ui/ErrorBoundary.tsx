"use client";

import { Component, type ReactNode } from "react";

import { dom, useTr } from "@/i18n";
import { PrimaryButton } from "./kit";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

const S = dom(
  {
    title: "小屋打了个盹",
    body: "画面出了点小状况，点一下让它醒过来。",
    retry: "重新唤醒",
  },
  {
    title: "The cottage dozed off",
    body: "Something glitched on screen. Give it a tap to wake it up.",
    retry: "Wake it up",
  },
);

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useTr(S);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-5xl">🫧</div>
      <p className="font-hand text-xl text-ink">{t.title}</p>
      <p className="text-sm text-ink-soft">{t.body}</p>
      <div className="w-44">
        <PrimaryButton size="sm" onClick={onRetry}>
          {t.retry}
        </PrimaryButton>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[Capybanana] runtime error:", error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          onRetry={() => {
            this.reset();
            location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}
