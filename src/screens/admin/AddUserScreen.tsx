import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
    Keyboard, TouchableWithoutFeedback, Animated, Easing
} from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore, UserRole, Role } from '../../store/authStore';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useKeyboardPersistence, configureTextInput } from '../../utils/keyboard-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudentSelector } from './UserFormComponents';

interface AddUserScreenProps {
    navigation: NavigationProp<ParamListBase>;
}

const ACCOUNT_STATUSES: Array<{ label: string, value: 'active' | 'inactive'}> = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
];

// Memo-ize the Section component for better performance
const Section = memo(({ title, children, index = 0 }: { title: string, children: React.ReactNode, index?: number }) => {
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
const InputField = memo(({ 
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

const AddUserScreen: React.FC<AddUserScreenProps> = ({ navigation }) => {
    useKeyboardPersistence();

    const theme = useTheme() as DefaultTheme & {
        primary?: string;
        text?: string;
        textSecondary?: string;
        background?: string;
        cardBackground?: string;
        inputBackground?: string;
        danger?: string;
        separator?: string;
        lightBorder?: string;
        success?: string;
        disabled?: string;
        subtleText?: string;
        mediumText?: string;
        placeholder?: string;
        errorText?: string;
    };

    const createUser = useAuthStore(state => state.createUser);
    const creatingUser = useAuthStore(state => state.creatingUser);
    const createUserError = useAuthStore(state => state.createUserError);
    const clearCreateUserError = useAuthStore(state => state.clearCreateUserError);
    const availableRoles = useAuthStore(state => state.availableRoles);
    const fetchAvailableRoles = useAuthStore(state => state.fetchAvailableRoles);
    const loadingRoles = useAuthStore(state => state.loadingRoles);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
    const [accountStatus, setAccountStatus] = useState<'active' | 'inactive'>('active');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    
    // Form validation states
    const [errors, setErrors] = useState<{
        firstName?: string;
        lastName?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
        role?: string;
        students?: string;
    }>({});
    const [touched, setTouched] = useState<{
        firstName?: boolean;
        lastName?: boolean;
        email?: boolean;
        password?: boolean;
        confirmPassword?: boolean;
        role?: boolean;
        students?: boolean;
    }>({});

    const firstNameRef = useRef<TextInput | null>(null);
    const lastNameRef = useRef<TextInput | null>(null);
    const emailRef = useRef<TextInput | null>(null);
    const passwordRef = useRef<TextInput | null>(null);
    const confirmPasswordRef = useRef<TextInput | null>(null);
    
    const validateField = useCallback((field: string, value: string | string[], passwordValue?: string) => {
        setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            
            switch (field) {
                case 'firstName':
                    if (!value.trim()) {
                        newErrors.firstName = 'First name is required';
                    } else {
                        delete newErrors.firstName;
                    }
                    break;
                    
                case 'lastName':
                    if (!value.trim()) {
                        newErrors.lastName = 'Last name is required';
                    } else {
                        delete newErrors.lastName;
                    }
                    break;
                    
                case 'email':
                    if (!value.trim()) {
                        newErrors.email = 'Email is required';
                    } else {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value as string)) {
                            newErrors.email = 'Email is invalid';
                        } else {
                            delete newErrors.email;
                        }
                    }
                    break;
                    
                case 'password':
                    if (!value) {
                        newErrors.password = 'Password is required';
                    } else if ((value as string).length < 6) {
                        newErrors.password = 'Password must be at least 6 characters';
                    } else {
                        delete newErrors.password;
                    }
                    break;
                    
                case 'confirmPassword':
                    const currentPassword = passwordValue || password;
                    if (!value) {
                        newErrors.confirmPassword = 'Please confirm your password';
                    } else if (value !== currentPassword) {
                        newErrors.confirmPassword = 'Passwords do not match';
                    } else {
                        delete newErrors.confirmPassword;
                    }
                    break;
                    
                case 'role':
                    if (!value) {
                        newErrors.role = 'Please select a role';
                    } else {
                        delete newErrors.role;
                    }
                    break;

                case 'students':
                    // Only validate if role is parent
                    if (selectedRole === 'parent') {
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                            newErrors.students = 'Please select at least one student';
                        } else {
                            delete newErrors.students;
                        }
                    } else {
                        delete newErrors.students; // Not a parent, no validation needed
                    }
                    break;
            }
            
            return newErrors;
        });
        
        return !errors[field as keyof typeof errors];
    }, [password, errors, selectedRole]);
    
    const handleFirstNameChange = useCallback((text: string) => {
        setFirstName(text);
        validateField('firstName', text);
    }, [validateField]);
    
    const handleLastNameChange = useCallback((text: string) => {
        setLastName(text);
        validateField('lastName', text);
    }, [validateField]);
    
    const handleEmailChange = useCallback((text: string) => {
        setEmail(text);
        validateField('email', text);
    }, [validateField]);
    
    const handlePasswordChange = useCallback((text: string) => {
        setPassword(text);
        validateField('password', text);
        
        // Validate confirm password if it's already been entered
        if (confirmPassword) {
            validateField('confirmPassword', confirmPassword, text);
        }
    }, [validateField, confirmPassword]);
    
    const handleConfirmPasswordChange = useCallback((text: string) => {
        setConfirmPassword(text);
        validateField('confirmPassword', text);
    }, [validateField]);
    
    const handleFieldBlur = useCallback((field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        
        switch (field) {
            case 'firstName':
                validateField('firstName', firstName);
                break;
            case 'lastName':
                validateField('lastName', lastName);
                break;
            case 'email':
                validateField('email', email);
                break;
            case 'password':
                validateField('password', password);
                break;
            case 'confirmPassword':
                validateField('confirmPassword', confirmPassword);
                break;
            case 'role':
                validateField('role', selectedRole);
                break;
        }
    }, [firstName, lastName, email, password, confirmPassword, selectedRole, validateField]);

    // Add this helper function to determine if a role is a parent role
    const isParentRole = (role: string): boolean => {
        return role.toLowerCase() === 'parent';
    };

    // Update the handleRoleSelect function to correctly identify parent role
    const handleRoleSelect = useCallback((role: UserRole) => {
        setSelectedRole(role);
        validateField('role', role);
        setTouched(prev => ({ ...prev, role: true }));

        // Reset student selection if switching away from parent role
        if (!isParentRole(role)) {
            setSelectedStudentIds([]);
        } else if (selectedStudentIds.length > 0) {
            // Validate existing students if already had some selected
            validateField('students', selectedStudentIds);
        }
    }, [validateField, selectedStudentIds]);
    
    const handleStudentsSelected = useCallback((studentIds: string[]) => {
        setSelectedStudentIds(studentIds);
        validateField('students', studentIds);
        setTouched(prev => ({ ...prev, students: true }));
    }, [validateField]);
    
    const handleStatusSelect = useCallback((status: 'active' | 'inactive') => {
        setAccountStatus(status);
    }, []);
    
    const validateForm = useCallback(() => {
        // Mark all fields as touched
        const touchedFields: any = {
            firstName: true,
            lastName: true,
            email: true,
            password: true,
            confirmPassword: true,
            role: true
        };
        
        // Only mark students as touched if parent role is selected
        if (selectedRole === 'parent') {
            touchedFields.students = true;
        }
        
        setTouched(touchedFields);
        
        // Validate all fields
        const isFirstNameValid = validateField('firstName', firstName);
        const isLastNameValid = validateField('lastName', lastName);
        const isEmailValid = validateField('email', email);
        const isPasswordValid = validateField('password', password);
        const isConfirmPasswordValid = validateField('confirmPassword', confirmPassword);
        const isRoleValid = validateField('role', selectedRole);
        
        // Validate students only if parent role
        let isStudentsValid = true;
        if (selectedRole === 'parent') {
            isStudentsValid = validateField('students', selectedStudentIds);
        }
        
        return isFirstNameValid && isLastNameValid && isEmailValid && 
               isPasswordValid && isConfirmPasswordValid && isRoleValid && isStudentsValid;
    }, [firstName, lastName, email, password, confirmPassword, selectedRole, selectedStudentIds, validateField]);

    const handleCreateUser = useCallback(async () => {
        if (!validateForm()) {
            // Form validation failed
            return;
        }

        // Ensure all fields are properly trimmed and formatted
        const userData: any = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            password: password, // Make sure password is included and not empty
            role: selectedRole as UserRole,
            status: accountStatus,
        };

        // Add childrenIds for parent role
        if (isParentRole(selectedRole) && selectedStudentIds.length > 0) {
            userData.childrenIds = selectedStudentIds;
            console.log(`Creating parent user with ${selectedStudentIds.length} children:`, selectedStudentIds);
        }

        console.log('Creating user with data:', { ...userData, password: '***' });

        const success = await createUser(userData);

        if (success) {
            Alert.alert('Success', 'User has been created successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        }
    }, [firstName, lastName, email, password, selectedRole, accountStatus, selectedStudentIds, createUser, validateForm, navigation]);
    
    const handleCancel = useCallback(() => {
            navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        if (createUserError) {
            Alert.alert('Creation Failed', createUserError);
            clearCreateUserError();
        }
    }, [createUserError, clearCreateUserError]);

    useEffect(() => {
        fetchAvailableRoles();
    }, [fetchAvailableRoles]);

    // Update renderRoleButtons to filter out unwanted roles
    const renderRoleButtons = useCallback(() => {
        // Define a green color that will be used for selected state
        const greenColor = theme.success || '#4CAF50';
        
        // Filter to only show Admin, Student, Parent, Teacher roles
        const filteredRoles = availableRoles.filter(role => {
            const roleName = role.name.toLowerCase();
            return roleName === 'admin' || roleName === 'student' || 
                   roleName === 'parent' || roleName === 'teacher';
        });
        
        return filteredRoles.map((role) => {
            const isSelected = selectedRole === role.name;
            return (
                <Animated.View
                    key={role.name}
                    style={{
                        opacity: 1,
                        transform: [{ 
                            scale: isSelected ? 1.05 : 1
                        }]
                    }}
                >
                    <TouchableOpacity
                        style={[
                            styles.roleButton,
                            {
                                backgroundColor: isSelected ? greenColor + '20' : theme.inputBackground,
                                borderColor: isSelected ? greenColor : theme.lightBorder,
                                shadowColor: isSelected ? greenColor : 'transparent',
                                shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
                                shadowOpacity: isSelected ? 0.3 : 0,
                                shadowRadius: isSelected ? 4 : 0,
                                elevation: isSelected ? 2 : 0,
                            }
                        ]}
                        onPress={() => handleRoleSelect(role.name)}
                        disabled={creatingUser}
                        activeOpacity={0.7}
                    >
                        {isSelected && (
                            <Icon 
                                name="check" 
                                size={14} 
                                color={greenColor} 
                                style={{ marginRight: 5 }} 
                            />
                        )}
                        <Text style={[
                            styles.roleButtonText, 
                            { color: isSelected ? greenColor : theme.textSecondary }
                        ]}>
                            {role.name}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    }, [selectedRole, theme, creatingUser, handleRoleSelect, availableRoles]);
    
    const renderStatusButtons = useCallback(() => {
        // Define a green color for the active status
        const greenColor = theme.success || '#4CAF50';
        const redColor = theme.danger || '#F44336';
        
        return ACCOUNT_STATUSES.map(statusOption => {
            const isSelected = accountStatus === statusOption.value;
            const statusColor = statusOption.value === 'active' ? greenColor : redColor;
            
            return (
                <Animated.View
                    key={statusOption.value}
                    style={{
                        flex: 1,
                        opacity: 1,
                        transform: [{ 
                            scale: isSelected ? 1.05 : 1 
                        }]
                    }}
                >
                    <TouchableOpacity
                style={[
                            styles.statusButton,
                    {
                                backgroundColor: isSelected 
                                    ? (statusOption.value === 'active' ? greenColor + '15' : redColor + '15')
                                    : theme.inputBackground,
                                borderColor: isSelected ? statusColor : theme.lightBorder,
                                shadowColor: isSelected ? statusColor : 'transparent',
                                shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
                                shadowOpacity: isSelected ? 0.3 : 0,
                                shadowRadius: isSelected ? 4 : 0,
                                elevation: isSelected ? 2 : 0,
                            }
                        ]}
                        onPress={() => handleStatusSelect(statusOption.value as 'active' | 'inactive')}
                        disabled={creatingUser}
                        activeOpacity={0.7}
                    >
                        {isSelected && (
                            <Icon 
                                name="check-circle" 
                                size={16} 
                                color={statusColor} 
                                style={{ marginRight: 8 }} 
                            />
                        )}
                        <Text style={[
                            styles.statusButtonText, 
                            { 
                                color: isSelected 
                                    ? statusColor
                                    : theme.textSecondary 
                            }
                        ]}>
                            {statusOption.label}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
    );
        });
    }, [accountStatus, theme, creatingUser, handleStatusSelect]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['right', 'left', 'bottom']}>
          <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View style={{ flex: 1 }}>
                      <Animated.View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.lightBorder }]}>
                          <TouchableOpacity 
                              onPress={handleCancel} 
                              style={styles.backButton} 
                              disabled={creatingUser}
                          >
                    <Icon name="arrow-left" size={24} color={theme.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Add New User</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Create a new user account</Text>
                </View>
                      </Animated.View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContentContainer}
                        keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                        <Section title="Personal Information" index={0}>
                    <View style={styles.row}>
                        <View style={styles.column}>
                            <InputField 
                                label="First Name" 
                                value={firstName} 
                                onChangeText={handleFirstNameChange}
                                placeholder="Enter first name" 
                                iconName="user"
                                inputRef={firstNameRef} 
                                        error={errors.firstName}
                                        touched={touched.firstName}
                                        onBlur={() => handleFieldBlur('firstName')}
                            />
                        </View>
                        <View style={styles.column}>
                            <InputField 
                                label="Last Name" 
                                value={lastName} 
                                onChangeText={handleLastNameChange} 
                                placeholder="Enter last name" 
                                iconName="user"
                                inputRef={lastNameRef}
                                        error={errors.lastName}
                                        touched={touched.lastName}
                                        onBlur={() => handleFieldBlur('lastName')}
                            />
                        </View>
                    </View>
                    <InputField 
                        label="Email Address" 
                        value={email} 
                        onChangeText={handleEmailChange} 
                        placeholder="Enter email address" 
                        keyboardType="email-address" 
                        iconName="mail"
                        inputRef={emailRef}
                                error={errors.email}
                                touched={touched.email}
                                onBlur={() => handleFieldBlur('email')}
                    />

                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <Icon name="shield" size={14} color={theme.mediumText} style={styles.labelIcon} />
                            <Text style={[styles.label, { color: theme.mediumText }]}>Role</Text>
                        </View>
                                <View style={[
                                    styles.roleSelectorContainer,
                                    touched.role && errors.role ? { borderColor: theme.errorText || theme.danger, borderWidth: 1, borderRadius: 8, padding: 4 } : {}
                                ]}>
                                    {renderRoleButtons()}
                                </View>
                                {touched.role && errors.role ? (
                                    <Text style={[styles.errorText, { color: theme.errorText || theme.danger }]}>
                                        {errors.role}
                                    </Text>
                                ) : null}
                    </View>

                    {/* Show student selector only if parent role is selected */}
                    {isParentRole(selectedRole) && (
                        <StudentSelector
                          selectedStudentIds={selectedStudentIds}
                          onStudentsSelected={handleStudentsSelected}
                          error={errors.students}
                          touched={touched.students}
                        />
                    )}
                </Section>

                        <Section title="Security" index={1}>
                    <InputField 
                        label="Password" 
                        value={password} 
                        onChangeText={handlePasswordChange} 
                        placeholder="Enter password" 
                        secureTextEntry 
                        iconName="lock"
                        inputRef={passwordRef}
                                error={errors.password}
                                touched={touched.password}
                                onBlur={() => handleFieldBlur('password')}
                    />
                    <InputField 
                        label="Confirm Password" 
                        value={confirmPassword} 
                        onChangeText={handleConfirmPasswordChange} 
                        placeholder="Confirm password" 
                        secureTextEntry 
                        iconName="lock"
                        inputRef={confirmPasswordRef}
                                error={errors.confirmPassword}
                                touched={touched.confirmPassword}
                                onBlur={() => handleFieldBlur('confirmPassword')}
                            />
                            
                            <View style={styles.passwordStrengthContainer}>
                                <Text style={[styles.passwordStrengthLabel, { color: theme.mediumText }]}>Password Requirements:</Text>
                                <View style={styles.passwordRequirement}>
                                    <Animated.View style={{
                                        width: 16,
                                        height: 16,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: 6,
                                        opacity: password.length >= 6 ? 1 : 0.5,
                                        transform: [{ 
                                            scale: password.length >= 6 ? 1.1 : 1 
                                        }]
                                    }}>
                                        <Icon 
                                            name={password.length >= 6 ? "check-circle" : "circle"} 
                                            size={12} 
                                            color={password.length >= 6 ? theme.success : theme.textSecondary} 
                                        />
                                    </Animated.View>
                                    <Text style={[styles.passwordRequirementText, { 
                                        color: password.length >= 6 ? theme.success : theme.textSecondary,
                                        fontWeight: password.length >= 6 ? '600' : '400'
                                    }]}>
                                        At least 6 characters
                                    </Text>
                                </View>
                                
                                {/* Add more password requirements if needed */}
                                {password.length > 0 && (
                                    <Animated.View 
                                        style={{
                                            height: 4, 
                                            marginTop: 10,
                                            borderRadius: 2,
                                            backgroundColor: theme.lightBorder,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <Animated.View 
                                            style={{
                                                height: '100%',
                                                width: `${Math.min(100, (password.length / 8) * 100)}%`,
                                                borderRadius: 2,
                                                backgroundColor: password.length < 4 
                                                    ? theme.danger 
                                                    : password.length < 6 
                                                        ? theme.primary + '80' 
                                                        : theme.success
                                            }}
                                        />
                                    </Animated.View>
                                )}
                            </View>
                </Section>

                        <Section title="Account Status" index={2}>
                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <Icon name="activity" size={14} color={theme.mediumText} style={styles.labelIcon} />
                            <Text style={[styles.label, { color: theme.mediumText }]}>Status</Text>
                        </View>
                        <View style={styles.statusSelectorContainer}>
                                    {renderStatusButtons()}
                        </View>
                    </View>
                </Section>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.lightBorder, backgroundColor: theme.cardBackground }]}>
                <View style={styles.footerButtonContainer}>
                <TouchableOpacity
                        style={[
                            styles.footerButton, 
                            styles.cancelButton, 
                            { 
                                borderColor: theme.lightBorder,
                                backgroundColor: 'transparent'
                            }
                        ]}
                        onPress={handleCancel}
                    disabled={creatingUser}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.footerButtonText, 
                            { color: theme.textSecondary || '#555' }
                        ]}>
                            Cancel
                        </Text>
                </TouchableOpacity>
                    
                <TouchableOpacity
                    style={[
                        styles.footerButton,
                        styles.createButton,
                        {
                                backgroundColor: creatingUser ? (theme.success || '#4CAF50') + '80' : (theme.success || '#4CAF50'),
                                opacity: creatingUser ? 0.8 : 1,
                        }
                    ]}
                    onPress={handleCreateUser}
                    disabled={creatingUser}
                        activeOpacity={0.8}
                >
                    {creatingUser ? (
                            <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                                <Text style={[styles.footerButtonText, { marginLeft: 8 }]}>
                                    Creating...
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Icon name="user-plus" size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.footerButtonText}>
                                    Create User
                                </Text>
                            </>
                    )}
                </TouchableOpacity>
                </View>
            </View>
        </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 6,
        marginTop: 0,
        borderBottomWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 15,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: -0.5,
        marginBottom: 0,
    },
    headerSubtitle: {
        fontSize: 13,
        opacity: 0.7,
    },
    sectionContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: -8,
    },
    column: {
        flex: 1,
        paddingHorizontal: 8,
    },
    roleSelectorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    roleButton: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderRadius: 10,
        minWidth: '48%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        marginHorizontal: 3,
    },
    roleButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    passwordStrengthContainer: {
        marginTop: 10,
        marginBottom: 15,
        paddingHorizontal: 2,
    },
    passwordStrengthLabel: {
        fontSize: 13,
        marginBottom: 10,
        fontWeight: '500',
    },
    passwordRequirement: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 5,
        marginTop: 4,
    },
    passwordRequirementText: {
        fontSize: 13,
    },
    statusSelectorContainer: {
        flexDirection: 'row',
        marginHorizontal: -6,
    },
    statusButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderWidth: 1.5,
        borderRadius: 10,
        marginHorizontal: 6,
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderTopWidth: 1,
        paddingVertical: 12,
        paddingBottom: 20,
        marginBottom: 8,
        backgroundColor: theme => theme.cardBackground,
        borderTopColor: theme => theme.lightBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    footerButtonContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    footerButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        maxWidth: 160,
    },
    footerButtonText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.3,
        textAlign: 'center',
        color: '#fff',
    },
    cancelButton: {
        borderWidth: 1.5,
    },
    createButton: {
        // backgroundColor will be themed at component level
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default AddUserScreen;
 