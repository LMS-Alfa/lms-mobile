import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Alert, TextInput, RefreshControl
} from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore, User } from '../../store/authStore';
import { NavigationProp, useNavigation } from '@react-navigation/native';

type UserListScreenProps = {
    navigation: NavigationProp<any>;
};

const UserListScreen: React.FC<UserListScreenProps> = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const theme = useTheme() as DefaultTheme & {
        primary?: string;
        text?: string;
        textSecondary?: string;
        background?: string;
        cardBackground?: string;
        border?: string;
        lightBorder?: string;
        success?: string;
        danger?: string;
        placeholder?: string;
        inputBackground?: string;
    };

    const allUsers = useAuthStore(state => state.allUsers);
    const loadingUsers = useAuthStore(state => state.loadingUsers);
    const fetchAllUsers = useAuthStore(state => state.fetchAllUsers);
    const deleteUser = useAuthStore(state => state.deleteUser);
    const deletingUser = useAuthStore(state => state.deletingUser);
    const deleteUserError = useAuthStore(state => state.deleteUserError);
    const clearDeleteUserError = useAuthStore(state => state.clearDeleteUserError);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Load users on mount
    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    // Handle refresh action
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAllUsers();
        setRefreshing(false);
    }, [fetchAllUsers]);

    // Handle delete error alerts
    useEffect(() => {
        if (deleteUserError) {
            Alert.alert('Delete Failed', deleteUserError);
            clearDeleteUserError();
        }
    }, [deleteUserError, clearDeleteUserError]);

    // Filter users based on search query and filters
    const filteredUsers = useMemo(() => {
        return allUsers.filter(user => {
            const matchesSearch = searchQuery ? 
                (user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())) : true;
            
            const matchesRole = selectedRole ? 
                user.role.toLowerCase() === selectedRole.toLowerCase() : true;
            
            const matchesStatus = selectedStatus ? 
                (user.status?.toLowerCase() === selectedStatus.toLowerCase()) : true;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [allUsers, searchQuery, selectedRole, selectedStatus]);

    // Handle user edit
    const handleEditUser = useCallback((userId: string) => {
        navigation.navigate('EditUserScreen', { userId });
    }, [navigation]);

    // Handle user deletion
    const handleDeleteUser = useCallback((user: User) => {
        Alert.alert(
            'Confirm Deletion',
            `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteUser(user.id);
                        if (success) {
                            Alert.alert('Success', 'User has been deleted successfully.');
                        }
                    } 
                }
            ]
        );
    }, [deleteUser]);

    // Navigate to add user screen
    const handleAddUser = useCallback(() => {
        navigation.navigate('AddUserScreen');
    }, [navigation]);

    // Clear filters
    const handleClearFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedRole(null);
        setSelectedStatus(null);
    }, []);

    // Render filter chips
    const renderFilterChips = () => (
        <View style={styles.filterChipsContainer}>
            {/* Role filter chips */}
            <View style={styles.chipGroup}>
                <Text style={[styles.chipGroupLabel, { color: theme.textSecondary }]}>Role:</Text>
                <ScrollableChipGroup 
                    options={['admin', 'teacher', 'student', 'parent']}
                    selectedValue={selectedRole}
                    onSelect={setSelectedRole}
                />
            </View>

            {/* Status filter chips */}
            <View style={styles.chipGroup}>
                <Text style={[styles.chipGroupLabel, { color: theme.textSecondary }]}>Status:</Text>
                <ScrollableChipGroup 
                    options={['active', 'inactive', 'pending', 'invited']}
                    selectedValue={selectedStatus}
                    onSelect={setSelectedStatus}
                />
            </View>

            {/* Clear filters button */}
            {(searchQuery || selectedRole || selectedStatus) && (
                <TouchableOpacity 
                    style={[styles.clearFiltersButton, { borderColor: theme.lightBorder }]} 
                    onPress={handleClearFilters}
                >
                    <Icon name="x" size={14} color={theme.danger} style={{ marginRight: 4 }} />
                    <Text style={[styles.clearFiltersText, { color: theme.danger }]}>Clear Filters</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // Render user card
    const renderUserItem = ({ item }: { item: User }) => (
        <View style={[styles.userCard, { backgroundColor: theme.cardBackground, borderColor: theme.lightBorder }]}>
            <View style={styles.userCardHeader}>
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.text }]}>
                        {item.firstName} {item.lastName}
                    </Text>
                    <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                        {item.email}
                    </Text>
                </View>
                <View style={styles.userActions}>
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: theme.primary + '10' }]}
                        onPress={() => handleEditUser(item.id)}
                    >
                        <Icon name="edit-2" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: theme.danger + '10' }]}
                        onPress={() => handleDeleteUser(item)}
                        disabled={deletingUser}
                    >
                        <Icon name="trash-2" size={16} color={theme.danger} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.userCardBody}>
                <View style={styles.userDetail}>
                    <Icon name="shield" size={14} color={theme.textSecondary} style={styles.userDetailIcon} />
                    <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>
                        Role: <Text style={{ fontWeight: '600' }}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
                    </Text>
                </View>
                <View style={styles.userDetail}>
                    <Icon name="activity" size={14} color={theme.textSecondary} style={styles.userDetailIcon} />
                    <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>
                        Status: <Text style={{ 
                            fontWeight: '600',
                            color: item.status === 'active' ? theme.success : 
                                  item.status === 'pending' || item.status === 'invited' ? theme.primary :
                                  theme.danger
                        }}>
                            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                        </Text>
                    </Text>
                </View>
                {item.lastLogin && (
                    <View style={styles.userDetail}>
                        <Icon name="clock" size={14} color={theme.textSecondary} style={styles.userDetailIcon} />
                        <Text style={[styles.userDetailText, { color: theme.textSecondary }]}>
                            Last Login: <Text style={{ fontWeight: '600' }}>
                                {new Date(item.lastLogin).toLocaleDateString()} {new Date(item.lastLogin).toLocaleTimeString()}
                            </Text>
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    // Empty state component
    const EmptyState = () => (
        <View style={styles.emptyState}>
            <Icon name="users" size={60} color={theme.textSecondary + '40'} />
            <Text style={[styles.emptyStateTitle, { color: theme.textSecondary }]}>
                No Users Found
            </Text>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary + '80' }]}>
                {searchQuery || selectedRole || selectedStatus ? 
                    'Try clearing your filters or search query.' : 
                    'Add your first user to get started.'}
            </Text>
            {!(searchQuery || selectedRole || selectedStatus) && (
                <TouchableOpacity 
                    style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                    onPress={handleAddUser}
                >
                    <Icon name="user-plus" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.emptyStateButtonText}>Add User</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.lightBorder }]}>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Users</Text>
                    <TouchableOpacity 
                        style={[styles.addButton, { backgroundColor: theme.primary }]}
                        onPress={handleAddUser}
                    >
                        <Icon name="user-plus" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                
                {/* Search input */}
                <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.lightBorder }]}>
                    <Icon name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search users by name or email"
                        placeholderTextColor={theme.placeholder || theme.textSecondary + '80'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="x" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter chips */}
                {renderFilterChips()}
            </View>

            {/* User List */}
            {loadingUsers && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading users...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContentContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[theme.primary || '#1890FF']}
                        />
                    }
                    ListEmptyComponent={EmptyState}
                />
            )}
        </View>
    );
};

// Scrollable chip group component for filters
const ScrollableChipGroup = ({ 
    options, 
    selectedValue, 
    onSelect 
}: { 
    options: string[]; 
    selectedValue: string | null; 
    onSelect: (value: string | null) => void;
}) => {
    const theme = useTheme() as DefaultTheme & {
        primary?: string;
        text?: string;
        textSecondary?: string;
        background?: string;
        cardBackground?: string;
        border?: string;
        lightBorder?: string;
    };

    return (
        <View style={styles.chipScrollContainer}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option}
                    style={[
                        styles.chip,
                        { 
                            backgroundColor: selectedValue === option ? theme.primary + '20' : theme.cardBackground,
                            borderColor: selectedValue === option ? theme.primary : theme.lightBorder,
                        }
                    ]}
                    onPress={() => onSelect(selectedValue === option ? null : option)}
                >
                    <Text 
                        style={[
                            styles.chipText, 
                            { color: selectedValue === option ? theme.primary : theme.textSecondary }
                        ]}
                    >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 15,
    },
    filterChipsContainer: {
        marginTop: 12,
        paddingHorizontal: 16,
    },
    chipGroup: {
        marginBottom: 8,
    },
    chipGroupLabel: {
        marginBottom: 4,
        fontSize: 13,
        fontWeight: '500',
    },
    chipScrollContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    chip: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 4,
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '500',
    },
    listContentContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    userCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    userCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 14,
        marginTop: 2,
    },
    userActions: {
        flexDirection: 'row',
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    userCardBody: {
        marginTop: 4,
    },
    userDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    userDetailIcon: {
        marginRight: 6,
    },
    userDetailText: {
        fontSize: 13,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 40,
    },
    emptyStateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default UserListScreen; 