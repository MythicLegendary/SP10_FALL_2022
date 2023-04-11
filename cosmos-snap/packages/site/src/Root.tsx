import { createContext, FunctionComponent, ReactNode, useState, useCallback } from 'react';
import { ThemeProvider } from 'styled-components';
import { getThemePreference, setLocalStorage } from './utils';
import { dark, light } from './config/theme';
import { MetaMaskProvider } from './hooks';

import { PageThemeContext, ThemeContract } from './utils/ThemeContract';
import { BackgroundAnimation } from './components/BackgroundAnimation';

export type RootProps = {
  children: ReactNode;
};

type ToggleTheme = () => void;

export const ToggleThemeContext = createContext<ToggleTheme>(
  (): void => undefined,
);

export const Root: FunctionComponent<RootProps> = ({ children }) => {
  const [darkTheme, setDarkTheme] = useState(getThemePreference());
  const [pageTheme, setPageTheme] = useState(ThemeContract.Dark);

  const toggleTheme: ToggleTheme = () => {
    setLocalStorage('theme', darkTheme ? 'light' : 'dark');
    setDarkTheme(!darkTheme);
  };

  return (
    <PageThemeContext.Provider value={{
      theme: pageTheme,
      setTheme: (newTheme) => {setPageTheme(newTheme)}
      }}>
        <BackgroundAnimation/>
      <ToggleThemeContext.Provider value={toggleTheme}>
        <ThemeProvider theme={darkTheme ? dark : light}>
          <MetaMaskProvider>{children}</MetaMaskProvider>
        </ThemeProvider>
      </ToggleThemeContext.Provider>
    </PageThemeContext.Provider>
  );
};
