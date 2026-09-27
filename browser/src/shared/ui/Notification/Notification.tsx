import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Text } from "@/shared/ui/Text";
import "@/shared/ui/Notification/Notification.css";

export function Notification({
  message,
  duration = 3000,
  onClose,
}: {
  message: string;
  duration?: number;
  onClose: () => void;
}) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const timer = window.setTimeout(() => close.current(), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return createPortal(
    <div
      className="notification"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Text size="md" color="primary" align="center">
        {message}
      </Text>
    </div>,
    document.body,
  );
}
