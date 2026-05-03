import Constants, { ExecutionEnvironment } from "expo-constants";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type RiveModule = typeof import("rive-react-native");
type RiveRef = import("rive-react-native").RiveRef;

let cachedModule: RiveModule | null | undefined;

function loadRiveModule(): RiveModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === "web") {
    cachedModule = null;
    return null;
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cachedModule = null;
    return null;
  }
  try {
    cachedModule = require("rive-react-native") as RiveModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export type RiveInputValue = boolean | number;

export type RiveFit =
  | "cover"
  | "contain"
  | "fill"
  | "fitWidth"
  | "fitHeight"
  | "none"
  | "scaleDown";

export type RiveAlignment =
  | "center"
  | "topCenter"
  | "topLeft"
  | "topRight"
  | "centerLeft"
  | "centerRight"
  | "bottomCenter"
  | "bottomLeft"
  | "bottomRight";

export interface RiveAnimationProps {
  source: number;
  artboardName?: string;
  stateMachineName?: string;
  animationName?: string;
  autoplay?: boolean;
  inputs?: Record<string, RiveInputValue>;
  triggers?: string[];
  style?: StyleProp<ViewStyle>;
  fallback: React.ReactNode;
  paused?: boolean;
  fit?: RiveFit;
  alignment?: RiveAlignment;
}

/**
 * Cross-platform wrapper around `rive-react-native`.
 *
 * On native dev builds with the module linked: renders the Rive scene
 * and pushes `inputs` to the named state machine. On Expo Go, web,
 * missing module, or reduce-motion: renders the `fallback` prop.
 *
 * Initial input sync: we use a callback ref so that the moment the
 * native Rive view attaches we flush every input in `inputs` to the
 * state machine. After that, a diffed effect pushes only the values
 * that changed. This avoids the "first render no-op" race.
 */
export function RiveAnimation({
  source,
  artboardName,
  stateMachineName = "State",
  animationName,
  autoplay = true,
  inputs,
  triggers,
  style,
  fallback,
  paused,
  fit = "contain",
  alignment = "center",
}: RiveAnimationProps) {
  const mod = loadRiveModule();
  const riveRef = useRef<RiveRef | null>(null);
  const lastInputs = useRef<Record<string, RiveInputValue>>({});
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const triggersRef = useRef(triggers);
  triggersRef.current = triggers;
  const stateMachineRef = useRef(stateMachineName);
  stateMachineRef.current = stateMachineName;

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        if (!cancelled) setReduceMotion(!!v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      (v) => setReduceMotion(!!v),
    );
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  const flushInputs = useCallback(() => {
    const ref = riveRef.current;
    const sm = stateMachineRef.current;
    if (!ref || !sm) return;
    const current = inputsRef.current;
    if (current) {
      for (const [key, value] of Object.entries(current)) {
        ref.setInputState(sm, key, value);
        lastInputs.current[key] = value;
      }
    }
    const t = triggersRef.current;
    if (t && t.length) {
      for (const name of t) ref.fireState(sm, name);
    }
  }, []);

  const setRiveRef = useCallback((ref: RiveRef | null) => {
    riveRef.current = ref;
    if (!ref) {
      lastInputs.current = {};
      return;
    }
    const sm = stateMachineRef.current;
    const initial = inputsRef.current;
    if (sm && initial) {
      for (const [key, value] of Object.entries(initial)) {
        ref.setInputState(sm, key, value);
        lastInputs.current[key] = value;
      }
    }
    const initialTriggers = triggersRef.current;
    if (sm && initialTriggers) {
      for (const t of initialTriggers) ref.fireState(sm, t);
    }
  }, []);

  // Diff inputs on every change after attach.
  useEffect(() => {
    const ref = riveRef.current;
    if (!ref || !inputs || !stateMachineName) return;
    for (const [key, value] of Object.entries(inputs)) {
      if (lastInputs.current[key] === value) continue;
      ref.setInputState(stateMachineName, key, value);
      lastInputs.current[key] = value;
    }
  }, [inputs, stateMachineName]);

  // Fire triggers whenever the array reference changes.
  useEffect(() => {
    const ref = riveRef.current;
    if (!ref || !loadedRef.current || !triggers || !stateMachineName) return;
    for (const t of triggers) ref.fireState(stateMachineName, t);
  }, [triggers, stateMachineName]);

  if (!mod || reduceMotion) {
    return <View style={[styles.wrap, style]}>{fallback}</View>;
  }

  const Rive = mod.default;
  const fitValue = FIT_MAP[fit](mod.Fit);
  const alignValue = ALIGNMENT_MAP[alignment](mod.Alignment);

  return (
    <View style={[styles.wrap, style]}>
      <Rive
        ref={setRiveRef}
        source={source}
        artboardName={artboardName}
        stateMachineName={stateMachineName}
        animationName={animationName}
        autoplay={autoplay && !paused}
        fit={fitValue}
        alignment={alignValue}
        style={StyleSheet.absoluteFillObject}
        onPlay={() => {
          if (!loadedRef.current) {
            loadedRef.current = true;
            // Push every initial input value now that the runtime is
            // confirmed loaded. Subsequent prop changes flow through
            // the diffed effect above.
            flushInputs();
          }
        }}
        onError={(e) => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn("[RiveAnimation] runtime error, falling back:", e);
          }
          setHasError(true);
        }}
      />
    </View>
  );
}

const FIT_MAP: Record<RiveFit, (F: RiveModule["Fit"]) => RiveModule["Fit"][keyof RiveModule["Fit"]]> = {
  cover: (F) => F.Cover,
  contain: (F) => F.Contain,
  fill: (F) => F.Fill,
  fitWidth: (F) => F.FitWidth,
  fitHeight: (F) => F.FitHeight,
  none: (F) => F.None,
  scaleDown: (F) => F.ScaleDown,
};

const ALIGNMENT_MAP: Record<
  RiveAlignment,
  (A: RiveModule["Alignment"]) => RiveModule["Alignment"][keyof RiveModule["Alignment"]]
> = {
  center: (A) => A.Center,
  topCenter: (A) => A.TopCenter,
  topLeft: (A) => A.TopLeft,
  topRight: (A) => A.TopRight,
  centerLeft: (A) => A.CenterLeft,
  centerRight: (A) => A.CenterRight,
  bottomCenter: (A) => A.BottomCenter,
  bottomLeft: (A) => A.BottomLeft,
  bottomRight: (A) => A.BottomRight,
};

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
});

export const riveAssets = {
  globe: require("../assets/rive/globe.riv") as number,
  pin: require("../assets/rive/pin.riv") as number,
  loading: require("../assets/rive/loading.riv") as number,
  empty: require("../assets/rive/empty.riv") as number,
  hero: require("../assets/rive/hero.riv") as number,
} as const;
