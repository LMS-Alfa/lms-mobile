import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
    View, Text, TextInput, StyleSheet, Animated, Easing, TouchableOpacity,
    FlatList, ActivityIndicator, ScrollView, Modal
} from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { configureTextInput } from '../../utils/keyboard-utils';
import { useAuthStore, User, UserRole } from '../../store/authStore';

// Memo-ize the Section component for better performance
export const Section = memo(({ title, children, index = 0 }: { title: string, children: React.ReactNode, index?: number }) => {
    const theme = useTheme() as DefaultTheme & {
        text?: string;
        lightBorder?: string;
        cardBackground?: string;
    };
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            })
        ]).start();
    }, []);
    
    return (
        <Animated.View 
            style={[
                styles.sectionContainer, 
                { 
                    backgroundColor: theme.cardBackground || '#fff',
                    opacity: fadeAnim,
                    transform: [{ translateY }]
                }
            ]}
        >
            <Text style={[styles.sectionTitle, { color: theme.text, borderBottomColor: theme.lightBorder }]}>{title}</Text>
            {children}
        </Animated.View>
    );
});

// Memo-ize the InputField component to prevent re-renders
export const InputField = memo(({ 
    label, value, onChangeText, placeholder, secureTextEntry, keyboardType, 
    iconName, editable = true, error, touched, inputRef, onBlur,
}: {
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    secureTextEntry?: boolean,
    keyboardType?: 'default' | 'email-address',
    iconName?: string,
    editable?: boolean,
    error?: string,
    touched?: boolean,
    inputRef?: React.RefObject<TextInput | null>,
    onBlur?: () => void,
}) => {
    const theme = useTheme() as DefaultTheme & {
        text?: string;
        textSecondary?: string;
        inputBackground?: string;
        lightBorder?: string;
        errorText?: string;
        danger?: string;
        placeholder?: string;
        subtleText?: string;
        mediumText?: string;
        primary?: string;
        success?: string;
    };
    
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: isFocused ? 1 : 0,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
        }).start();
    }, [isFocused]);
    
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => {
        setIsFocused(false);
        if (onBlur) onBlur();
    };
    
    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            touched && error ? (theme.errorText || theme.danger || '#f44336') : (theme.lightBorder || '#e0e0e0'),
            touched && error ? (theme.errorText || theme.danger || '#f44336') : (theme.success || '#4CAF50')
        ]
    });
    
    const shakeAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (touched && error) {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
            ]).start();
        }
    }, [touched, error]);
    
    return (
        <Animated.View 
            style={[
                styles.inputGroup,
                { transform: [{ translateX: shakeAnim }] }
            ]}
        >
            <View style={styles.labelContainer}>
                {iconName && <Icon name={iconName} size={14} color={isFocused ? (theme.success || '#4CAF50') : theme.mediumText} style={styles.labelIcon} />}
                <Animated.Text 
                    style={[
                        styles.label, 
                        { 
                            color: isFocused ? (theme.success || '#4CAF50') : theme.mediumText,
                            transform: [{ 
                                scale: borderAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.05]
                                })
                            }]
                        }
                    ]}
                >
                    {label}
                </Animated.Text>
            </View>
            <Animated.View
                style={{
                    borderColor,
                    borderWidth: 1,
                    borderRadius: 8,
                    backgroundColor: theme.inputBackground,
                }}
            >
                <TextInput
                    ref={inputRef}
                    style={[
                        styles.input,
                        {
                            color: theme.text,
                            opacity: editable ? 1 : 0.7,
                            borderWidth: 0, // Remove border since we're using the parent View's border
                        }
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.placeholder || theme.subtleText}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType || 'default'}
                    editable={editable}
                    caretHidden={false}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...configureTextInput(secureTextEntry)}
                />
            </Animated.View>
            {touched && error ? (
                <Animated.Text 
                    style={[
                        styles.errorText, 
                        { 
                            color: theme.errorText || theme.danger,
                            opacity: borderAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1]
                            })
                        }
                    ]}
                >
                    {error}
                </Animated.Text>
            ) : null}
        </Animated.View>
    );
});

// Add a helper function to check for parent role
const isParentRole = (role: string): boolean => {
    return role?.toLowerCase() === 'parent';
};

// Student Selector for Parent Users
export const StudentSelector = memo(({ 
  selectedStudentIds = [], 
  onStudentsSelected,
  error,
  touched,
}: {
  selectedStudentIds: string[];
  onStudentsSelected: (studentIds: string[]) => void;
  error?: string;
  touched?: boolean;
}) => {
  const theme = useTheme() as DefaultTheme & {
    text?: string;
    textSecondary?: string;
    background?: string;
    cardBackground?: string;
    inputBackground?: string;
    lightBorder?: string;
    success?: string;
    danger?: string;
    primary?: string;
    errorText?: string;
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedStudentIds || []);
  const allUsers = useAuthStore(state => state.allUsers);
  const loadingUsers = useAuthStore(state => state.loadingUsers);
  const fetchAllUsers = useAuthStore(state => state.fetchAllUsers);
  const [searchQuery, setSearchQuery] = useState('');

  // Force fetch all users on component mount
  useEffect(() => {
    fetchAllUsers();
    console.log("Fetching all users for StudentSelector");
  }, []);

  // Filter for only student users
  const students = useMemo(() => {
    console.log(`Filtering students from ${allUsers.length} users`);
    return allUsers.filter(user => {
      const isStudent = user.role?.toLowerCase() === 'student';
      return isStudent;
    });
  }, [allUsers]);

  // Filter students by search query if provided
  const filteredStudents = useMemo(() => {
    return searchQuery
      ? students.filter(student => 
          `${student.firstName} ${student.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : students;
  }, [students, searchQuery]);

  // Update selectedIds when selectedStudentIds prop changes
  useEffect(() => {
    setSelectedIds(selectedStudentIds || []);
  }, [selectedStudentIds]);

  const handleOpenModal = () => {
    // Refresh user list when opening modal
    fetchAllUsers();
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const handleToggleSelection = (studentId: string) => {
    setSelectedIds(prevSelected => {
      if (prevSelected.includes(studentId)) {
        return prevSelected.filter(id => id !== studentId);
      } else {
        return [...prevSelected, studentId];
      }
    });
  };

  const handleSaveSelection = () => {
    onStudentsSelected(selectedIds);
    setIsModalVisible(false);
  };

  // Find selected student names for display
  const selectedStudentNames = selectedIds
    .map(id => {
      const student = students.find(s => s.id === id);
      return student ? `${student.firstName} ${student.lastName}` : '';
    })
    .filter(Boolean); // Filter out empty strings

  console.log(`StudentSelector: Found ${students.length} students, selected ${selectedIds.length} students`);

  const renderStudent = ({ item }: { item: User }) => {
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.studentItem,
          {
            backgroundColor: isSelected 
              ? (theme.success || '#4CAF50') + '15' 
              : theme.cardBackground || '#fff',
            borderColor: isSelected 
              ? (theme.success || '#4CAF50') 
              : theme.lightBorder || '#e1e1e1',
          }
        ]}
        onPress={() => handleToggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: theme.text }]}>
            {item.firstName} {item.lastName}
          </Text>
          {item.parent_id && (
            <Text style={[styles.studentParentInfo, { color: theme.textSecondary }]}>
              Has parent assigned
            </Text>
          )}
        </View>
        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <Icon name="check-circle" size={20} color={theme.success || '#4CAF50'} />
          ) : (
            <Icon name="circle" size={20} color={theme.lightBorder || '#e1e1e1'} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Icon name="users" size={14} color={theme.textSecondary} style={styles.labelIcon} />
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Assign Students
        </Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.selectorButton,
          {
            borderColor: touched && error ? theme.danger : theme.lightBorder,
            backgroundColor: theme.inputBackground || '#f5f5f5',
          }
        ]}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        {selectedStudentNames.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedStudentsContainer}
          >
            {selectedStudentNames.map((name, index) => (
              <View 
                key={index} 
                style={[
                  styles.selectedStudentChip,
                  { backgroundColor: theme.primary + '20' }
                ]}
              >
                <Text style={[styles.selectedStudentName, { color: theme.primary }]}>
                  {name}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.placeholderText, { color: theme.textSecondary + '99' }]}>
            Select students for this parent
          </Text>
        )}
        <Icon name="chevron-right" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
      
      {touched && error ? (
        <Text style={[styles.errorText, { color: theme.errorText || theme.danger }]}>
          {error}
        </Text>
      ) : null}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background || '#f9f9f9' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.lightBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Students
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Icon name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.searchInput,
                { 
                  backgroundColor: theme.inputBackground || '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.lightBorder
                }
              ]}
              placeholder="Search students..."
              placeholderTextColor={theme.textSecondary + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loadingUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading students...
                </Text>
              </View>
            ) : filteredStudents.length > 0 ? (
              <FlatList
                data={filteredStudents}
                renderItem={renderStudent}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.studentsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Icon name="users" size={36} color={theme.textSecondary + '50'} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'No matching students found' : 'No students available'}
                </Text>
              </View>
            )}

            <View style={[styles.modalFooter, { borderTopColor: theme.lightBorder }]}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelButton, { borderColor: theme.lightBorder }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.footerButtonText, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerButton, 
                  styles.saveButton,
                  { backgroundColor: theme.primary || '#007bff' }
                ]}
                onPress={handleSaveSelection}
              >
                <Icon name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.footerButtonText, { color: '#fff' }]}>
                  {`Save (${selectedIds.length} selected)`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
    sectionContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 18,
        paddingBottom: 10,
        borderBottomWidth: 1,
        letterSpacing: -0.3,
    },
    inputGroup: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelIcon: {
        marginRight: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    input: {
        height: 48,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 15,
    },
    errorText: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 2,
    },
    container: {
        marginBottom: 20,
    },
    selectorButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 48,
    },
    placeholderText: {
        fontSize: 14,
    },
    selectedStudentsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        flex: 1,
        paddingRight: 8,
    },
    selectedStudentChip: {
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 4,
    },
    selectedStudentName: {
        fontSize: 14,
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 500,
        borderRadius: 12,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchInput: {
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 8,
        fontSize: 16,
    },
    studentsList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    studentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 8,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '500',
    },
    studentParentInfo: {
        fontSize: 12,
        marginTop: 4,
    },
    selectionIndicator: {
        paddingLeft: 12,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    emptyStateContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
    },
    footerButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        minWidth: 120,
    },
    cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    saveButton: {
        // Use theme for background
    },
    footerButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
}); 