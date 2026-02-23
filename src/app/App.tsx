import React from "react";
import { AppRouter } from "./router";
import { ToastProvider } from "@/shared/ui/ToastProvider";
import { ConfirmProvider } from "@/shared/ui/ConfirmProvider";

const App: React.FC = () => {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppRouter />
      </ConfirmProvider>
    </ToastProvider>
  );
};

export default App;

