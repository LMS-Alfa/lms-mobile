import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider, DefaultTheme } from 'styled-components/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../styles/theme'; // Assuming theme.ts is in ../styles/

// AppTheme now directly reflects the structure of lightTheme/darkTheme
// which is DefaultTheme extended with flat color properties.
export interface AppTheme extends DefaultTheme {
  primary: string;
  text: string;
  textSecondary: string;
  background: string;
  cardBackground: string;
  inputBackground: string;
  border: string;
  lightBorder: string;
  danger: string;
  success: string;
  warning: string;
  disabled: string;
  highlight: string;
  separator: string;
  placeholder: string;
  subtleText: string;
  mediumText: string;
  errorText: string;
  // fontSize from mockTheme might be different from DefaultTheme.fontSizes, ensure correct usage
  fontSize?: { // This was from mockTheme structure, ensure it is intended for AppTheme
    screenTitle?: number;
    sectionTitle?: number;
    itemText?: number;
    itemDescription?: number;
  };
  // DefaultTheme already includes: colors (nested), spacing, borderRadius, fontSizes, fontWeights
}

interface AppThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: AppTheme; // Provide the fully structured theme object
}

export const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem('themeMode');
        if (savedThemeMode !== null) {
          setIsDarkMode(savedThemeMode === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference from AsyncStorage', error);
      } finally {
        setIsLoadingTheme(false);
      }
    };
    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('themeMode', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference to AsyncStorage', error);
    }
  };

  // Select the theme object based on isDarkMode
  // Ensure the selected theme is cast to AppTheme if necessary, 
  // or that lightTheme/darkTheme already match the AppTheme structure.
  const selectedTheme = (isDarkMode ? darkTheme : lightTheme) as AppTheme;

  if (isLoadingTheme) {
    // Optionally return a loading indicator or null to prevent rendering with default/unloaded theme
    return null; // Or a basic loading view
  }

  return (
    <AppThemeContext.Provider value={{ isDarkMode, toggleTheme, theme: selectedTheme }}>
      <StyledThemeProvider theme={selectedTheme}>
        {children}
      </StyledThemeProvider>
    </AppThemeContext.Provider>
  );
};

// Custom hook to use the theme context easily
export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
}; 