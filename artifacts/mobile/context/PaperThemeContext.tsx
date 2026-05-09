import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type PaperThemeId = "classic" | "forest" | "dusk";

export interface PaperTheme {
  id: PaperThemeId;
  label: string;
  swatch: string;
  paper: string;
  paperDeep: string;
  cream: string;
  supporterOnly: boolean;
}

export const PAPER_THEMES: PaperTheme[] = [
  {
    id: "classic",
    label: "Classic Field Notebook",
    swatch: "#fdf6e3",
    paper: "#fdf6e3",
    paperDeep: "#f0e8d4",
    cream: "#fff8d6",
    supporterOnly: false,
  },
  {
    id: "forest",
    label: "Forest Floor",
    swatch: "#e6efd9",
    paper: "#e6efd9",
    paperDeep: "#cfdcb8",
    cream: "#f1f6e2",
    supporterOnly: true,
  },
  {
    id: "dusk",
    label: "Dusk Sketchbook",
    swatch: "#e8e1f0",
    paper: "#e8e1f0",
    paperDeep: "#d2c6e1",
    cream: "#f1ecf6",
    supporterOnly: true,
  },
];

const KEY = "natura.paperTheme.v1";

interface Ctx {
  theme: PaperTheme;
  themeId: PaperThemeId;
  setTheme: (id: PaperThemeId) => Promise<void>;
  loaded: boolean;
}

const PaperThemeCtx = createContext<Ctx | null>(null);

export function PaperThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<PaperThemeId>("classic");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored && PAPER_THEMES.some((t) => t.id === stored)) {
          setThemeId(stored as PaperThemeId);
        }
      } catch {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setTheme = useCallback(async (id: PaperThemeId) => {
    setThemeId(id);
    try {
      await AsyncStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const theme = useMemo(
    () => PAPER_THEMES.find((t) => t.id === themeId) ?? PAPER_THEMES[0],
    [themeId],
  );

  return (
    <PaperThemeCtx.Provider value={{ theme, themeId, setTheme, loaded }}>
      {children}
    </PaperThemeCtx.Provider>
  );
}

export function usePaperTheme(): Ctx {
  const ctx = useContext(PaperThemeCtx);
  if (!ctx) throw new Error("usePaperTheme must be used inside PaperThemeProvider");
  return ctx;
}
