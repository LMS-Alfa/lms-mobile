/**
 * This script is for manual testing of the real-time notification system
 *
 * It simulates:
 * 1. Score update events
 * 2. Attendance update events
 *
 * How to use:
 * 1. Run the app in development mode
 * 2. Login as a parent user
 * 3. Open the console to see debug output
 * 4. In a terminal, run:
 *    node -e "require('./src/tests/realtimeNotifications.test.js').testScoreNotification()"
 *    or
 *    node -e "require('./src/tests/realtimeNotifications.test.js').testAttendanceNotification()"
 */

const { createClient } = require('@supabase/supabase-js')

// Replace these with your Supabase credentials
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Test function for score notifications
 */
async function testScoreNotification() {
  console.log('Testing score notification...')

  try {
    // Replace with an actual student ID from your database
    const STUDENT_ID = 'REPLACE_WITH_STUDENT_ID'
    const LESSON_ID = 'REPLACE_WITH_LESSON_ID'

    // Insert a test score
    const { data, error } = await supabase
      .from('scores')
      .insert({
        student_id: STUDENT_ID,
        lesson_id: LESSON_ID,
        score: Math.floor(Math.random() * 10) + 1, // Random score between 1-10
        comment: 'Test score from notification test script'
      })
      .select()

    if (error) {
      console.error('Error inserting test score:', error)
      return
    }

    console.log('Successfully inserted test score:', data)
    console.log('Check your mobile app for the notification!')
  } catch (error) {
    console.error('Unexpected error in testScoreNotification:', error)
  }
}

/**
 * Test function for attendance notifications
 */
async function testAttendanceNotification() {
  console.log('Testing attendance notification...')

  try {
    // Replace with an actual student ID from your database
    const STUDENT_ID = 'REPLACE_WITH_STUDENT_ID'
    const LESSON_ID = 'REPLACE_WITH_LESSON_ID'

    // Possible attendance statuses
    const statuses = ['present', 'absent', 'late', 'excused']
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]

    // Insert a test attendance record
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        student_id: STUDENT_ID,
        lesson_id: LESSON_ID,
        status: randomStatus,
        noted_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error inserting test attendance:', error)
      return
    }

    console.log('Successfully inserted test attendance:', data)
    console.log('Check your mobile app for the notification!')
  } catch (error) {
    console.error('Unexpected error in testAttendanceNotification:', error)
  }
}

// Export test functions
module.exports = {
  testScoreNotification,
  testAttendanceNotification
}