"use client";

import { Component, type ReactNode } from "react";

import { PrimaryButton } from "./kit";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
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
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="text-5xl">🫧</div>
          <p className="font-hand text-xl text-ink">小屋打了个盹</p>
          <p className="text-sm text-ink-soft">画面出了点小状况，点一下让它醒过来。</p>
          <div className="w-44">
            <PrimaryButton
              size="sm"
              onClick={() => {
                this.reset();
                location.reload();
              }}
            >
              重新唤醒
            </PrimaryButton>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
