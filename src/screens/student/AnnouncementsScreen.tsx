import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import RenderHTML from 'react-native-render-html';
import { fetchAnnouncements, fetchAnnouncementById } from '../../services/announcementService'; // Using the new service
import { useAppTheme } from '../../contexts/ThemeContext'; // Added
// import { useAuthStore } from '../../store/authStore'; // If needed

export interface AnnouncementItem {
  id: string | number;
  title: string;
  summary: string;
  content: string;
  createdAt: string;
  author?: string;
}

// MOCK_ANNOUNCEMENTS removed as we will fetch from service

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const AnnouncementsScreen = () => {
  const { theme } = useAppTheme(); // Added
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // const { user } = useAuthStore(); // Uncomment if needed

  const loadAnnouncements = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const fetchedAnnouncements = await fetchAnnouncements(); 
      setAnnouncements(fetchedAnnouncements); 
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
      setAnnouncements([]); // Clear data on error
    } finally {
      if (!isRefresh) setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnnouncements(true);
  }, [loadAnnouncements]);

  const handleAnnouncementPress = async (item: AnnouncementItem) => {
    // Assuming item from list already contains full content. 
    // If not, or if you want to always fetch the latest, use fetchAnnouncementById.
    // For example, to always fetch fresh data or more details:
    /*
    setLoading(true); // Show a loading indicator in modal or on item
    try {
      const detailedItem = await fetchAnnouncementById(item.id);
      if (detailedItem) {
        setSelectedAnnouncement(detailedItem);
        setModalVisible(true);
      } else {
        setError('Could not load announcement details.'); // Or show a toast
    }
    } catch (err) {
      console.error('Failed to fetch announcement details:', err);
      setError(err instanceof Error ? err.message : 'Could not load details.');
    } finally {
      setLoading(false);
    }
    */
    setSelectedAnnouncement(item); // Using the item from the list directly
    setModalVisible(true);
  };

  const renderAnnouncementItem = ({ item }: { item: AnnouncementItem }) => (
    <TouchableOpacity 
        style={[styles.itemContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]} 
        onPress={() => handleAnnouncementPress(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.itemDate, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.itemSummary, { color: theme.textSecondary }]} numberOfLines={3}>{item.summary}</Text>
      {item.author && <Text style={[styles.itemAuthor, { color: theme.textSecondary }]}>By: {item.author}</Text>}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.centeredMessageContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading Announcements...</Text>
      </View>
    );
  }

  if (error && !refreshing) { // Only show full page error if not during a refresh
    return (
      <View style={[styles.centeredMessageContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={40} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <TouchableOpacity onPress={() => loadAnnouncements()} style={[styles.retryButton, { backgroundColor: theme.primary }]}>
            <Text style={[styles.retryButtonText, { color: theme.cardBackground }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {error && refreshing && (
        <View style={[styles.inlineErrorView, {backgroundColor: theme.danger + '33'}]}> 
          <Text style={[styles.inlineErrorText, {color: theme.danger}]}>Refresh failed: {error}</Text>
        </View>
      )}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncementItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={() => (
          !loading && !error && (
            <View style={[styles.centeredMessageContainer, { backgroundColor: theme.background, minHeight: 0, flex:0, paddingTop: 50 }]}>
              <Icon name="info" size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No announcements at the moment.</Text>
            </View>
          )
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary}/>
        }
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setSelectedAnnouncement(null);
        }}
      >
        <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1} 
            onPressOut={() => { // Allow closing by tapping outside modal content
                setModalVisible(false); 
                setSelectedAnnouncement(null);
            }}
        >
            <TouchableOpacity activeOpacity={1} style={[styles.modalContentContainer, { backgroundColor: theme.cardBackground }]} onPress={() => { /* Prevent closing when tapping inside modal */ }}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={2}>{selectedAnnouncement?.title}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedAnnouncement(null); }}>
                    <Icon name="x-circle" size={28} color={theme.textSecondary} />
                </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScrollView}>
                {selectedAnnouncement?.author && 
                    <Text style={[styles.modalDetailText, { color: theme.textSecondary }]}><Text style={[styles.boldText, { color: theme.text }]}>Author:</Text> {selectedAnnouncement.author}</Text>}
                {selectedAnnouncement?.createdAt && 
                    <Text style={[styles.modalDetailText, { color: theme.textSecondary }]}><Text style={[styles.boldText, { color: theme.text }]}>Date:</Text> {new Date(selectedAnnouncement.createdAt).toLocaleString()}</Text>}
                
                {/* Placeholder for HTML content rendering */}
                {selectedAnnouncement?.content && (
                  <RenderHTML
                    contentWidth={screenWidth * 0.8} // Adjust width as needed, considering modal padding
                    source={{ html: selectedAnnouncement.content }}
                    tagsStyles={{
                        p: { ...styles.modalMainContent, color: theme.text }, 
                        img: { alignSelf: 'center', maxWidth: '100%' },
                        // Add more tags as needed and style with theme colors
                        a: { color: theme.primary },
                        strong: { color: theme.text, fontWeight: 'bold' },
                        em: { color: theme.text, fontStyle: 'italic' }
                    }}
                  />
                )}

                </ScrollView>
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F0F0F7', // Theme applied inline
  },
  listContentContainer: {
    padding: 16,
    paddingBottom: 32, // Ensure space for last item if near bottom tab bar
  },
  itemContainer: {
    // backgroundColor: '#FFFFFF', // Theme applied inline
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    // shadowColor: '#000000', // Theme applied inline
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    // color: '#1C1C1E', // Theme applied inline
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  itemDate: {
    fontSize: 13,
    // color: '#8E8E93', // Theme applied inline
    paddingTop: 2, // Align better with title
  },
  itemSummary: {
    fontSize: 15,
    // color: '#3C3C43', // Theme applied inline
    lineHeight: 21,
    marginBottom: 8,
  },
  itemAuthor: {
    fontSize: 13,
    // color: '#8E8E93', // Theme applied inline
    marginTop: 4,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: Dimensions.get('window').height / 2, // Ensure it takes up significant space
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    // color: '#666666', // Theme applied inline
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    // color: '#FF3B30', // Theme applied inline
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    // color: '#8E8E93', // Theme applied inline
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    // backgroundColor: '#007AFF', // Theme applied inline
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  retryButtonText: {
    // color: '#FFFFFF', // Theme applied inline
    fontSize: 16,
    fontWeight: '500',
  },
  inlineErrorView: {
    // backgroundColor: '#FFDADC', // Theme applied inline
    padding: 10,
    alignItems: 'center',
  },
  inlineErrorText: {
    // color: '#D92626', // Theme applied inline
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // Adjusted transparency
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    // backgroundColor: '#FFFFFF', // Theme applied inline
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30, // Safe area for bottom
    maxHeight: screenHeight * 0.85,
    minHeight: screenHeight * 0.4,
    // shadowColor: '#000', // Theme applied inline
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    // borderBottomColor: '#E5E5EA', // Theme applied inline
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    // color: '#1C1C1E', // Theme applied inline
    flex: 1,
    marginRight: 10,
  },
  modalScrollView: {
    // flex: 1, // Not strictly needed if content defines height, but good for very long content
  },
  modalDetailText: {
    fontSize: 14,
    // color: '#3C3C43', // Theme applied inline
    marginBottom: 10,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
    // color: theme.text, // Applied via parent or specific styling if needed
  },
  modalMainContent: {
    fontSize: 16,
    // color: '#1C1C1E', // Theme applied inline via tagsStyles
    lineHeight: 24,
    marginTop: 10,
    paddingBottom: 20, // Ensure scrollability if content is long
  },
});

export default AnnouncementsScreen; 