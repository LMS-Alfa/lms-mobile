import { supabase } from '@/utils/supabase'; // Adjust path as per your project structure
import { AnnouncementItem } from '../screens/student/AnnouncementsScreen';

// This is a placeholder. You'll need to adjust this based on your 'announcements' table structure.
interface SupabaseAnnouncement {
  id: string | number;
  title: string;
  summary?: string; // Optional if summary is derived or not always present
  content: string; // Full content
  created_at: string; // Supabase typically uses `created_at`
  author_name?: string; // Example if author is a simple text field
  // Add other fields that match your Supabase table columns
  // e.g., target_audience (all, student, specific_group), course_id, is_pinned, etc.
}

const fromSupabaseToAnnouncementItem = (record: SupabaseAnnouncement): AnnouncementItem => {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary || record.content.substring(0, 100) + '...', // Basic summary generation if not present
    content: record.content,
    createdAt: record.created_at,
    author: record.author_name,
  };
};

/**
 * Fetches all announcements, ordered by creation date (newest first).
 */
export const fetchAnnouncements = async (): Promise<AnnouncementItem[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements') // Replace 'announcements' with your actual table name
      .select('*') // Select specific columns for better performance: 'id, title, summary, content, created_at, author_name'
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }

    return data ? data.map(fromSupabaseToAnnouncementItem) : [];
  } catch (error) {
    console.error('Supabase call failed for fetchAnnouncements:', error);
    // Depending on your error handling strategy, you might want to re-throw or return a specific error object
    throw new Error('Failed to fetch announcements. Please try again later.');
  }
};

/**
 * Fetches a single announcement by its ID.
 * This might be useful if the list view doesn't contain all details (e.g., full content for very long announcements).
 */
export const fetchAnnouncementById = async (id: string | number): Promise<AnnouncementItem | null> => {
  try {
    const { data, error } = await supabase
      .from('announcements') // Replace 'announcements' with your actual table name
      .select('*')         // Select specific columns
      .eq('id', id)
      .single(); // Expects a single row

    if (error) {
      // If error is due to no rows found, it might not be a critical error, but item not found.
      if (error.code === 'PGRST116') { // PostgREST error code for "Searched for one row, but found 0"
        console.log(`Announcement with id ${id} not found.`);
        return null;
      }
      console.error(`Error fetching announcement by ID (${id}):`, error);
      throw error;
    }

    return data ? fromSupabaseToAnnouncementItem(data) : null;
  } catch (error) {
    console.error(`Supabase call failed for fetchAnnouncementById (${id}):`, error);
    throw new Error('Failed to fetch announcement details.');
  }
};

// Potential future functions:
// - markAnnouncementAsRead(userId: string, announcementId: string | number)
// - fetchAnnouncementsForCourse(courseId: string | number)
// - fetchUserSpecificAnnouncements(userId: string) 