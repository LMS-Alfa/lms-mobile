import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
  Share
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import { Lesson } from '../../services/courseService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

// Define navigation types
type RootStackParamList = {
  LessonDetail: { lesson: Lesson };
};

type LessonDetailRouteProp = RouteProp<RootStackParamList, 'LessonDetail'>;
type LessonDetailNavigationProp = StackNavigationProp<RootStackParamList, 'LessonDetail'>;

const LessonDetailScreen = () => {
  const navigation = useNavigation<LessonDetailNavigationProp>();
  const route = useRoute<LessonDetailRouteProp>();
  const { lesson } = route.params;
  const [loading, setLoading] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  // Set navigation title
  React.useEffect(() => {
    navigation.setOptions({
      title: lesson.lessonname,
    });
  }, [lesson, navigation]);

  // Function to open video URL
  const openVideoUrl = async (url: string) => {
    try {
      setLoading(true);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this video URL");
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert("Error", "Failed to open video");
    } finally {
      setLoading(false);
    }
  };

  // Function to download and save file
  const downloadFile = async (fileUrl: string, index: number) => {
    try {
      setDownloadingIndex(index);
      
      // Request permission for media library
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need media library permissions to download files');
          setDownloadingIndex(null);
          return;
        }
      }

      // Get filename from URL
      const fileName = fileUrl.split('/').pop() || `download_${Date.now()}`;
      
      // Set download location
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Download the file
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          // You could update a progress bar here if needed
        }
      );
      
      const downloadResult = await downloadResumable.downloadAsync();
      
      if (downloadResult && downloadResult.uri) {
        if (Platform.OS === 'android') {
          // Save to media library on Android
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync("Downloads", asset, false);
          Alert.alert("Success", "File downloaded successfully");
        } else {
          // Share file on iOS
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri);
          } else {
            Alert.alert("Error", "Sharing is not available on this device");
          }
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert("Download Failed", "Could not download the file");
    } finally {
      setDownloadingIndex(null);
    }
  };

  const getFileIcon = (fileUrl: string) => {
    if (fileUrl.includes('.pdf')) return 'file-text';
    if (fileUrl.includes('.doc') || fileUrl.includes('.docx')) return 'file';
    if (fileUrl.includes('.xls') || fileUrl.includes('.xlsx')) return 'grid';
    if (fileUrl.includes('.zip') || fileUrl.includes('.rar')) return 'archive';
    if (fileUrl.includes('.jpg') || fileUrl.includes('.png') || 
        fileUrl.includes('.jpeg') || fileUrl.includes('.gif')) return 'image';
    if (fileUrl.includes('.mp4') || fileUrl.includes('.avi') || 
        fileUrl.includes('.mov')) return 'video';
    return 'file';
  };

  const getFileColor = (fileUrl: string) => {
    // Return colors based on file type for a more visual distinction
    if (fileUrl.includes('.pdf')) return '#E74C3C'; // Red
    if (fileUrl.includes('.doc') || fileUrl.includes('.docx')) return '#3498DB'; // Blue
    if (fileUrl.includes('.xls') || fileUrl.includes('.xlsx')) return '#2ECC71'; // Green
    if (fileUrl.includes('.zip') || fileUrl.includes('.rar')) return '#F39C12'; // Orange
    if (fileUrl.includes('.jpg') || fileUrl.includes('.png') || 
        fileUrl.includes('.jpeg') || fileUrl.includes('.gif')) return '#9B59B6'; // Purple
    if (fileUrl.includes('.mp4') || fileUrl.includes('.avi') || 
        fileUrl.includes('.mov')) return '#E67E22'; // Orange
    return '#4A90E2'; // Default Blue
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Lesson Header */}
        <View style={styles.header}>
          <Text style={styles.lessonTitle}>{lesson.lessonname}</Text>
          {lesson.subject && (
            <View style={styles.subjectContainer}>
              <Icon name="book" size={16} color="#4A90E2" />
              <Text style={styles.subjectName}>
                {lesson.subject.subjectname}
              </Text>
            </View>
          )}
          <View style={styles.dateContainer}>
            <Icon name="calendar" size={14} color="#888" />
            <Text style={styles.date}>
              {new Date(lesson.uploadedat).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Lesson Description */}
        {lesson.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Icon name="info" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>{lesson.description}</Text>
          </View>
        )}

        {/* Video Content */}
        {lesson.videourl && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Icon name="video" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Video Lesson</Text>
            </View>
            
            <TouchableOpacity
              style={styles.videoButton}
              onPress={() => openVideoUrl(lesson.videourl as string)}
              disabled={loading}
            >
              <Icon name="play-circle" size={24} color="#FFFFFF" />
              <Text style={styles.videoButtonText}>Watch Video</Text>
              {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.loader} />}
            </TouchableOpacity>
            
            <Text style={styles.videoNote}>
              Note: Videos will open in your device's default video player. In a future update, videos will play directly in the app.
            </Text>
          </View>
        )}

        {/* Attachments */}
        {lesson.fileurls && lesson.fileurls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Icon name="paperclip" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Attachments</Text>
            </View>
            
            <View style={styles.fileGrid}>
              {lesson.fileurls.map((fileUrl, index) => {
                const fileColor = getFileColor(fileUrl);
                const fileName = fileUrl.split('/').pop() || `Attachment ${index + 1}`;
                const fileType = fileUrl.split('.').pop()?.toUpperCase() || 'Unknown';
                
                return (
                  <View key={index} style={styles.fileItemContainer}>
                    <View style={[styles.fileItem, { borderLeftColor: fileColor, borderLeftWidth: 4 }]}>
                      <View style={[styles.fileIconContainer, { backgroundColor: fileColor }]}>
                        <Icon
                          name={getFileIcon(fileUrl)}
                          size={20}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {fileName}
                        </Text>
                        <Text style={styles.fileType}>
                          {fileType}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.downloadButton, { backgroundColor: fileColor }]}
                        onPress={() => downloadFile(fileUrl, index)}
                        disabled={downloadingIndex !== null}
                      >
                        {downloadingIndex === index ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Icon name="download" size={16} color="#FFFFFF" />
                            <Text style={styles.downloadText}>Download</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* No content message */}
        {!lesson.description && !lesson.videourl && (!lesson.fileurls || lesson.fileurls.length === 0) && (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No content available for this lesson</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 16,
    color: '#4A90E2',
    marginLeft: 6,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#888',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  videoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  videoNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  loader: {
    marginLeft: 8,
  },
  fileGrid: {
    flexDirection: 'column',
  },
  fileItemContainer: {
    marginBottom: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  fileType: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default LessonDetailScreen; 