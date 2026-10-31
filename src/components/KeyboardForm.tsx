import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type PropsWithChildren,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** Account forms share native keyboard avoidance and Safari visual-viewport sizing. */
export function KeyboardForm({
  children,
  keyboardOffset = 0,
  onKeyboardShown,
  style,
}: PropsWithChildren<{
  keyboardOffset?: number;
  onKeyboardShown?: () => boolean | void;
  style?: StyleProp<ViewStyle>;
}>) {
  const container = useRef<ComponentRef<typeof View>>(null);
  const [webHeight, setWebHeight] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") {
      if (!onKeyboardShown) return;
      let frame: number | undefined;
      const subscription = Keyboard.addListener("keyboardDidShow", () => {
        frame = requestAnimationFrame(onKeyboardShown);
      });
      return () => {
        subscription.remove();
        if (frame !== undefined) cancelAnimationFrame(frame);
      };
    }
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    let frame: number | undefined;
    let revealFrame: number | undefined;
    let keyboardWasVisible = false;
    const update = (event?: Event) => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const focused = document.activeElement;
        const editing =
          focused?.tagName === "INPUT" ||
          focused?.tagName === "TEXTAREA" ||
          (focused instanceof HTMLElement && focused.isContentEditable);
        const keyboardVisible =
          editing && window.innerHeight - viewport.height > 120;
        if (!keyboardVisible) {
          setWebHeight(null);
          keyboardWasVisible = false;
          if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
          return;
        }
        const node = container.current as unknown as HTMLElement | null;
        if (!node?.getBoundingClientRect) return;
        const bounds = node.getBoundingClientRect();
        const parentBottom =
          node.parentElement?.getBoundingClientRect().bottom ??
          window.innerHeight;
        const bottom = Math.min(
          parentBottom,
          viewport.offsetTop + viewport.height,
        );
        const height = Math.max(1, Math.round(bottom - bounds.top));
        setWebHeight((current) => (current === height ? current : height));
        if (event?.type !== "scroll" || !keyboardWasVisible) {
          if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
          revealFrame = requestAnimationFrame(() => {
            const target = document.activeElement;
            if (
              onKeyboardShown?.() !== true &&
              target instanceof HTMLElement &&
              (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable)
            )
              target.scrollIntoView({ block: "nearest", inline: "nearest" });
          });
        }
        keyboardWasVisible = keyboardVisible;
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [onKeyboardShown]);

  return (
    <View
      ref={container}
      testID="keyboard-form"
      style={[
        { flex: 1 },
        style,
        webHeight !== null && {
          flex: undefined,
          flexBasis: "auto",
          flexGrow: 0,
          flexShrink: 0,
          height: webHeight,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? keyboardOffset : 0}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
