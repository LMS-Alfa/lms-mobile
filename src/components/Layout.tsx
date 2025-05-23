import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, DefaultTheme } from 'styled-components/native';
import LogoutButton from './LogoutButton';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
  fullWidth?: boolean;
  backgroundColor?: string;
  header?: ReactNode;
  footer?: ReactNode;
  paddingHorizontal?: number;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  subtitle,
  showLogout = true,
  fullWidth = false,
  backgroundColor,
  header,
  footer,
  paddingHorizontal = 16
}) => {
  const theme = useTheme() as DefaultTheme & {
    background?: string;
    text?: string;
    textSecondary?: string;
    cardBackground?: string;
    lightBorder?: string;
  };

  const containerBackground = backgroundColor || theme.background || '#f5f6fa';
  
  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: containerBackground }
      ]} 
      edges={['right', 'left', 'top']}
    >
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      {/* Header */}
      {(title || header) && (
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.cardBackground || '#fff',
            borderBottomColor: theme.lightBorder || '#e0e0e0',
            paddingHorizontal: paddingHorizontal
          }
        ]}>
          {header ? (
            header
          ) : (
            <View style={styles.headerContent}>
              <View style={styles.headerTitleContainer}>
                {title && (
                  <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
                )}
                {subtitle && (
                  <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
                )}
              </View>
              {showLogout && <LogoutButton variant="icon" />}
            </View>
          )}
        </View>
      )}
      
      {/* Content */}
      <View style={[
        styles.content, 
        fullWidth ? null : { paddingHorizontal }
      ]}>
        {children}
      </View>
      
      {/* Footer */}
      {footer && (
        <View style={[
          styles.footer, 
          { 
            backgroundColor: theme.cardBackground || '#fff',
            borderTopColor: theme.lightBorder || '#e0e0e0',
            paddingHorizontal: paddingHorizontal
          }
        ]}>
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 16,
  }
});

export default Layout; 