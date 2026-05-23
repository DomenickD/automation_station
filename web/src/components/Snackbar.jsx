import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const SnackbarCtx = createContext(null);

export function SnackbarProvider({ children }) {
  const [snack, setSnack] = useState(null);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSnack(null);
  }, []);

  const show = useCallback((message, action = null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSnack({ message, action });
    timerRef.current = setTimeout(() => setSnack(null), 6000);
  }, []);

  return (
    <SnackbarCtx.Provider value={{ show, dismiss }}>
      {children}
      {snack && <SnackbarToast snack={snack} onDismiss={dismiss} />}
    </SnackbarCtx.Provider>
  );
}

function SnackbarToast({ snack, onDismiss }) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-xl shadow-2xl text-sm w-max max-w-sm animate-slide-up">
      <span className="flex-1">{snack.message}</span>
      {snack.action && (
        <button
          onClick={() => { navigate(snack.action.to); onDismiss(); }}
          className="shrink-0 font-semibold text-blue-300 hover:text-blue-200 whitespace-nowrap"
        >
          {snack.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="shrink-0 text-white/50 hover:text-white ml-1 leading-none"
      >
        ✕
      </button>
    </div>
  );
}

export function useSnackbar() {
  return useContext(SnackbarCtx);
}
