import { createContext } from "react";

export enum ThemeContract {
    Dark,
    Light
};

export const PageThemeContext = createContext({
    theme: ThemeContract.Dark, // default
    setTheme: (newTheme:ThemeContract) => {} // default
});
