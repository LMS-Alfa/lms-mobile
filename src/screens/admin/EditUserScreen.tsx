import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
    Keyboard, TouchableWithoutFeedback, Animated, Easing
} from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore, UserRole, User, Role } from '../../store/authStore';
import { NavigationProp, ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { useKeyboardPersistence, configureTextInput } from '../../utils/keyboard-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Section, InputField, StudentSelector } from './UserFormComponents';

interface EditUserScreenProps {
    navigation: NavigationProp<ParamListBase>;
}

// Define the route params type
type EditUserRouteParams = {
    userId: string;
}

const ACCOUNT_STATUSES: Array<{ label: string, value: 'active' | 'inactive'}> = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
];

const EditUserScreen: React.FC<EditUserScreenProps> = ({ navigation }) => {
    useKeyboardPersistence();
    const route = useRoute<RouteProp<Record<string, EditUserRouteParams>, string>>();
    const userId = route.params?.userId;

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

    const allUsers = useAuthStore(state => state.allUsers);
    const updateUser = useAuthStore(state => state.updateUser);
    const updatingUser = useAuthStore(state => state.updatingUser);
    const updateUserError = useAuthStore(state => state.updateUserError);
    const clearUpdateUserError = useAuthStore(state => state.clearUpdateUserError);
    const deleteUser = useAuthStore(state => state.deleteUser);
    const deletingUser = useAuthStore(state => state.deletingUser);
    const deleteUserError = useAuthStore(state => state.deleteUserError);
    const clearDeleteUserError = useAuthStore(state => state.clearDeleteUserError);
    const availableRoles = useAuthStore(state => state.availableRoles);
    const fetchAvailableRoles = useAuthStore(state => state.fetchAvailableRoles);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
    const [accountStatus, setAccountStatus] = useState<'active' | 'inactive'>('active');
    const [isLoading, setIsLoading] = useState(true);
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

    // Refs for form fields
    const firstNameRef = useRef<TextInput | null>(null);
    const lastNameRef = useRef<TextInput | null>(null);
    const emailRef = useRef<TextInput | null>(null);
    const passwordRef = useRef<TextInput | null>(null);
    const confirmPasswordRef = useRef<TextInput | null>(null);
    
    // Load user data
    useEffect(() => {
        if (userId && allUsers.length > 0) {
            const userToEdit = allUsers.find(user => user.id === userId);
            if (userToEdit) {
                setFirstName(userToEdit.firstName);
                setLastName(userToEdit.lastName);
                setEmail(userToEdit.email);
                setSelectedRole(userToEdit.role);
                setAccountStatus(userToEdit.status === 'active' ? 'active' : 'inactive');
                
                // If parent user, load their children
                if (userToEdit.role === 'parent' && userToEdit.childrenIds) {
                    setSelectedStudentIds(userToEdit.childrenIds);
                }
                
                setIsLoading(false);
            } else {
                Alert.alert('Error', 'User not found');
                navigation.goBack();
            }
        }
    }, [userId, allUsers, navigation]);

    // Add effect to fetch roles
    useEffect(() => {
        fetchAvailableRoles();
    }, [fetchAvailableRoles]);

    // Validation logic
    const validateField = useCallback((field: string, value: any, passwordValue?: string) => {
        setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            
            switch (field) {
                case 'firstName':
                    if (typeof value === 'string' && !value.trim()) {
                        newErrors.firstName = 'First name is required';
                    } else {
                        delete newErrors.firstName;
                    }
                    break;
                    
                case 'lastName':
                    if (typeof value === 'string' && !value.trim()) {
                        newErrors.lastName = 'Last name is required';
                    } else {
                        delete newErrors.lastName;
                    }
                    break;
                    
                case 'email':
                    if (typeof value === 'string' && !value.trim()) {
                        newErrors.email = 'Email is required';
                    } else {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (typeof value === 'string' && !emailRegex.test(value)) {
                            newErrors.email = 'Email is invalid';
                        } else {
                            delete newErrors.email;
                        }
                    }
                    break;
                    
                case 'password':
                    // Password can be empty for updates
                    if (typeof value === 'string' && value && value.length < 6) {
                        newErrors.password = 'Password must be at least 6 characters';
                    } else {
                        delete newErrors.password;
                    }
                    break;
                    
                case 'confirmPassword':
                    const currentPassword = passwordValue || password;
                    if (currentPassword && !value) {
                        newErrors.confirmPassword = 'Please confirm your password';
                    } else if (currentPassword && value !== currentPassword) {
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
    
    // Field change handlers
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
    
    // Handle field blur for validation
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
    
    // Add parent role helper 
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
    
    // Handle student selection
    const handleStudentsSelected = useCallback((studentIds: string[]) => {
        setSelectedStudentIds(studentIds);
        validateField('students', studentIds);
        setTouched(prev => ({ ...prev, students: true }));
    }, [validateField]);
    
    // Handle status selection
    const handleStatusSelect = useCallback((status: 'active' | 'inactive') => {
        setAccountStatus(status);
    }, []);
    
    // Validate the entire form
    const validateForm = useCallback(() => {
        // Mark required fields as touched
        const touchedFields: any = {
            firstName: true,
            lastName: true,
            email: true,
            role: true
        };
        
        // Only mark students as touched if parent role is selected
        if (selectedRole === 'parent') {
            touchedFields.students = true;
        }
        
        // Mark password fields as touched only if password is provided
        if (password) {
            touchedFields.password = true;
            touchedFields.confirmPassword = true;
        }
        
        setTouched(touchedFields);
        
        // Validate required fields
        const isFirstNameValid = validateField('firstName', firstName);
        const isLastNameValid = validateField('lastName', lastName);
        const isEmailValid = validateField('email', email);
        const isRoleValid = validateField('role', selectedRole);
        
        // Only validate password fields if password is provided
        let isPasswordValid = true;
        let isConfirmPasswordValid = true;
        
        if (password) {
            isPasswordValid = validateField('password', password);
            isConfirmPasswordValid = validateField('confirmPassword', confirmPassword);
        }
        
        // Validate students only if parent role
        let isStudentsValid = true;
        if (selectedRole === 'parent') {
            isStudentsValid = validateField('students', selectedStudentIds);
        }
        
        return isFirstNameValid && isLastNameValid && isEmailValid && 
               isRoleValid && isPasswordValid && isConfirmPasswordValid && isStudentsValid;
    }, [firstName, lastName, email, password, confirmPassword, selectedRole, selectedStudentIds, validateField]);

    // Handle updating the user
    const handleUpdateUser = useCallback(async () => {
        if (!validateForm()) {
            // Form validation failed
            return;
        }

        // Prepare user data for update
        const userData: any = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            role: selectedRole as UserRole,
            status: accountStatus,
        };

        // Only include password if it was provided
        if (password) {
            userData.password = password;
        }
        
        // Add childrenIds for parent role
        if (selectedRole === 'parent') {
            userData.childrenIds = selectedStudentIds;
        }

        console.log('Updating user with data:', { ...userData, password: password ? '***' : undefined });

        const success = await updateUser(userId, userData);

        if (success) {
            Alert.alert('Success', 'User has been updated successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        }
    }, [
        userId, firstName, lastName, email, password, 
        selectedRole, accountStatus, selectedStudentIds, updateUser, validateForm, navigation
    ]);
    
    // Handle deleting the user
    const handleDeleteUser = useCallback(() => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this user? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteUser(userId);
                        if (success) {
                            Alert.alert('Success', 'User has been deleted successfully.', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        }
                    } 
                }
            ]
        );
    }, [userId, deleteUser, navigation]);
    
    // Handle cancel button
    const handleCancel = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // Handle error alerts
    useEffect(() => {
        if (updateUserError) {
            Alert.alert('Update Failed', updateUserError);
            clearUpdateUserError();
        }
    }, [updateUserError, clearUpdateUserError]);

    useEffect(() => {
        if (deleteUserError) {
            Alert.alert('Delete Failed', deleteUserError);
            clearDeleteUserError();
        }
    }, [deleteUserError, clearDeleteUserError]);

    // Update renderRoleButtons to filter roles
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
                        disabled={updatingUser}
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
                            {role.description || (role.name.charAt(0).toUpperCase() + role.name.slice(1))}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            );
        });
    }, [selectedRole, theme, updatingUser, handleRoleSelect, availableRoles]);
    
    // Render status selection buttons
    const renderStatusButtons = useCallback(() => {
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
                        disabled={updatingUser}
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
    }, [accountStatus, theme, updatingUser, handleStatusSelect]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading user data...</Text>
            </SafeAreaView>
        );
    }

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
                                disabled={updatingUser}
                            >
                                <Icon name="arrow-left" size={24} color={theme.primary} />
                            </TouchableOpacity>
                            <View>
                                <Text style={[styles.headerTitle, { color: theme.text }]}>Edit User</Text>
                                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Manage user account</Text>
                            </View>
                            <LogoutButton variant="icon" size={22} />
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
                                <Text style={[styles.passwordHelp, { color: theme.textSecondary }]}>
                                    Leave password fields empty to keep the current password.
                                </Text>
                                <InputField 
                                    label="New Password" 
                                    value={password} 
                                    onChangeText={handlePasswordChange} 
                                    placeholder="Enter new password (optional)" 
                                    secureTextEntry 
                                    iconName="lock"
                                    inputRef={passwordRef}
                                    error={errors.password}
                                    touched={touched.password}
                                    onBlur={() => handleFieldBlur('password')}
                                />
                                <InputField 
                                    label="Confirm New Password" 
                                    value={confirmPassword} 
                                    onChangeText={handleConfirmPasswordChange} 
                                    placeholder="Confirm new password" 
                                    secureTextEntry 
                                    iconName="lock"
                                    inputRef={confirmPasswordRef}
                                    error={errors.confirmPassword}
                                    touched={touched.confirmPassword}
                                    onBlur={() => handleFieldBlur('confirmPassword')}
                                />
                                
                                {password && (
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
                                    </View>
                                )}
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

                        <View style={[styles.buttonsContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.lightBorder }]}>
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
                                    disabled={updatingUser}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.footerButtonText, 
                                        { color: theme.textSecondary }
                                    ]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[
                                        styles.footerButton,
                                        styles.saveButton,
                                        {
                                            backgroundColor: updatingUser ? theme.primary + '80' : theme.primary,
                                            opacity: updatingUser ? 0.8 : 1,
                                        }
                                    ]}
                                    onPress={handleUpdateUser}
                                    disabled={updatingUser}
                                    activeOpacity={0.8}
                                >
                                    {updatingUser ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#fff" />
                                            <Text style={[styles.footerButtonText, { color: '#fff', marginLeft: 8 }]}>
                                                Saving...
                                            </Text>
                                        </View>
                                    ) : (
                                        <>
                                            <Icon name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={[styles.footerButtonText, { color: '#fff' }]}>
                                                Save Changes
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    container: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    passwordHelp: {
        fontSize: 14,
        marginBottom: 15,
        fontStyle: 'italic',
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
    buttonsContainer: {
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
    saveButton: {
        // backgroundColor will be themed at component level
    },
});

export default EditUserScreen; 