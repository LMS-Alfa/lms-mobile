import { DefaultTheme } from 'styled-components/native';

// Extend the DefaultTheme interface to include our custom theme properties
declare module 'styled-components/native' {
  export interface DefaultTheme {
    colors: {
      primary: {
        100: string;
        300: string;
        500: string;
        700: string;
        900: string;
      };
      secondary: {
        100: string;
        300: string;
        500: string;
        700: string;
        900: string;
      };
      success: {
        100: string;
        300: string;
        500: string;
        700: string;
        900: string;
      };
      warning: {
        100: string;
        300: string;
        500: string;
        700: string;
        900: string;
      };
      danger: {
        100: string;
        300: string;
        500: string;
        700: string;
        900: string;
      };
      info: {
        100: string;
        300: string;
        500: string;
        700: string;
        900: string;
      };
      neutral: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
      };
      background: {
        primary: string;
        secondary: string;
        tertiary: string;
      };
      text: {
        primary: string;
        secondary: string;
        tertiary: string;
        inverse: string;
      };
    };
    spacing: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
      6: number;
      8: number;
      10: number;
      12: number;
      16: number;
    };
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
      full: number;
    };
    fontSizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
      '4xl': number;
    };
    fontWeights: {
      regular: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  }
}

export const lightTheme: DefaultTheme & {
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
} = {
  primary: '#1890FF',
  text: '#262626',
  textSecondary: '#595959',
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
  border: '#D9D9D9',
  lightBorder: '#E8E8E8',
  danger: '#FF4D4F',
  success: '#52C41A',
  warning: '#FAAD14',
  disabled: '#BFBFBF',
  highlight: '#E6F7FF',
  separator: '#F0F0F0',
  placeholder: '#BFBFBF',
  subtleText: '#8C8C8C',
  mediumText: '#737373',
  errorText: '#FF4D4F',
};

export const darkTheme: DefaultTheme & {
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
} = {
  primary: '#1890FF',
  text: '#FFFFFF',
  textSecondary: '#BFBFBF',
  background: '#121212',
  cardBackground: '#1F1F1F',
  inputBackground: '#2F2F2F',
  border: '#434343',
  lightBorder: '#303030',
  danger: '#FF4D4F',
  success: '#52C41A',
  warning: '#FAAD14',
  disabled: '#595959',
  highlight: '#111D2C',
  separator: '#303030',
  placeholder: '#595959',
  subtleText: '#8C8C8C',
  mediumText: '#A6A6A6',
  errorText: '#FF7875',
}; 