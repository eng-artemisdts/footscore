import React from "react";
import { AppRouter } from "./router";
import { ToastProvider } from "@/shared/ui/ToastProvider";
import { ConfirmProvider } from "@/shared/ui/ConfirmProvider";
import { DevelopedByBadge } from "@/shared/ui/DevelopedByBadge";
import { ShareBadge } from "@/shared/ui/ShareBadge";

const App: React.FC = () => {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppRouter />
      </ConfirmProvider>
      <DevelopedByBadge />
      <ShareBadge />
    </ToastProvider>
  );
};

export default App;
